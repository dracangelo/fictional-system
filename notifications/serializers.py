from rest_framework import serializers
from .models import NotificationPreference, NotificationLog, NotificationTemplate


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'email_enabled',
            'sms_enabled',
            'push_enabled',
            'booking_confirmation_email',
            'booking_confirmation_sms',
            'booking_reminder_email',
            'booking_reminder_sms',
            'booking_cancellation_email',
            'booking_cancellation_sms',
            'event_update_email',
            'event_update_sms',
            'system_maintenance_email',
            'system_maintenance_sms',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """Validate notification preferences"""
        # If email is disabled, disable all email notifications
        if not data.get('email_enabled', True):
            email_fields = [field for field in data.keys() if field.endswith('_email')]
            for field in email_fields:
                data[field] = False
        
        # If SMS is disabled, disable all SMS notifications
        if not data.get('sms_enabled', True):
            sms_fields = [field for field in data.keys() if field.endswith('_sms')]
            for field in sms_fields:
                data[field] = False
        
        return data


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification logs"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = [
            'id',
            'user_email',
            'notification_type',
            'channel',
            'recipient',
            'subject',
            'status',
            'error_message',
            'sent_at',
            'created_at',
        ]
        read_only_fields = ['id', 'user_email', 'created_at']


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates"""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'notification_type',
            'channel',
            'subject',
            'template_content',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BulkNotificationSerializer(serializers.Serializer):
    """Serializer for sending bulk notifications"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of user IDs to send notifications to"
    )
    notification_type = serializers.CharField(
        max_length=50,
        help_text="Type of notification to send"
    )
    context_data = serializers.DictField(
        help_text="Context data for template rendering"
    )
    channels = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of channels to send to (email, sms)"
    )
    
    def validate_notification_type(self, value):
        """Validate notification type exists"""
        valid_types = [choice[0] for choice in NotificationTemplate.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid notification type. Must be one of: {valid_types}")
        return value
    
    def validate_channels(self, value):
        """Validate channels"""
        if value:
            valid_channels = ['email', 'sms', 'push']
            for channel in value:
                if channel not in valid_channels:
                    raise serializers.ValidationError(f"Invalid channel: {channel}. Must be one of: {valid_channels}")
        return value


class TestNotificationSerializer(serializers.Serializer):
    """Serializer for testing notifications"""
    notification_type = serializers.CharField(
        max_length=50,
        help_text="Type of notification to test"
    )
    channel = serializers.CharField(
        max_length=20,
        help_text="Channel to test (email or sms)"
    )
    context_data = serializers.DictField(
        required=False,
        default=dict,
        help_text="Context data for template rendering"
    )
    
    def validate_notification_type(self, value):
        """Validate notification type exists"""
        valid_types = [choice[0] for choice in NotificationTemplate.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid notification type. Must be one of: {valid_types}")
        return value
    
    def validate_channel(self, value):
        """Validate channel"""
        valid_channels = ['email', 'sms']
        if value not in valid_channels:
            raise serializers.ValidationError(f"Invalid channel. Must be one of: {valid_channels}")
        return value