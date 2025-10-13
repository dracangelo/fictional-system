from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import logging
import time
import random

from .models import Booking, Ticket
from events.models import Event, TicketType
from events.services import DiscountService, BookingPriceCalculator
from theaters.models import Showtime
from .payment_service import PaymentService, PaymentProcessingError
from notifications.tasks import send_booking_confirmation_task, send_notification_task

logger = logging.getLogger(__name__)


# Import centralized exceptions
from movie_booking_app.exceptions import (
    BookingError, SeatUnavailableError, TicketUnavailableError
)


class BookingService:
    """Service class for handling booking operations with discount integration"""
    
    @staticmethod
    @transaction.atomic
    def create_event_booking_with_concurrency_control(
        customer,
        event: Event,
        ticket_selections: List[Dict],
        promo_code: Optional[str] = None,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        special_requests: Optional[str] = None
    ) -> Booking:
        """
        Create a booking for an event with enhanced concurrency control
        
        Args:
            customer: User instance making the booking
            event: Event instance
            ticket_selections: List of dicts with 'ticket_type_id' and 'quantity'
            promo_code: Optional promo code
            customer_email: Customer email (defaults to user email)
            customer_phone: Customer phone number
            special_requests: Any special requests
            
        Returns:
            Created Booking instance
            
        Raises:
            TicketUnavailableError: When requested tickets are not available
            ValidationError: When booking data is invalid
        """
        logger.info(f"Creating event booking for customer {customer.id}, event {event.id}")
        
        # Validate event is bookable
        if event.status != 'published':
            raise ValidationError("Event is not available for booking")
        
        if event.start_datetime <= timezone.now():
            raise ValidationError("Cannot book tickets for past events")
        
        # Lock event and ticket types to prevent race conditions
        event = Event.objects.select_for_update().get(id=event.id)
        
        # Validate and lock ticket types
        ticket_type_locks = {}
        for selection in ticket_selections:
            ticket_type = TicketType.objects.select_for_update().get(
                id=selection['ticket_type_id'],
                event=event
            )
            
            if not ticket_type.is_on_sale:
                raise ValidationError(f"Ticket type {ticket_type.name} is not currently on sale")
            
            if ticket_type.tickets_remaining < selection['quantity']:
                raise TicketUnavailableError(
                    f"Not enough tickets available for {ticket_type.name}. "
                    f"Only {ticket_type.tickets_remaining} remaining."
                )
            
            ticket_type_locks[selection['ticket_type_id']] = ticket_type
        
        # Calculate price with discounts
        price_breakdown = BookingPriceCalculator.calculate_booking_price(
            ticket_selections, event, promo_code
        )
        
        # Apply discount if applicable
        applied_discount = None
        if price_breakdown['discount_applied']:
            discount_id = price_breakdown['discount_applied']['id']
            if discount_id:
                from events.models import Discount
                discount = Discount.objects.select_for_update().get(id=discount_id)
                
                # Validate discount is still available
                if not discount.is_valid:
                    raise ValidationError("Discount is no longer valid")
                
                # Apply the discount (increment usage count)
                if not DiscountService.apply_discount(discount):
                    raise ValidationError("Failed to apply discount")
                
                applied_discount = discount
        
        # Generate unique booking reference
        booking_reference = Booking.generate_booking_reference()
        
        # Create booking with pending status
        booking = Booking.objects.create(
            customer=customer,
            booking_type='event',
            event=event,
            booking_reference=booking_reference,
            subtotal=Decimal(str(price_breakdown['subtotal'])),
            discount_amount=Decimal(str(price_breakdown['discount_amount'])),
            fees=Decimal(str(price_breakdown['processing_fee'])),
            total_amount=Decimal(str(price_breakdown['total'])),
            applied_discount=applied_discount,
            customer_email=customer_email or customer.email,
            customer_phone=customer_phone or '',
            special_requests=special_requests or '',
            payment_status='pending',
            booking_status='pending'
        )
        
        # Create tickets and update ticket type counts atomically
        for selection in ticket_selections:
            ticket_type = ticket_type_locks[selection['ticket_type_id']]
            
            for _ in range(selection['quantity']):
                Ticket.objects.create(
                    booking=booking,
                    ticket_type=ticket_type,
                    price=ticket_type.price
                )
            
            # Update ticket type sold count
            ticket_type.quantity_sold += selection['quantity']
            ticket_type.save()
        
        logger.info(f"Successfully created event booking {booking.booking_reference}")
        
        # Send booking confirmation notification (async)
        context_data = {
            'user_name': customer.get_full_name() or customer.username,
            'booking_reference': booking.booking_reference,
            'event_title': event.title,
            'event_venue': event.venue,
            'event_datetime': event.start_datetime,
            'total_amount': str(booking.total_amount),
            'ticket_count': booking.tickets.count(),
            'tickets': [
                {
                    'ticket_number': ticket.ticket_number,
                    'ticket_type': ticket.ticket_type.name if ticket.ticket_type else 'General',
                    'price': str(ticket.price)
                }
                for ticket in booking.tickets.all()
            ]
        }
        
        # Queue notification task
        send_booking_confirmation_task.delay(
            user_id=customer.id,
            booking_id=booking.id,
            context_data=context_data
        )
        
        return booking

    @staticmethod
    @transaction.atomic
    def create_event_booking(
        customer,
        event: Event,
        ticket_selections: List[Dict],
        promo_code: Optional[str] = None,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        special_requests: Optional[str] = None
    ) -> Booking:
        """
        Legacy method - use create_event_booking_with_concurrency_control for new code
        """
        return BookingService.create_event_booking_with_concurrency_control(
            customer, event, ticket_selections, promo_code,
            customer_email, customer_phone, special_requests
        )
    
    @staticmethod
    @transaction.atomic
    def create_movie_booking_with_concurrency_control(
        customer,
        showtime: Showtime,
        seat_numbers: List[str],
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        special_requests: Optional[str] = None
    ) -> Booking:
        """
        Create a booking for a movie showtime with enhanced concurrency control
        
        Args:
            customer: User instance making the booking
            showtime: Showtime instance
            seat_numbers: List of seat numbers to book
            customer_email: Customer email (defaults to user email)
            customer_phone: Customer phone number
            special_requests: Any special requests
            
        Returns:
            Created Booking instance
            
        Raises:
            SeatUnavailableError: When requested seats are not available
            ValidationError: When booking data is invalid
        """
        logger.info(f"Creating movie booking for customer {customer.id}, showtime {showtime.id}")
        
        # Validate showtime is bookable
        if showtime.start_time <= timezone.now():
            raise ValidationError("Cannot book tickets for past showtimes")
        
        if not showtime.is_active:
            raise ValidationError("Showtime is not available for booking")
        
        # Lock showtime to prevent race conditions
        showtime = Showtime.objects.select_for_update().get(id=showtime.id)
        
        # Check seat availability with current data
        booked_seats = set(showtime.booked_seats)
        requested_seats = set(seat_numbers)
        
        if booked_seats.intersection(requested_seats):
            unavailable_seats = list(booked_seats.intersection(requested_seats))
            raise SeatUnavailableError(f"Seats already booked: {', '.join(unavailable_seats)}")
        
        # Validate seat numbers exist in theater configuration
        theater_config = showtime.theater.get_screen_configuration(showtime.screen_number)
        if theater_config:
            valid_seats = BookingService._generate_valid_seat_numbers(theater_config)
            invalid_seats = [seat for seat in seat_numbers if seat not in valid_seats]
            if invalid_seats:
                raise ValidationError(f"Invalid seat numbers: {', '.join(invalid_seats)}")
        
        # Calculate pricing with seat-specific pricing if available
        subtotal = Decimal('0.00')
        for seat_number in seat_numbers:
            seat_price = showtime.get_seat_price(seat_number)
            subtotal += seat_price
        
        processing_fee = (subtotal * Decimal('0.03')).quantize(Decimal('0.01'))  # 3% processing fee
        total = subtotal + processing_fee
        
        # Generate unique booking reference
        booking_reference = Booking.generate_booking_reference()
        
        # Create booking with pending status
        booking = Booking.objects.create(
            customer=customer,
            booking_type='movie',
            showtime=showtime,
            booking_reference=booking_reference,
            subtotal=subtotal,
            discount_amount=Decimal('0.00'),  # Movie bookings don't have discounts yet
            fees=processing_fee,
            total_amount=total,
            customer_email=customer_email or customer.email,
            customer_phone=customer_phone or '',
            special_requests=special_requests or '',
            payment_status='pending',
            booking_status='pending'
        )
        
        # Create tickets and update showtime atomically
        for seat_number in seat_numbers:
            seat_price = showtime.get_seat_price(seat_number)
            Ticket.objects.create(
                booking=booking,
                seat_number=seat_number,
                price=seat_price
            )
        
        # Update showtime booked seats and available count
        showtime.booked_seats = list(booked_seats.union(requested_seats))
        showtime.available_seats -= len(seat_numbers)
        showtime.save()
        
        logger.info(f"Successfully created movie booking {booking.booking_reference}")
        
        # Send booking confirmation notification (async)
        context_data = {
            'user_name': customer.get_full_name() or customer.username,
            'booking_reference': booking.booking_reference,
            'movie_title': showtime.movie.title,
            'theater_name': showtime.theater.name,
            'showtime_datetime': showtime.start_time,
            'total_amount': str(booking.total_amount),
            'ticket_count': len(seat_numbers),
            'tickets': [
                {
                    'ticket_number': ticket.ticket_number,
                    'seat_number': ticket.seat_number,
                    'price': str(ticket.price)
                }
                for ticket in booking.tickets.all()
            ]
        }
        
        # Queue notification task
        send_booking_confirmation_task.delay(
            user_id=customer.id,
            booking_id=booking.id,
            context_data=context_data
        )
        
        return booking

    @staticmethod
    @transaction.atomic
    def create_movie_booking(
        customer,
        showtime: Showtime,
        seat_numbers: List[str],
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        special_requests: Optional[str] = None
    ) -> Booking:
        """
        Legacy method - use create_movie_booking_with_concurrency_control for new code
        """
        return BookingService.create_movie_booking_with_concurrency_control(
            customer, showtime, seat_numbers, customer_email, customer_phone, special_requests
        )
    
    @staticmethod
    @transaction.atomic
    def cancel_booking(booking: Booking, reason: str = '') -> bool:
        """
        Cancel a booking and handle refunds/reversals
        
        Args:
            booking: Booking instance to cancel
            reason: Reason for cancellation
            
        Returns:
            True if successfully cancelled, False otherwise
        """
        if booking.booking_status in ['cancelled', 'completed']:
            raise ValidationError("Cannot cancel booking with current status")
        
        # Check if booking is refundable
        if not booking.is_refundable:
            raise ValidationError("Booking is not refundable")
        
        # Reverse discount usage if applicable
        if booking.applied_discount:
            discount = booking.applied_discount
            discount.current_uses = max(0, discount.current_uses - 1)
            discount.save()
        
        # Reverse ticket sales for event bookings
        if booking.booking_type == 'event':
            for ticket in booking.tickets.all():
                if ticket.ticket_type:
                    ticket_type = ticket.ticket_type
                    ticket_type.quantity_sold = max(0, ticket_type.quantity_sold - 1)
                    ticket_type.save()
        
        # Reverse seat bookings for movie bookings
        elif booking.booking_type == 'movie' and booking.showtime:
            showtime = booking.showtime
            booked_seats = set(showtime.booked_seats)
            cancelled_seats = set(ticket.seat_number for ticket in booking.tickets.all())
            
            showtime.booked_seats = list(booked_seats - cancelled_seats)
            showtime.available_seats += len(cancelled_seats)
            showtime.save()
        
        # Update booking status
        booking.booking_status = 'cancelled'
        booking.save()
        
        # Mark all tickets as cancelled
        booking.tickets.update(status='cancelled')
        
        # Send cancellation notification
        context_data = {
            'user_name': booking.customer.get_full_name() or booking.customer.username,
            'booking_reference': booking.booking_reference,
            'refund_amount': str(booking.total_amount),
            'cancellation_reason': reason
        }
        
        if booking.booking_type == 'event' and booking.event:
            context_data.update({
                'event_title': booking.event.title,
                'event_datetime': booking.event.start_datetime,
            })
        elif booking.booking_type == 'movie' and booking.showtime:
            context_data.update({
                'movie_title': booking.showtime.movie.title,
                'showtime_datetime': booking.showtime.start_time,
            })
        
        # Queue cancellation notification
        send_notification_task.delay(
            user_id=booking.customer.id,
            notification_type='booking_cancellation',
            context_data=context_data,
            related_object_id=booking.id,
            related_object_type='booking'
        )
        
        return True
    
    @staticmethod
    def _generate_valid_seat_numbers(theater_config: Dict) -> List[str]:
        """
        Generate list of valid seat numbers based on theater configuration
        
        Args:
            theater_config: Theater screen configuration dictionary
            
        Returns:
            List of valid seat identifiers
        """
        valid_seats = []
        rows = theater_config.get('rows', 0)
        seats_per_row = theater_config.get('seats_per_row', 0)
        disabled_seats = set(theater_config.get('disabled_seats', []))
        
        for row_num in range(1, rows + 1):
            row_letter = chr(ord('A') + row_num - 1)  # A, B, C, etc.
            for seat_num in range(1, seats_per_row + 1):
                seat_id = f"{row_letter}{seat_num}"
                if seat_id not in disabled_seats:
                    valid_seats.append(seat_id)
        
        return valid_seats
    
    @staticmethod
    @transaction.atomic
    def update_booking_status(
        booking: Booking, 
        new_status: str, 
        reason: str = '',
        updated_by: Optional[str] = None
    ) -> bool:
        """
        Update booking status with validation and logging
        
        Args:
            booking: Booking instance to update
            new_status: New booking status
            reason: Reason for status change
            updated_by: Who updated the status
            
        Returns:
            True if status was updated successfully
            
        Raises:
            ValidationError: If status transition is invalid
        """
        valid_transitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['completed', 'cancelled', 'no_show'],
            'cancelled': [],  # Terminal state
            'completed': [],  # Terminal state
            'no_show': [],   # Terminal state
        }
        
        current_status = booking.booking_status
        
        if new_status not in valid_transitions.get(current_status, []):
            raise ValidationError(
                f"Invalid status transition from {current_status} to {new_status}"
            )
        
        # Lock booking to prevent concurrent updates
        booking = Booking.objects.select_for_update().get(id=booking.id)
        
        old_status = booking.booking_status
        booking.booking_status = new_status
        booking.save()
        
        logger.info(
            f"Booking {booking.booking_reference} status changed from {old_status} "
            f"to {new_status}. Reason: {reason}. Updated by: {updated_by or 'System'}"
        )
        
        return True
    
    @staticmethod
    @transaction.atomic
    def update_payment_status(
        booking: Booking, 
        new_payment_status: str, 
        transaction_id: Optional[str] = None,
        payment_method: Optional[str] = None
    ) -> bool:
        """
        Update payment status with validation
        
        Args:
            booking: Booking instance to update
            new_payment_status: New payment status
            transaction_id: Payment transaction ID
            payment_method: Payment method used
            
        Returns:
            True if payment status was updated successfully
        """
        valid_payment_statuses = [
            'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
        ]
        
        if new_payment_status not in valid_payment_statuses:
            raise ValidationError(f"Invalid payment status: {new_payment_status}")
        
        # Lock booking to prevent concurrent updates
        booking = Booking.objects.select_for_update().get(id=booking.id)
        
        old_payment_status = booking.payment_status
        booking.payment_status = new_payment_status
        
        if transaction_id:
            booking.payment_transaction_id = transaction_id
        
        if payment_method:
            booking.payment_method = payment_method
        
        booking.save()
        
        # Auto-update booking status based on payment status
        if new_payment_status == 'completed' and booking.booking_status == 'pending':
            BookingService.update_booking_status(booking, 'confirmed', 'Payment completed')
        elif new_payment_status == 'failed' and booking.booking_status == 'pending':
            BookingService.update_booking_status(booking, 'cancelled', 'Payment failed')
        
        logger.info(
            f"Booking {booking.booking_reference} payment status changed from "
            f"{old_payment_status} to {new_payment_status}"
        )
        
        return True
    
    @staticmethod
    def get_booking_by_reference(booking_reference: str) -> Optional[Booking]:
        """
        Get booking by reference number
        
        Args:
            booking_reference: Unique booking reference
            
        Returns:
            Booking instance if found, None otherwise
        """
        try:
            return Booking.objects.get(booking_reference=booking_reference)
        except Booking.DoesNotExist:
            return None
    
    @staticmethod
    def check_seat_availability(showtime: Showtime, seat_numbers: List[str]) -> Tuple[bool, List[str]]:
        """
        Check seat availability for a showtime without locking
        
        Args:
            showtime: Showtime instance
            seat_numbers: List of seat numbers to check
            
        Returns:
            Tuple of (all_available, unavailable_seats)
        """
        booked_seats = set(showtime.booked_seats)
        requested_seats = set(seat_numbers)
        unavailable_seats = list(booked_seats.intersection(requested_seats))
        
        return len(unavailable_seats) == 0, unavailable_seats
    
    @staticmethod
    def check_ticket_availability(event: Event, ticket_selections: List[Dict]) -> Tuple[bool, List[str]]:
        """
        Check ticket availability for an event without locking
        
        Args:
            event: Event instance
            ticket_selections: List of dicts with 'ticket_type_id' and 'quantity'
            
        Returns:
            Tuple of (all_available, unavailable_ticket_types)
        """
        unavailable_types = []
        
        for selection in ticket_selections:
            try:
                ticket_type = TicketType.objects.get(
                    id=selection['ticket_type_id'],
                    event=event
                )
                
                if ticket_type.tickets_remaining < selection['quantity']:
                    unavailable_types.append(
                        f"{ticket_type.name} (requested: {selection['quantity']}, "
                        f"available: {ticket_type.tickets_remaining})"
                    )
            except TicketType.DoesNotExist:
                unavailable_types.append(f"Ticket type ID {selection['ticket_type_id']} not found")
        
        return len(unavailable_types) == 0, unavailable_types
    
    @staticmethod
    @transaction.atomic
    def retry_booking_with_backoff(
        booking_func,
        max_retries: int = 3,
        base_delay: float = 0.1,
        *args,
        **kwargs
    ):
        """
        Retry booking operation with exponential backoff for handling race conditions
        
        Args:
            booking_func: Booking function to retry
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds
            *args, **kwargs: Arguments to pass to booking function
            
        Returns:
            Result of booking function
            
        Raises:
            Last exception if all retries fail
        """
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                return booking_func(*args, **kwargs)
            except (SeatUnavailableError, TicketUnavailableError, IntegrityError) as e:
                last_exception = e
                
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                    logger.warning(
                        f"Booking attempt {attempt + 1} failed: {str(e)}. "
                        f"Retrying in {delay:.2f} seconds..."
                    )
                    time.sleep(delay)
                else:
                    logger.error(f"All booking attempts failed. Last error: {str(e)}")
                    raise e
            except Exception as e:
                # Don't retry for other types of exceptions
                logger.error(f"Non-retryable error in booking: {str(e)}")
                raise e
        
        # This should never be reached, but just in case
        if last_exception:
            raise last_exception
    
    @staticmethod
    def process_booking_payment(
        booking: Booking,
        payment_method_id: Optional[str] = None,
        confirm_immediately: bool = False
    ) -> Dict:
        """
        Process payment for a booking using Stripe
        
        Args:
            booking: Booking instance to process payment for
            payment_method_id: Optional Stripe payment method ID
            confirm_immediately: Whether to confirm payment immediately
            
        Returns:
            Dictionary containing payment processing result
            
        Raises:
            PaymentProcessingError: If payment processing fails
        """
        try:
            # Create PaymentIntent
            payment_result = PaymentService.create_payment_intent(
                booking=booking,
                payment_method_id=payment_method_id,
                confirm=confirm_immediately
            )
            
            logger.info(f"Payment processing initiated for booking {booking.booking_reference}")
            
            return {
                'success': True,
                'payment_intent_id': payment_result['payment_intent_id'],
                'client_secret': payment_result['client_secret'],
                'status': payment_result['status'],
                'requires_action': payment_result['status'] == 'requires_action',
            }
            
        except PaymentProcessingError as e:
            logger.error(f"Payment processing failed for booking {booking.booking_reference}: {str(e)}")
            
            # Update booking status to failed
            BookingService.update_payment_status(booking, 'failed')
            
            return {
                'success': False,
                'error': str(e),
                'error_type': 'payment_processing_error'
            }
    
    @staticmethod
    def confirm_booking_payment(
        booking: Booking,
        payment_method_id: Optional[str] = None
    ) -> Dict:
        """
        Confirm payment for a booking
        
        Args:
            booking: Booking instance
            payment_method_id: Optional payment method ID
            
        Returns:
            Dictionary containing confirmation result
        """
        try:
            if not booking.payment_transaction_id:
                raise PaymentProcessingError("No payment transaction found for booking")
            
            result = PaymentService.confirm_payment_intent(
                booking.payment_transaction_id,
                payment_method_id
            )
            
            return {
                'success': True,
                'status': result['status'],
                'requires_action': result.get('requires_action', False),
                'client_secret': result.get('client_secret'),
            }
            
        except PaymentProcessingError as e:
            logger.error(f"Payment confirmation failed for booking {booking.booking_reference}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'payment_confirmation_error'
            }
    
    @staticmethod
    def process_booking_refund(
        booking: Booking,
        refund_amount: Optional[Decimal] = None,
        reason: str = 'requested_by_customer'
    ) -> Dict:
        """
        Process refund for a booking
        
        Args:
            booking: Booking instance to refund
            refund_amount: Optional partial refund amount
            reason: Reason for refund
            
        Returns:
            Dictionary containing refund result
        """
        try:
            # Validate booking is refundable
            if not booking.is_refundable:
                return {
                    'success': False,
                    'error': 'Booking is not eligible for refund',
                    'error_type': 'refund_not_allowed'
                }
            
            # Cancel the booking first (before updating payment status)
            BookingService.cancel_booking(booking, f"Refunded: {reason}")
            
            # Process refund through Stripe
            refund_result = PaymentService.create_refund(
                booking=booking,
                amount=refund_amount,
                reason=reason
            )
            
            logger.info(f"Refund processed for booking {booking.booking_reference}")
            
            return {
                'success': True,
                'refund_id': refund_result['refund_id'],
                'amount': refund_result['amount'] / 100,  # Convert from cents
                'status': refund_result['status'],
            }
            
        except Exception as e:
            logger.error(f"Refund processing failed for booking {booking.booking_reference}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'refund_processing_error'
            }
    
    @staticmethod
    def retry_booking_payment(
        booking: Booking,
        payment_method_id: str
    ) -> Dict:
        """
        Retry payment for a failed booking
        
        Args:
            booking: Booking instance with failed payment
            payment_method_id: New payment method ID
            
        Returns:
            Dictionary containing retry result
        """
        try:
            if booking.payment_status not in ['failed', 'pending']:
                return {
                    'success': False,
                    'error': 'Booking payment cannot be retried',
                    'error_type': 'retry_not_allowed'
                }
            
            # Reset booking status for retry
            BookingService.update_payment_status(booking, 'pending')
            
            # Retry payment
            result = PaymentService.retry_failed_payment(
                booking=booking,
                payment_method_id=payment_method_id
            )
            
            return {
                'success': True,
                'payment_intent_id': result['payment_intent_id'],
                'client_secret': result['client_secret'],
                'status': result['status'],
            }
            
        except PaymentProcessingError as e:
            logger.error(f"Payment retry failed for booking {booking.booking_reference}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'payment_retry_error'
            }
    
    @staticmethod
    def get_booking_analytics(customer=None, event=None, date_range=None) -> Dict:
        """
        Get booking analytics
        
        Args:
            customer: Optional customer filter
            event: Optional event filter
            date_range: Optional date range tuple (start_date, end_date)
            
        Returns:
            Dictionary containing booking analytics
        """
        bookings = Booking.objects.all()
        
        if customer:
            bookings = bookings.filter(customer=customer)
        
        if event:
            bookings = bookings.filter(event=event)
        
        if date_range:
            start_date, end_date = date_range
            bookings = bookings.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            )
        
        total_bookings = bookings.count()
        total_revenue = sum(
            booking.total_amount for booking in bookings.filter(payment_status='completed')
        )
        total_discount_amount = sum(
            booking.discount_amount for booking in bookings
        )
        
        bookings_with_discounts = bookings.filter(
            applied_discount__isnull=False
        ).count()
        
        return {
            'total_bookings': total_bookings,
            'total_revenue': float(total_revenue),
            'total_discount_amount': float(total_discount_amount),
            'bookings_with_discounts': bookings_with_discounts,
            'average_booking_value': float(total_revenue / total_bookings) if total_bookings > 0 else 0,
            'discount_usage_rate': (bookings_with_discounts / total_bookings * 100) if total_bookings > 0 else 0,
        }