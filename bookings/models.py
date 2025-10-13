from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from typing import Dict, Tuple
import uuid
import qrcode
import base64
from io import BytesIO
import secrets
import string


class Booking(models.Model):
    """Booking model for managing customer bookings for events and movies"""
    
    BOOKING_TYPES = [
        ('event', 'Event Booking'),
        ('movie', 'Movie Booking'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]
    
    BOOKING_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('no_show', 'No Show'),
    ]
    
    # Customer information
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text="Customer who made the booking"
    )
    
    # Booking type and references
    booking_type = models.CharField(
        max_length=20,
        choices=BOOKING_TYPES,
        help_text="Type of booking (event or movie)"
    )
    
    # Foreign key relationships (one will be null based on booking_type)
    event = models.ForeignKey(
        'events.Event',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text="Associated event (for event bookings)"
    )
    showtime = models.ForeignKey(
        'theaters.Showtime',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text="Associated showtime (for movie bookings)"
    )
    
    # Booking identification
    booking_reference = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique booking reference number"
    )
    
    # Financial information
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Subtotal before discounts and fees"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total discount applied"
    )
    fees = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Additional fees (processing, service, etc.)"
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Final total amount"
    )
    
    # Applied discount information
    applied_discount = models.ForeignKey(
        'events.Discount',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bookings',
        help_text="Discount applied to this booking"
    )
    
    # Status tracking
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending',
        help_text="Payment processing status"
    )
    booking_status = models.CharField(
        max_length=20,
        choices=BOOKING_STATUS_CHOICES,
        default='pending',
        help_text="Overall booking status"
    )
    
    # Payment information
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        help_text="Payment method used"
    )
    payment_transaction_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="External payment transaction ID"
    )
    
    # Customer information
    customer_email = models.EmailField(help_text="Customer email for notifications")
    customer_phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Customer phone number"
    )
    
    # Additional booking details
    special_requests = models.TextField(
        blank=True,
        help_text="Any special requests or notes"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookings'
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['booking_reference']),
            models.Index(fields=['booking_type']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['booking_status']),
            models.Index(fields=['event']),
            models.Index(fields=['showtime']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Booking {self.booking_reference} - {self.customer.username}"
    
    def clean(self):
        """Validate booking data"""
        from django.core.exceptions import ValidationError
        
        # Ensure exactly one of event or showtime is set based on booking_type
        if self.booking_type == 'event':
            if not self.event:
                raise ValidationError("Event is required for event bookings")
            if self.showtime:
                raise ValidationError("Showtime should not be set for event bookings")
        elif self.booking_type == 'movie':
            if not self.showtime:
                raise ValidationError("Showtime is required for movie bookings")
            if self.event:
                raise ValidationError("Event should not be set for movie bookings")
        
        # Validate financial calculations
        calculated_total = self.subtotal - self.discount_amount + self.fees
        if abs(calculated_total - self.total_amount) > Decimal('0.01'):
            raise ValidationError("Total amount calculation is incorrect")
    
    def save(self, *args, **kwargs):
        """Override save to generate booking reference and run validation"""
        if not self.booking_reference:
            self.booking_reference = self.generate_booking_reference()
        
        # Set customer email from user if not provided
        if not self.customer_email and self.customer:
            self.customer_email = self.customer.email
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_booking_reference():
        """Generate a unique booking reference"""
        while True:
            # Generate a random 8-character alphanumeric string
            reference = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            if not Booking.objects.filter(booking_reference=reference).exists():
                return reference
    
    @property
    def ticket_count(self):
        """Get total number of tickets in this booking"""
        return self.tickets.count()
    
    @property
    def is_refundable(self):
        """Check if booking is eligible for refund"""
        if self.booking_status in ['cancelled', 'completed', 'no_show']:
            return False
        
        # For pending payments, allow refund if event/showtime hasn't started
        # For completed payments, also allow refund if event/showtime hasn't started
        if self.payment_status not in ['pending', 'completed']:
            return False
        
        # Check if event/showtime hasn't started yet
        if self.booking_type == 'event' and self.event:
            return self.event.start_datetime > timezone.now()
        elif self.booking_type == 'movie' and self.showtime:
            return self.showtime.start_time > timezone.now()
        
        return False
    
    @property
    def event_or_showtime_title(self):
        """Get the title of the associated event or movie"""
        if self.booking_type == 'event' and self.event:
            return self.event.title
        elif self.booking_type == 'movie' and self.showtime:
            return self.showtime.movie.title
        return "Unknown"
    
    @property
    def event_or_showtime_datetime(self):
        """Get the datetime of the associated event or showtime"""
        if self.booking_type == 'event' and self.event:
            return self.event.start_datetime
        elif self.booking_type == 'movie' and self.showtime:
            return self.showtime.start_time
        return None
    
    def generate_tickets_pdf(self) -> bytes:
        """
        Generate PDF for all tickets in this booking
        
        Returns:
            PDF bytes
        """
        from .ticket_services import TicketPDFGenerator
        return TicketPDFGenerator.generate_booking_pdf(self)


class Ticket(models.Model):
    """Ticket model for individual tickets within a booking"""
    
    TICKET_STATUS_CHOICES = [
        ('valid', 'Valid'),
        ('used', 'Used'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='tickets',
        help_text="Associated booking"
    )
    
    # Ticket type (for event bookings)
    ticket_type = models.ForeignKey(
        'events.TicketType',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='tickets',
        help_text="Ticket type (for event bookings)"
    )
    
    # Seat information (for movie bookings)
    seat_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Seat number/identifier (for movie bookings)"
    )
    
    # Ticket identification
    ticket_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique ticket number"
    )
    
    # QR code for ticket validation
    qr_code_data = models.TextField(
        help_text="QR code data for ticket validation"
    )
    qr_code_image = models.TextField(
        blank=True,
        help_text="Base64 encoded QR code image"
    )
    
    # Pricing
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Individual ticket price"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=TICKET_STATUS_CHOICES,
        default='valid',
        help_text="Ticket status"
    )
    
    # Usage tracking
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the ticket was used/scanned"
    )
    used_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Who scanned/validated the ticket"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tickets'
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['booking']),
            models.Index(fields=['ticket_number']),
            models.Index(fields=['status']),
            models.Index(fields=['ticket_type']),
            models.Index(fields=['seat_number']),
        ]
    
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.booking.booking_reference}"
    
    def clean(self):
        """Validate ticket data"""
        from django.core.exceptions import ValidationError
        
        # Validate ticket type for event bookings
        if self.booking.booking_type == 'event':
            if not self.ticket_type:
                raise ValidationError("Ticket type is required for event bookings")
            if self.seat_number:
                raise ValidationError("Seat number should not be set for event bookings")
        
        # Validate seat number for movie bookings
        elif self.booking.booking_type == 'movie':
            if not self.seat_number:
                raise ValidationError("Seat number is required for movie bookings")
            if self.ticket_type:
                raise ValidationError("Ticket type should not be set for movie bookings")
    
    def save(self, *args, **kwargs):
        """Override save to generate ticket number and QR code"""
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        
        if not self.qr_code_data:
            self.qr_code_data = self.generate_qr_code_data()
        
        if not self.qr_code_image:
            self.qr_code_image = self.generate_qr_code_image()
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_ticket_number():
        """Generate a unique ticket number"""
        while True:
            # Generate a ticket number with format: TKT-YYYYMMDD-XXXXXXXX
            date_part = timezone.now().strftime('%Y%m%d')
            random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            ticket_number = f"TKT-{date_part}-{random_part}"
            
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number
    
    def generate_qr_code_data(self):
        """Generate QR code data for ticket validation using enhanced service"""
        from .ticket_services import QRCodeGenerator
        return QRCodeGenerator.generate_qr_code_data(self, include_signature=True)
    
    def generate_qr_code_image(self):
        """Generate base64 encoded QR code image using enhanced service"""
        if not self.qr_code_data:
            return ""
        
        from .ticket_services import QRCodeGenerator
        return QRCodeGenerator.generate_qr_code_image(self.qr_code_data)
    
    def mark_as_used(self, used_by="System"):
        """Mark ticket as used"""
        if self.status == 'valid':
            self.status = 'used'
            self.used_at = timezone.now()
            self.used_by = used_by
            self.save()
            return True
        return False
    
    def is_valid_for_use(self):
        """Check if ticket is valid for use"""
        if self.status != 'valid':
            return False, f"Ticket status is {self.status}"
        
        # Check if event/showtime hasn't started yet or is currently ongoing
        event_datetime = self.booking.event_or_showtime_datetime
        if not event_datetime:
            return False, "No associated event or showtime"
        
        now = timezone.now()
        
        # Allow entry up to 30 minutes before start time
        entry_allowed_from = event_datetime - timezone.timedelta(minutes=30)
        
        if now < entry_allowed_from:
            return False, "Too early for entry"
        
        # For events, allow entry during the event
        # For movies, allow entry only before start time + 30 minutes
        if self.booking.booking_type == 'event':
            if self.booking.event and now > self.booking.event.end_datetime:
                return False, "Event has ended"
        else:
            # For movies, allow entry up to 30 minutes after start
            late_entry_cutoff = event_datetime + timezone.timedelta(minutes=30)
            if now > late_entry_cutoff:
                return False, "Too late for entry"
        
        return True, "Valid for entry"
    
    @property
    def event_or_movie_title(self):
        """Get the title of the associated event or movie"""
        return self.booking.event_or_showtime_title
    
    @property
    def venue_info(self):
        """Get venue information"""
        if self.booking.booking_type == 'event' and self.booking.event:
            return f"{self.booking.event.venue}, {self.booking.event.address}"
        elif self.booking.booking_type == 'movie' and self.booking.showtime:
            theater = self.booking.showtime.theater
            return f"{theater.name}, Screen {self.booking.showtime.screen_number}"
        return "Unknown venue"
    
    def generate_pdf(self) -> bytes:
        """
        Generate PDF ticket for email delivery
        
        Returns:
            PDF bytes
        """
        from .ticket_services import TicketPDFGenerator
        return TicketPDFGenerator.generate_ticket_pdf(self)
    
    def validate_for_entry(self, scanner_id: str = "System") -> Tuple[bool, str]:
        """
        Validate ticket for entry using enhanced validation service
        
        Args:
            scanner_id: ID of the scanner/validator
            
        Returns:
            Tuple of (is_valid, message)
        """
        from .ticket_services import TicketValidationService
        is_valid, message, _ = TicketValidationService.validate_ticket_for_entry(
            self.ticket_number, scanner_id, "manual"
        )
        return is_valid, message
    
    def get_detailed_info(self) -> Dict:
        """
        Get detailed ticket information
        
        Returns:
            Dictionary with detailed ticket info
        """
        from .ticket_services import TicketValidationService
        found, info, _ = TicketValidationService.get_ticket_info(self.ticket_number)
        return info if found else {}
    
    def change_status(self, new_status: str, reason: str = '', changed_by: str = 'System') -> Tuple[bool, str]:
        """
        Change ticket status with validation
        
        Args:
            new_status: New status to set
            reason: Reason for status change
            changed_by: Who made the change
            
        Returns:
            Tuple of (success, message)
        """
        from .ticket_services import TicketStatusManager
        return TicketStatusManager.change_ticket_status(self, new_status, reason, changed_by)
