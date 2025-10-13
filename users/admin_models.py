from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
import json


class AuditLog(models.Model):
    """Audit logging system for tracking all system actions"""
    
    ACTION_TYPES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('permission_change', 'Permission Change'),
        ('status_change', 'Status Change'),
        ('payment', 'Payment'),
        ('booking', 'Booking'),
        ('cancellation', 'Cancellation'),
        ('moderation', 'Content Moderation'),
        ('system', 'System Action'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    # User who performed the action (null for system actions)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text="User who performed the action"
    )
    
    # Action details
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPES,
        help_text="Type of action performed"
    )
    action_description = models.TextField(help_text="Detailed description of the action")
    
    # Target object (generic foreign key)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Additional context
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which action was performed"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string"
    )
    session_key = models.CharField(
        max_length=40,
        blank=True,
        help_text="Session key"
    )
    
    # Action metadata
    old_values = models.JSONField(
        default=dict,
        blank=True,
        help_text="Previous values before the action"
    )
    new_values = models.JSONField(
        default=dict,
        blank=True,
        help_text="New values after the action"
    )
    additional_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context data"
    )
    
    # Severity and status
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_LEVELS,
        default='low',
        help_text="Severity level of the action"
    )
    is_successful = models.BooleanField(
        default=True,
        help_text="Whether the action was successful"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if action failed"
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the action occurred"
    )
    
    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['action_type']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['severity']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'System'
        return f"{user_str} - {self.get_action_type_display()} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
    
    @classmethod
    def log_action(cls, user=None, action_type='system', description='', 
                   target_object=None, ip_address=None, user_agent='',
                   session_key='', old_values=None, new_values=None,
                   additional_data=None, severity='low', is_successful=True,
                   error_message=''):
        """
        Convenience method to create audit log entries
        """
        return cls.objects.create(
            user=user,
            action_type=action_type,
            action_description=description,
            content_object=target_object,
            ip_address=ip_address,
            user_agent=user_agent,
            session_key=session_key,
            old_values=old_values or {},
            new_values=new_values or {},
            additional_data=additional_data or {},
            severity=severity,
            is_successful=is_successful,
            error_message=error_message
        )


