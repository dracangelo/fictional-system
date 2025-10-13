from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class NotificationTemplate(models.Model):
    """Template for different types of notifications"""
    NOTIFICATION_TYPES = [
        ('booking_confirmation', 'Booking Confirmation'),
        ('booking_reminder', 'Booking Reminder'),
        ('booking_cancellation', 'Booking Cancellation'),
        ('event_update', 'Event Update'),
        ('system_maintenance', 'System Maintenance'),
        ('payment_success', 'Payment Success'),
        ('payment_failed', 'Payment Failed'),
    ]
    
    CHANNEL_TYPES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
    ]
    
    name = models.CharField(max_length=100)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    channel = models.CharField(max_length=20, choices=CHANNEL_TYPES)
    subject = models.CharField(max_length=200, blank=True)  # For email
    template_content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['notification_type', 'channel']
    
    def __str__(self):
        return f"{self.name} - {self.channel}"


class NotificationPreference(models.Model):
    """User preferences for notifications"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    
    # Specific notification type preferences
    booking_confirmation_email = models.BooleanField(default=True)
    booking_confirmation_sms = models.BooleanField(default=True)
    booking_reminder_email = models.BooleanField(default=True)
    booking_reminder_sms = models.BooleanField(default=True)
    booking_cancellation_email = models.BooleanField(default=True)
    booking_cancellation_sms = models.BooleanField(default=False)
    event_update_email = models.BooleanField(default=True)
    event_update_sms = models.BooleanField(default=False)
    system_maintenance_email = models.BooleanField(default=True)
    system_maintenance_sms = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification preferences for {self.user.username}"


class NotificationLog(models.Model):
    """Log of sent notifications"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('delivered', 'Delivered'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=50)
    channel = models.CharField(max_length=20)
    recipient = models.CharField(max_length=200)  # email or phone number
    subject = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    
    # Generic foreign key to link to any model (booking, event, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} to {self.recipient} - {self.status}"