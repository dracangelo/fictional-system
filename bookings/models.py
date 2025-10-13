# Simplified models file - will be extended after migration
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
import secrets
import string

from movie_booking_app.managers import OptimizedBookingManager
from movie_booking_app.cache_utils import CacheInvalidationMixin


class Booking(CacheInvalidationMixin, models.Model):
    BOOKING_TYPES = [('event', 'Event Booking'), ('movie', 'Movie Booking')]
    PAYMENT_STATUS_CHOICES = [('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('refunded', 'Refunded'), ('partially_refunded', 'Partially Refunded')]
    BOOKING_STATUS_CHOICES = [('pending', 'Pending'), ('confirmed', 'Confirmed'), ('cancelled', 'Cancelled'), ('completed', 'Completed'), ('no_show', 'No Show')]
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    booking_type = models.CharField(max_length=20, choices=BOOKING_TYPES)
    event = models.ForeignKey('events.Event', null=True, blank=True, on_delete=models.CASCADE, related_name='bookings')
    showtime = models.ForeignKey('theaters.Showtime', null=True, blank=True, on_delete=models.CASCADE, related_name='bookings')
    booking_reference = models.CharField(max_length=20, unique=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    applied_discount = models.ForeignKey('events.Discount', null=True, blank=True, on_delete=models.SET_NULL, related_name='bookings')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    booking_status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True)
    payment_transaction_id = models.CharField(max_length=100, blank=True)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20, blank=True)
    special_requests = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager
    objects = OptimizedBookingManager()
    
    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Booking {self.booking_reference} - {self.customer.username}"
    
    @staticmethod
    def generate_booking_reference():
        while True:
            reference = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            if not Booking.objects.filter(booking_reference=reference).exists():
                return reference
    
    def save(self, *args, **kwargs):
        if not self.booking_reference:
            self.booking_reference = self.generate_booking_reference()
        if not self.customer_email and self.customer:
            self.customer_email = self.customer.email
        super().save(*args, **kwargs)
    
    @property
    def ticket_count(self):
        return self.tickets.count()
    
    @property
    def is_refundable(self):
        if self.booking_status in ['cancelled', 'completed', 'no_show']:
            return False
        if self.payment_status not in ['pending', 'completed']:
            return False
        if self.booking_type == 'event' and self.event:
            return self.event.start_datetime > timezone.now()
        elif self.booking_type == 'movie' and self.showtime:
            return self.showtime.start_time > timezone.now()
        return False
    
    @property
    def event_or_showtime_title(self):
        if self.booking_type == 'event' and self.event:
            return self.event.title
        elif self.booking_type == 'movie' and self.showtime:
            return self.showtime.movie.title
        return "Unknown"
    
    @property
    def event_or_showtime_datetime(self):
        if self.booking_type == 'event' and self.event:
            return self.event.start_datetime
        elif self.booking_type == 'movie' and self.showtime:
            return self.showtime.start_time
        return None


class Ticket(CacheInvalidationMixin, models.Model):
    TICKET_STATUS_CHOICES = [('valid', 'Valid'), ('used', 'Used'), ('cancelled', 'Cancelled'), ('expired', 'Expired')]
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='tickets')
    ticket_type = models.ForeignKey('events.TicketType', null=True, blank=True, on_delete=models.CASCADE, related_name='tickets')
    seat_number = models.CharField(max_length=10, blank=True, null=True)
    ticket_number = models.CharField(max_length=50, unique=True)
    qr_code_data = models.TextField()
    qr_code_image = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    status = models.CharField(max_length=20, choices=TICKET_STATUS_CHOICES, default='valid')
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tickets'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.booking.booking_reference}"
    
    @staticmethod
    def generate_ticket_number():
        while True:
            date_part = timezone.now().strftime('%Y%m%d')
            random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            ticket_number = f"TKT-{date_part}-{random_part}"
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        if not self.qr_code_data:
            self.qr_code_data = f"ticket:{self.ticket_number}"
        super().save(*args, **kwargs)
    
    def is_valid_for_use(self):
        if self.status != 'valid':
            return False, f"Ticket status is {self.status}"
        event_datetime = self.booking.event_or_showtime_datetime
        if not event_datetime:
            return False, "No associated event or showtime"
        now = timezone.now()
        entry_allowed_from = event_datetime - timezone.timedelta(minutes=30)
        if now < entry_allowed_from:
            return False, "Too early for entry"
        if self.booking.booking_type == 'event':
            if self.booking.event and now > self.booking.event.end_datetime:
                return False, "Event has ended"
        else:
            late_entry_cutoff = event_datetime + timezone.timedelta(minutes=30)
            if now > late_entry_cutoff:
                return False, "Too late for entry"
        return True, "Valid for entry"
    
    @property
    def event_or_movie_title(self):
        return self.booking.event_or_showtime_title
    
    @property
    def venue_info(self):
        if self.booking.booking_type == 'event' and self.booking.event:
            return f"{self.booking.event.venue}, {self.booking.event.address}"
        elif self.booking.booking_type == 'movie' and self.booking.showtime:
            theater = self.booking.showtime.theater
            return f"{theater.name}, Screen {self.booking.showtime.screen_number}"
        return "Unknown venue"


