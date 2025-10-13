from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
from decimal import Decimal
from typing import Dict, Any, Optional

from .models import Booking, Ticket
from .payment_service import PaymentService
from events.models import TicketType
from theaters.models import Showtime


class BookingService:
    """Service for managing booking operations"""
    
    @staticmethod
    @transaction.atomic
    def cancel_booking(
        booking: Booking,
        reason: str = '',
        refund_requested: bool = True,
        cancelled_by: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Cancel a booking and process refund if applicable
        
        Args:
            booking: Booking to cancel
            reason: Reason for cancellation
            refund_requested: Whether refund is requested
            cancelled_by: User who cancelled the booking
            
        Returns:
            Dictionary with cancellation result
        """
        try:
            # Validate booking can be cancelled
            if booking.booking_status == 'cancelled':
                return {
                    'success': False,
                    'message': 'Booking is already cancelled'
                }
            
            if booking.booking_status == 'completed':
                return {
                    'success': False,
                    'message': 'Cannot cancel completed booking'
                }
            
            # Check if refund is possible
            refund_amount = Decimal('0.00')
            refund_status = 'not_requested'
            
            if refund_requested and booking.payment_status == 'completed':
                if booking.is_refundable:
                    # Calculate refund amount (could include cancellation fees)
                    refund_amount = BookingService._calculate_refund_amount(booking)
                    
                    # Process refund through payment service
                    refund_result = PaymentService.process_refund(
                        booking=booking,
                        amount=refund_amount,
                        reason=reason
                    )
                    
                    if refund_result['success']:
                        refund_status = 'processed'
                        booking.payment_status = 'refunded'
                    else:
                        refund_status = 'failed'
                        return {
                            'success': False,
                            'message': f'Refund failed: {refund_result["message"]}'
                        }
                else:
                    return {
                        'success': False,
                        'message': 'Booking is not eligible for refund'
                    }
            
            # Update booking status
            booking.booking_status = 'cancelled'
            booking.save()
            
            # Cancel all tickets
            booking.tickets.update(
                status='cancelled',
                updated_at=timezone.now()
            )
            
            # Release inventory
            BookingService._release_inventory(booking)
            
            # Log cancellation (could be extended with audit logging)
            # AuditLog.create_cancellation_log(booking, reason, cancelled_by)
            
            return {
                'success': True,
                'message': 'Booking cancelled successfully',
                'refund_amount': refund_amount,
                'refund_status': refund_status
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to cancel booking: {str(e)}'
            }
    
    @staticmethod
    def _calculate_refund_amount(booking: Booking) -> Decimal:
        """
        Calculate refund amount based on cancellation policy
        
        Args:
            booking: Booking to calculate refund for
            
        Returns:
            Refund amount
        """
        total_amount = booking.total_amount
        
        # Get time until event/showtime
        event_datetime = booking.event_or_showtime_datetime
        if not event_datetime:
            return total_amount
        
        hours_until_event = (event_datetime - timezone.now()).total_seconds() / 3600
        
        # Cancellation policy (can be made configurable)
        if hours_until_event >= 48:
            # Full refund if cancelled 48+ hours before
            return total_amount
        elif hours_until_event >= 24:
            # 80% refund if cancelled 24-48 hours before
            return total_amount * Decimal('0.8')
        elif hours_until_event >= 2:
            # 50% refund if cancelled 2-24 hours before
            return total_amount * Decimal('0.5')
        else:
            # No refund if cancelled less than 2 hours before
            return Decimal('0.00')
    
    @staticmethod
    def _release_inventory(booking: Booking):
        """
        Release inventory back to available pool
        
        Args:
            booking: Booking to release inventory for
        """
        if booking.booking_type == 'event' and booking.event:
            # Release event tickets back to ticket types
            for ticket in booking.tickets.all():
                if ticket.ticket_type:
                    ticket.ticket_type.quantity_sold = max(
                        0, ticket.ticket_type.quantity_sold - 1
                    )
                    ticket.ticket_type.save()
        
        elif booking.booking_type == 'movie' and booking.showtime:
            # Release movie seats back to showtime
            seats_to_release = [
                ticket.seat_number for ticket in booking.tickets.all()
                if ticket.seat_number
            ]
            
            if seats_to_release:
                showtime = booking.showtime
                booked_seats = showtime.booked_seats or []
                
                # Remove released seats from booked_seats
                for seat in seats_to_release:
                    if seat in booked_seats:
                        booked_seats.remove(seat)
                
                showtime.booked_seats = booked_seats
                showtime.available_seats += len(seats_to_release)
                showtime.save()
    
    @staticmethod
    def get_booking_analytics(user: User) -> Dict[str, Any]:
        """
        Get comprehensive booking analytics for a user
        
        Args:
            user: User to get analytics for
            
        Returns:
            Dictionary with analytics data
        """
        bookings = Booking.objects.filter(customer=user)
        
        # Basic stats
        total_bookings = bookings.count()
        total_spent = bookings.aggregate(
            total=models.Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        # Status breakdown
        status_breakdown = {}
        for status_choice in Booking.BOOKING_STATUS_CHOICES:
            status_code = status_choice[0]
            count = bookings.filter(booking_status=status_code).count()
            status_breakdown[status_code] = count
        
        # Type breakdown
        type_breakdown = {}
        for type_choice in Booking.BOOKING_TYPES:
            type_code = type_choice[0]
            count = bookings.filter(booking_type=type_code).count()
            type_breakdown[type_code] = count
        
        # Monthly trends (last 12 months)
        from django.db import models
        monthly_trends = {}
        now = timezone.now()
        
        for i in range(12):
            month_start = now.replace(day=1) - timezone.timedelta(days=30 * i)
            month_bookings = bookings.filter(
                created_at__year=month_start.year,
                created_at__month=month_start.month
            )
            
            month_key = month_start.strftime('%Y-%m')
            monthly_trends[month_key] = {
                'bookings': month_bookings.count(),
                'revenue': month_bookings.aggregate(
                    total=models.Sum('total_amount')
                )['total'] or Decimal('0.00')
            }
        
        return {
            'total_bookings': total_bookings,
            'total_spent': total_spent,
            'average_booking_value': total_spent / total_bookings if total_bookings > 0 else Decimal('0.00'),
            'status_breakdown': status_breakdown,
            'type_breakdown': type_breakdown,
            'monthly_trends': monthly_trends
        }
    
    @staticmethod
    def check_booking_eligibility(user: User, event=None, showtime=None) -> Dict[str, Any]:
        """
        Check if user is eligible to book for an event or showtime
        
        Args:
            user: User to check eligibility for
            event: Event to check (optional)
            showtime: Showtime to check (optional)
            
        Returns:
            Dictionary with eligibility result
        """
        # Check for existing bookings
        existing_booking = None
        
        if event:
            existing_booking = Booking.objects.filter(
                customer=user,
                event=event,
                booking_status__in=['confirmed', 'pending']
            ).first()
        elif showtime:
            existing_booking = Booking.objects.filter(
                customer=user,
                showtime=showtime,
                booking_status__in=['confirmed', 'pending']
            ).first()
        
        if existing_booking:
            return {
                'eligible': False,
                'reason': 'Already have a booking for this event/showtime',
                'existing_booking_id': existing_booking.id
            }
        
        # Check user account status (could be extended)
        # if user.is_suspended:
        #     return {
        #         'eligible': False,
        #         'reason': 'Account is suspended'
        #     }
        
        return {
            'eligible': True,
            'reason': 'Eligible to book'
        }