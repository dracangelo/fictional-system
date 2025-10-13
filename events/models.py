from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid


class Event(models.Model):
    """Event model for managing events with ticketing capabilities"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    
    CATEGORY_CHOICES = [
        ('concert', 'Concert'),
        ('theater', 'Theater'),
        ('sports', 'Sports'),
        ('conference', 'Conference'),
        ('workshop', 'Workshop'),
        ('festival', 'Festival'),
        ('comedy', 'Comedy'),
        ('other', 'Other'),
    ]
    
    # Basic event information
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='owned_events',
        help_text="Event owner (must have event_owner role)"
    )
    title = models.CharField(max_length=200, help_text="Event title")
    description = models.TextField(help_text="Detailed event description")
    venue = models.CharField(max_length=200, help_text="Venue name")
    address = models.TextField(help_text="Full venue address")
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES, 
        default='other',
        help_text="Event category"
    )
    
    # Date and time
    start_datetime = models.DateTimeField(help_text="Event start date and time")
    end_datetime = models.DateTimeField(help_text="Event end date and time")
    
    # Media storage using JSONField (compatible with both SQLite and PostgreSQL)
    media = models.JSONField(
        default=list,
        blank=True,
        help_text="List of media URLs (images, videos)"
    )
    
    # Status and visibility
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='draft',
        help_text="Event status"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the event is active and visible"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        ordering = ['-start_datetime']
        indexes = [
            models.Index(fields=['start_datetime', 'end_datetime']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['owner']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.start_datetime.strftime('%Y-%m-%d')}"
    
    def clean(self):
        """Validate event data"""
        from django.core.exceptions import ValidationError
        
        if self.start_datetime and self.end_datetime:
            if self.start_datetime >= self.end_datetime:
                raise ValidationError("End datetime must be after start datetime")
            
            if self.start_datetime < timezone.now():
                raise ValidationError("Event cannot be scheduled in the past")
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_upcoming(self):
        """Check if event is upcoming"""
        return self.start_datetime > timezone.now()
    
    @property
    def is_ongoing(self):
        """Check if event is currently ongoing"""
        now = timezone.now()
        return self.start_datetime <= now <= self.end_datetime
    
    @property
    def is_past(self):
        """Check if event is in the past"""
        return self.end_datetime < timezone.now()
    
    @property
    def total_tickets_available(self):
        """Get total number of tickets available across all ticket types"""
        return sum(ticket_type.quantity_available for ticket_type in self.ticket_types.all())
    
    @property
    def total_tickets_sold(self):
        """Get total number of tickets sold across all ticket types"""
        return sum(ticket_type.quantity_sold for ticket_type in self.ticket_types.all())
    
    @property
    def tickets_remaining(self):
        """Get total number of tickets remaining"""
        return self.total_tickets_available - self.total_tickets_sold


class TicketType(models.Model):
    """Ticket type model for different ticket categories within an event"""
    
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='ticket_types',
        help_text="Associated event"
    )
    name = models.CharField(
        max_length=100, 
        help_text="Ticket type name (e.g., VIP, General, Student)"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of what this ticket type includes"
    )
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Ticket price"
    )
    quantity_available = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total number of tickets available for this type"
    )
    quantity_sold = models.PositiveIntegerField(
        default=0,
        help_text="Number of tickets sold for this type"
    )
    
    # Additional ticket type features
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this ticket type is available for purchase"
    )
    sale_start_datetime = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket sales start (optional)"
    )
    sale_end_datetime = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket sales end (optional)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ticket_types'
        verbose_name = 'Ticket Type'
        verbose_name_plural = 'Ticket Types'
        unique_together = ['event', 'name']
        ordering = ['price']
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['is_active']),
            models.Index(fields=['price']),
        ]
    
    def __str__(self):
        return f"{self.event.title} - {self.name} (${self.price})"
    
    def clean(self):
        """Validate ticket type data"""
        from django.core.exceptions import ValidationError
        
        if self.quantity_sold > self.quantity_available:
            raise ValidationError("Quantity sold cannot exceed quantity available")
        
        if self.sale_start_datetime and self.sale_end_datetime:
            if self.sale_start_datetime >= self.sale_end_datetime:
                raise ValidationError("Sale end datetime must be after sale start datetime")
        
        if self.sale_end_datetime and self.event.start_datetime:
            if self.sale_end_datetime > self.event.start_datetime:
                raise ValidationError("Ticket sales must end before event starts")
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def tickets_remaining(self):
        """Get number of tickets remaining for this type"""
        return self.quantity_available - self.quantity_sold
    
    @property
    def is_sold_out(self):
        """Check if this ticket type is sold out"""
        return self.quantity_sold >= self.quantity_available
    
    @property
    def is_on_sale(self):
        """Check if this ticket type is currently on sale"""
        now = timezone.now()
        
        if not self.is_active:
            return False
        
        if self.is_sold_out:
            return False
        
        if self.sale_start_datetime and now < self.sale_start_datetime:
            return False
        
        if self.sale_end_datetime and now > self.sale_end_datetime:
            return False
        
        return True


class Discount(models.Model):
    """Discount model for managing event discounts and promotions"""
    
    DISCOUNT_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed_amount', 'Fixed Amount'),
    ]
    
    DISCOUNT_CATEGORIES = [
        ('promo_code', 'Promo Code'),
        ('early_bird', 'Early Bird'),
        ('group', 'Group Discount'),
        ('student', 'Student Discount'),
        ('senior', 'Senior Discount'),
    ]
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='discounts',
        help_text="Associated event"
    )
    name = models.CharField(max_length=100, help_text="Discount name")
    description = models.TextField(blank=True, help_text="Discount description")
    
    # Discount configuration
    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPES,
        help_text="Type of discount"
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Discount value (percentage or fixed amount)"
    )
    category = models.CharField(
        max_length=20,
        choices=DISCOUNT_CATEGORIES,
        help_text="Discount category"
    )
    
    # Promo code (if applicable)
    promo_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Promo code for discount (if applicable)"
    )
    
    # Usage limits
    max_uses = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of times this discount can be used"
    )
    current_uses = models.PositiveIntegerField(
        default=0,
        help_text="Current number of times this discount has been used"
    )
    
    # Time constraints
    valid_from = models.DateTimeField(help_text="Discount valid from")
    valid_until = models.DateTimeField(help_text="Discount valid until")
    
    # Status
    is_active = models.BooleanField(default=True, help_text="Whether discount is active")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'discounts'
        verbose_name = 'Discount'
        verbose_name_plural = 'Discounts'
        unique_together = ['event', 'promo_code']
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['promo_code']),
            models.Index(fields=['valid_from', 'valid_until']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.event.title} - {self.name}"
    
    def clean(self):
        """Validate discount data"""
        from django.core.exceptions import ValidationError
        
        if self.valid_from >= self.valid_until:
            raise ValidationError("Valid until must be after valid from")
        
        if self.discount_type == 'percentage' and self.discount_value > 100:
            raise ValidationError("Percentage discount cannot exceed 100%")
        
        if self.category == 'promo_code' and not self.promo_code:
            raise ValidationError("Promo code is required for promo code discounts")
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_valid(self):
        """Check if discount is currently valid"""
        now = timezone.now()
        return (
            self.is_active and
            self.valid_from <= now <= self.valid_until and
            (self.max_uses is None or self.current_uses < self.max_uses)
        )