class CustomerReview(CacheInvalidationMixin, models.Model):
    RATING_CHOICES = [(1, '1 Star'), (2, '2 Stars'), (3, '3 Stars'), (4, '4 Stars'), (5, '5 Stars')]
    
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=RATING_CHOICES)
    review_text = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_reviews'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review by {self.reviewer.username} - {self.rating} stars"
    
    @property
    def target_title(self):
        return self.booking.event_or_showtime_title
    
    @property
    def can_be_edited(self):
        return (timezone.now() - self.created_at).days <= 7


class WaitlistEntry(CacheInvalidationMixin, models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('notified', 'Notified'), ('expired', 'Expired'), ('fulfilled', 'Fulfilled')]
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='waitlist_entries')
    event = models.ForeignKey('events.Event', null=True, blank=True, on_delete=models.CASCADE, related_name='waitlist_entries')
    showtime = models.ForeignKey('theaters.Showtime', null=True, blank=True, on_delete=models.CASCADE, related_name='waitlist_entries')
    ticket_type = models.ForeignKey('events.TicketType', null=True, blank=True, on_delete=models.CASCADE, related_name='waitlist_entries')
    ticket_type_name = models.CharField(max_length=100, blank=True)
    quantity_requested = models.PositiveIntegerField(default=1)
    max_price_willing_to_pay = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notify_email = models.BooleanField(default=True)
    notify_sms = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notification_sent = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'waitlist_entries'
        ordering = ['created_at']
    
    def __str__(self):
        target = self.event.title if self.event else (self.showtime.movie.title if self.showtime else "Unknown")
        return f"Waitlist: {self.customer.username} for {target}"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            if self.event:
                self.expires_at = self.event.start_datetime - timezone.timedelta(hours=24)
            elif self.showtime:
                self.expires_at = self.showtime.start_time - timezone.timedelta(hours=24)
        if not self.ticket_type_name and self.ticket_type:
            self.ticket_type_name = self.ticket_type.name
        super().save(*args, **kwargs)
    
    @property
    def target_title(self):
        if self.event:
            return self.event.title
        elif self.showtime:
            return self.showtime.movie.title
        return "Unknown"
    
    @property
    def target_datetime(self):
        if self.event:
            return self.event.start_datetime
        elif self.showtime:
            return self.showtime.start_time
        return None
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def mark_as_notified(self):
        self.status = 'notified'
        self.notification_sent = True
        self.notification_sent_at = timezone.now()
        self.save()
    
    def mark_as_fulfilled(self):
        self.status = 'fulfilled'
        self.save()
    
    def mark_as_expired(self):
        self.status = 'expired'
        self.save()