from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import Discount, Event
from typing import Dict, Optional, Tuple


class DiscountService:
    """Service class for handling discount validation, application, and tracking"""
    
    @staticmethod
    def validate_discount(discount: Discount, quantity: int = 1) -> Tuple[bool, str]:
        """
        Validate if a discount can be applied
        
        Args:
            discount: Discount instance to validate
            quantity: Number of tickets being purchased
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if discount is active
        if not discount.is_active:
            return False, "Discount is not active"
        
        # Check time validity
        now = timezone.now()
        if now < discount.valid_from:
            return False, "Discount is not yet valid"
        
        if now > discount.valid_until:
            return False, "Discount has expired"
        
        # Check usage limits
        if discount.max_uses is not None:
            if discount.current_uses >= discount.max_uses:
                return False, "Discount usage limit reached"
        
        # Check if event is still valid for booking
        if discount.event.status not in ['published']:
            return False, "Event is not available for booking"
        
        if discount.event.start_datetime <= now:
            return False, "Cannot apply discount to past events"
        
        return True, "Discount is valid"
    
    @staticmethod
    def validate_promo_code(event: Event, promo_code: str) -> Tuple[Optional[Discount], str]:
        """
        Validate a promo code for an event
        
        Args:
            event: Event instance
            promo_code: Promo code to validate
            
        Returns:
            Tuple of (discount_instance_or_none, error_message)
        """
        try:
            discount = Discount.objects.get(
                event=event,
                promo_code__iexact=promo_code,
                category='promo_code'
            )
            
            is_valid, error_msg = DiscountService.validate_discount(discount)
            if is_valid:
                return discount, "Promo code is valid"
            else:
                return None, error_msg
                
        except Discount.DoesNotExist:
            return None, "Invalid promo code"
    
    @staticmethod
    def get_applicable_discounts(event: Event, quantity: int = 1) -> list:
        """
        Get all applicable discounts for an event and quantity
        
        Args:
            event: Event instance
            quantity: Number of tickets being purchased
            
        Returns:
            List of applicable discount instances
        """
        now = timezone.now()
        
        # Get all active discounts for the event
        discounts = Discount.objects.filter(
            event=event,
            is_active=True,
            valid_from__lte=now,
            valid_until__gte=now
        )
        
        applicable_discounts = []
        
        for discount in discounts:
            # Skip promo code discounts (they need explicit validation)
            if discount.category == 'promo_code':
                continue
            
            # Check usage limits
            if discount.max_uses is not None and discount.current_uses >= discount.max_uses:
                continue
            
            # Check category-specific rules
            if discount.category == 'group' and quantity < 5:  # Group discount requires 5+ tickets
                continue
            
            applicable_discounts.append(discount)
        
        return applicable_discounts
    
    @staticmethod
    def calculate_discount_amount(
        discount: Discount, 
        subtotal: Decimal, 
        quantity: int = 1
    ) -> Decimal:
        """
        Calculate the discount amount for a given subtotal
        
        Args:
            discount: Discount instance
            subtotal: Original subtotal amount
            quantity: Number of tickets
            
        Returns:
            Discount amount to be deducted
        """
        if discount.discount_type == 'percentage':
            discount_amount = subtotal * (discount.discount_value / Decimal('100'))
        else:  # fixed_amount
            discount_amount = discount.discount_value
        
        # Ensure discount doesn't exceed subtotal
        return min(discount_amount, subtotal)
    
    @staticmethod
    def get_best_discount(
        event: Event, 
        subtotal: Decimal, 
        quantity: int = 1,
        promo_code: Optional[str] = None
    ) -> Tuple[Optional[Discount], Decimal]:
        """
        Get the best applicable discount for a booking
        
        Args:
            event: Event instance
            subtotal: Original subtotal amount
            quantity: Number of tickets
            promo_code: Optional promo code
            
        Returns:
            Tuple of (best_discount_or_none, discount_amount)
        """
        best_discount = None
        best_discount_amount = Decimal('0.00')
        
        # Check promo code first if provided
        if promo_code:
            promo_discount, _ = DiscountService.validate_promo_code(event, promo_code)
            if promo_discount:
                promo_amount = DiscountService.calculate_discount_amount(
                    promo_discount, subtotal, quantity
                )
                if promo_amount > best_discount_amount:
                    best_discount = promo_discount
                    best_discount_amount = promo_amount
        
        # Check other applicable discounts
        applicable_discounts = DiscountService.get_applicable_discounts(event, quantity)
        
        for discount in applicable_discounts:
            discount_amount = DiscountService.calculate_discount_amount(
                discount, subtotal, quantity
            )
            if discount_amount > best_discount_amount:
                best_discount = discount
                best_discount_amount = discount_amount
        
        return best_discount, best_discount_amount
    
    @staticmethod
    @transaction.atomic
    def apply_discount(discount: Discount) -> bool:
        """
        Apply a discount by incrementing its usage count
        
        Args:
            discount: Discount instance to apply
            
        Returns:
            True if successfully applied, False otherwise
        """
        try:
            # Use select_for_update to prevent race conditions
            discount_obj = Discount.objects.select_for_update().get(id=discount.id)
            
            # Validate one more time before applying
            is_valid, _ = DiscountService.validate_discount(discount_obj)
            if not is_valid:
                return False
            
            # Increment usage count
            discount_obj.current_uses += 1
            discount_obj.save()
            
            return True
            
        except Discount.DoesNotExist:
            return False
    
    @staticmethod
    def get_discount_analytics(event: Event) -> Dict:
        """
        Get analytics data for discounts of an event
        
        Args:
            event: Event instance
            
        Returns:
            Dictionary containing discount analytics
        """
        from bookings.models import Booking
        
        discounts = event.discounts.all()
        analytics = {
            'total_discounts': discounts.count(),
            'active_discounts': discounts.filter(is_active=True).count(),
            'expired_discounts': discounts.filter(
                valid_until__lt=timezone.now()
            ).count(),
            'discount_usage': {},
            'total_discount_amount': Decimal('0.00'),
            'bookings_with_discounts': 0,
        }
        
        for discount in discounts:
            # Get bookings that used this discount
            bookings_with_discount = Booking.objects.filter(
                event=event,
                applied_discount=discount
            )
            
            total_discount_amount = sum(
                booking.discount_amount for booking in bookings_with_discount
            )
            
            analytics['discount_usage'][discount.name] = {
                'id': discount.id,
                'current_uses': discount.current_uses,
                'max_uses': discount.max_uses,
                'total_discount_amount': float(total_discount_amount),
                'bookings_count': bookings_with_discount.count(),
                'category': discount.category,
                'discount_type': discount.discount_type,
                'discount_value': float(discount.discount_value),
            }
            
            analytics['total_discount_amount'] += total_discount_amount
            analytics['bookings_with_discounts'] += bookings_with_discount.count()
        
        return analytics


class BookingPriceCalculator:
    """Service class for calculating booking prices with discounts"""
    
    @staticmethod
    def calculate_booking_price(
        ticket_selections: list,
        event: Event,
        promo_code: Optional[str] = None
    ) -> Dict:
        """
        Calculate total booking price including discounts
        
        Args:
            ticket_selections: List of dicts with 'ticket_type_id' and 'quantity'
            event: Event instance
            promo_code: Optional promo code
            
        Returns:
            Dictionary with price breakdown
        """
        from events.models import TicketType
        
        subtotal = Decimal('0.00')
        ticket_details = []
        total_quantity = 0
        
        # Calculate subtotal
        for selection in ticket_selections:
            try:
                ticket_type = TicketType.objects.get(
                    id=selection['ticket_type_id'],
                    event=event
                )
                quantity = selection['quantity']
                line_total = ticket_type.price * quantity
                
                ticket_details.append({
                    'ticket_type': ticket_type.name,
                    'price': float(ticket_type.price),
                    'quantity': quantity,
                    'line_total': float(line_total)
                })
                
                subtotal += line_total
                total_quantity += quantity
                
            except TicketType.DoesNotExist:
                raise ValidationError(f"Invalid ticket type ID: {selection['ticket_type_id']}")
        
        # Find best applicable discount
        best_discount, discount_amount = DiscountService.get_best_discount(
            event, subtotal, total_quantity, promo_code
        )
        
        # Calculate fees (example: 3% processing fee)
        processing_fee = subtotal * Decimal('0.03')
        
        # Calculate final total
        total = subtotal - discount_amount + processing_fee
        
        return {
            'subtotal': float(subtotal),
            'discount_amount': float(discount_amount),
            'discount_applied': {
                'id': best_discount.id if best_discount else None,
                'name': best_discount.name if best_discount else None,
                'type': best_discount.discount_type if best_discount else None,
                'value': float(best_discount.discount_value) if best_discount else None,
            } if best_discount else None,
            'processing_fee': float(processing_fee),
            'total': float(total),
            'ticket_details': ticket_details,
            'total_quantity': total_quantity,
        }