class ContentModerationQueue(models.Model):
    """Content moderation system for event and movie approval"""
    
    CONTENT_TYPES = [
        ('event', 'Event'),
        ('movie', 'Movie'),
        ('review', 'Customer Review'),
        ('user_profile', 'User Profile'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('flagged', 'Flagged for Review'),
        ('auto_approved', 'Auto Approved'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Content being moderated (generic foreign key)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="Type of content being moderated"
    )
    object_id = models.PositiveIntegerField(help_text="ID of the content object")
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Content details
    content_category = models.CharField(
        max_length=20,
        choices=CONTENT_TYPES,
        help_text="Category of content"
    )
    content_title = models.CharField(
        max_length=200,
        help_text="Title or name of the content"
    )
    content_description = models.TextField(
        blank=True,
        help_text="Description or excerpt of the content"
    )
    
    # Submitter information
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='submitted_content',
        help_text="User who submitted the content"
    )
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the content was submitted"
    )
    
    # Moderation details
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current moderation status"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_LEVELS,
        default='medium',
        help_text="Priority level for moderation"
    )
    
    # Moderator information
    moderator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_content',
        help_text="Admin who moderated the content"
    )
    moderated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the content was moderated"
    )
    moderation_notes = models.TextField(
        blank=True,
        help_text="Notes from the moderator"
    )
    
    # Flags and reasons
    flagged_reasons = models.JSONField(
        default=list,
        blank=True,
        help_text="Reasons why content was flagged"
    )
    auto_moderation_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Automated moderation score (0-1)"
    )
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'content_moderation_queue'
        verbose_name = 'Content Moderation Queue'
        verbose_name_plural = 'Content Moderation Queue'
        ordering = ['-priority', '-submitted_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['submitted_by']),
            models.Index(fields=['moderator']),
            models.Index(fields=['content_category']),
            models.Index(fields=['submitted_at']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.content_category.title()}: {self.content_title} - {self.get_status_display()}"
    
    def approve(self, moderator, notes=''):
        """Approve the content"""
        self.status = 'approved'
        self.moderator = moderator
        self.moderated_at = timezone.now()
        self.moderation_notes = notes
        self.save()
        
        # Log the moderation action
        AuditLog.log_action(
            user=moderator,
            action_type='moderation',
            description=f'Approved {self.content_category}: {self.content_title}',
            target_object=self.content_object,
            additional_data={'moderation_notes': notes},
            severity='medium'
        )
    
    def reject(self, moderator, notes=''):
        """Reject the content"""
        self.status = 'rejected'
        self.moderator = moderator
        self.moderated_at = timezone.now()
        self.moderation_notes = notes
        self.save()
        
        # Log the moderation action
        AuditLog.log_action(
            user=moderator,
            action_type='moderation',
            description=f'Rejected {self.content_category}: {self.content_title}',
            target_object=self.content_object,
            additional_data={'moderation_notes': notes},
            severity='medium'
        )
    
    def flag(self, reasons=None, notes=''):
        """Flag the content for further review"""
        self.status = 'flagged'
        self.moderation_notes = notes
        if reasons:
            self.flagged_reasons = reasons
        self.save()


class SystemHealthMetric(models.Model):
    """System health monitoring and reporting"""
    
    METRIC_TYPES = [
        ('database', 'Database Performance'),
        ('api_response', 'API Response Time'),
        ('memory_usage', 'Memory Usage'),
        ('cpu_usage', 'CPU Usage'),
        ('disk_usage', 'Disk Usage'),
        ('active_users', 'Active Users'),
        ('concurrent_bookings', 'Concurrent Bookings'),
        ('error_rate', 'Error Rate'),
        ('payment_success_rate', 'Payment Success Rate'),
        ('notification_delivery', 'Notification Delivery'),
    ]
    
    STATUS_LEVELS = [
        ('healthy', 'Healthy'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('down', 'Down'),
    ]
    
    # Metric identification
    metric_type = models.CharField(
        max_length=30,
        choices=METRIC_TYPES,
        help_text="Type of metric being tracked"
    )
    metric_name = models.CharField(
        max_length=100,
        help_text="Specific name of the metric"
    )
    
    # Metric values
    value = models.FloatField(help_text="Current metric value")
    unit = models.CharField(
        max_length=20,
        blank=True,
        help_text="Unit of measurement (ms, %, MB, etc.)"
    )
    
    # Thresholds
    warning_threshold = models.FloatField(
        null=True,
        blank=True,
        help_text="Warning threshold value"
    )
    critical_threshold = models.FloatField(
        null=True,
        blank=True,
        help_text="Critical threshold value"
    )
    
    # Status
    status = models.CharField(
        max_length=10,
        choices=STATUS_LEVELS,
        default='healthy',
        help_text="Current status based on thresholds"
    )
    
    # Additional data
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metric metadata"
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the metric was recorded"
    )
    
    class Meta:
        db_table = 'system_health_metrics'
        verbose_name = 'System Health Metric'
        verbose_name_plural = 'System Health Metrics'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['metric_type']),
            models.Index(fields=['metric_name']),
            models.Index(fields=['status']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.metric_name}: {self.value}{self.unit} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        """Override save to automatically determine status based on thresholds"""
        if self.critical_threshold and self.value >= self.critical_threshold:
            self.status = 'critical'
        elif self.warning_threshold and self.value >= self.warning_threshold:
            self.status = 'warning'
        else:
            self.status = 'healthy'
        
        super().save(*args, **kwargs)
    
    @classmethod
    def record_metric(cls, metric_type, metric_name, value, unit='',
                     warning_threshold=None, critical_threshold=None,
                     metadata=None):
        """
        Convenience method to record a system health metric
        """
        return cls.objects.create(
            metric_type=metric_type,
            metric_name=metric_name,
            value=value,
            unit=unit,
            warning_threshold=warning_threshold,
            critical_threshold=critical_threshold,
            metadata=metadata or {}
        )


class UserAction(models.Model):
    """Track user actions for analytics and security"""
    
    ACTION_CATEGORIES = [
        ('authentication', 'Authentication'),
        ('booking', 'Booking'),
        ('search', 'Search'),
        ('profile', 'Profile Management'),
        ('content', 'Content Management'),
        ('payment', 'Payment'),
        ('notification', 'Notification'),
        ('api', 'API Access'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tracked_actions',
        help_text="User who performed the action"
    )
    
    # Action details
    action_category = models.CharField(
        max_length=20,
        choices=ACTION_CATEGORIES,
        help_text="Category of action"
    )
    action_name = models.CharField(
        max_length=100,
        help_text="Specific action name"
    )
    action_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional action details"
    )
    
    # Request details
    endpoint = models.CharField(
        max_length=200,
        blank=True,
        help_text="API endpoint accessed"
    )
    method = models.CharField(
        max_length=10,
        blank=True,
        help_text="HTTP method used"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string"
    )
    
    # Response details
    response_status = models.IntegerField(
        null=True,
        blank=True,
        help_text="HTTP response status code"
    )
    response_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Response time in milliseconds"
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the action occurred"
    )
    
    class Meta:
        db_table = 'user_actions'
        verbose_name = 'User Action'
        verbose_name_plural = 'User Actions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['action_category']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['endpoint']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.action_name} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"