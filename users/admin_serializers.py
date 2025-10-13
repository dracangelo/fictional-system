from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile
from .admin_models import AuditLog, ContentModerationQueue, SystemHealthMetric, UserAction


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer for admin user list with profile information"""
    
    profile = serializers.SerializerMethodField()
    last_login_formatted = serializers.SerializerMethodField()
    date_joined_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'last_login',
            'date_joined', 'profile', 'last_login_formatted', 
            'date_joined_formatted'
        ]
    
    def get_profile(self, obj):
        """Get user profile information"""
        if hasattr(obj, 'profile'):
            return {
                'role': obj.profile.role,
                'role_display': obj.profile.get_role_display(),
                'phone_number': obj.profile.phone_number,
                'is_verified': obj.profile.is_verified,
                'created_at': obj.profile.created_at,
                'updated_at': obj.profile.updated_at
            }
        return None
    
    def get_last_login_formatted(self, obj):
        """Get formatted last login date"""
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_date_joined_formatted(self, obj):
        """Get formatted date joined"""
        return obj.date_joined.strftime('%Y-%m-%d %H:%M:%S')


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries"""
    
    user_display = serializers.SerializerMethodField()
    timestamp_formatted = serializers.SerializerMethodField()
    content_object_display = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_display', 'action_type', 'action_description',
            'content_type', 'object_id', 'content_object_display', 'ip_address',
            'user_agent', 'session_key', 'old_values', 'new_values',
            'additional_data', 'severity', 'is_successful', 'error_message',
            'timestamp', 'timestamp_formatted'
        ]
    
    def get_user_display(self, obj):
        """Get user display name"""
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': obj.user.email
            }
        return None
    
    def get_timestamp_formatted(self, obj):
        """Get formatted timestamp"""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    
    def get_content_object_display(self, obj):
        """Get content object display information"""
        if obj.content_object:
            return {
                'type': obj.content_type.model,
                'id': obj.object_id,
                'display': str(obj.content_object)
            }
        return None


class ContentModerationSerializer(serializers.ModelSerializer):
    """Serializer for content moderation queue items"""
    
    submitted_by_display = serializers.SerializerMethodField()
    moderator_display = serializers.SerializerMethodField()
    submitted_at_formatted = serializers.SerializerMethodField()
    moderated_at_formatted = serializers.SerializerMethodField()
    content_object_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentModerationQueue
        fields = [
            'id', 'content_type', 'object_id', 'content_category',
            'content_title', 'content_description', 'submitted_by',
            'submitted_by_display', 'submitted_at', 'submitted_at_formatted',
            'status', 'priority', 'moderator', 'moderator_display',
            'moderated_at', 'moderated_at_formatted', 'moderation_notes',
            'flagged_reasons', 'auto_moderation_score', 'updated_at',
            'content_object_display'
        ]
    
    def get_submitted_by_display(self, obj):
        """Get submitter display information"""
        return {
            'id': obj.submitted_by.id,
            'username': obj.submitted_by.username,
            'email': obj.submitted_by.email
        }
    
    def get_moderator_display(self, obj):
        """Get moderator display information"""
        if obj.moderator:
            return {
                'id': obj.moderator.id,
                'username': obj.moderator.username,
                'email': obj.moderator.email
            }
        return None
    
    def get_submitted_at_formatted(self, obj):
        """Get formatted submission date"""
        return obj.submitted_at.strftime('%Y-%m-%d %H:%M:%S')
    
    def get_moderated_at_formatted(self, obj):
        """Get formatted moderation date"""
        if obj.moderated_at:
            return obj.moderated_at.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_content_object_display(self, obj):
        """Get content object display information"""
        if obj.content_object:
            return {
                'type': obj.content_type.model,
                'id': obj.object_id,
                'display': str(obj.content_object)
            }
        return None


class SystemHealthMetricSerializer(serializers.ModelSerializer):
    """Serializer for system health metrics"""
    
    timestamp_formatted = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemHealthMetric
        fields = [
            'id', 'metric_type', 'metric_name', 'value', 'unit',
            'warning_threshold', 'critical_threshold', 'status',
            'status_display', 'metadata', 'timestamp', 'timestamp_formatted'
        ]
    
    def get_timestamp_formatted(self, obj):
        """Get formatted timestamp"""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    
    def get_status_display(self, obj):
        """Get status display name"""
        return obj.get_status_display()


class UserActionSerializer(serializers.ModelSerializer):
    """Serializer for user actions"""
    
    user_display = serializers.SerializerMethodField()
    timestamp_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = UserAction
        fields = [
            'id', 'user', 'user_display', 'action_category', 'action_name',
            'action_details', 'endpoint', 'method', 'ip_address', 'user_agent',
            'response_status', 'response_time', 'timestamp', 'timestamp_formatted'
        ]
    
    def get_user_display(self, obj):
        """Get user display information"""
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email
        }
    
    def get_timestamp_formatted(self, obj):
        """Get formatted timestamp"""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')


class AdminDashboardSummarySerializer(serializers.Serializer):
    """Serializer for admin dashboard summary data"""
    
    overview = serializers.DictField()
    moderation = serializers.DictField()
    system_health = serializers.DictField()
    alerts = serializers.DictField()
    generated_at = serializers.DateTimeField()


class UserManagementActionSerializer(serializers.Serializer):
    """Serializer for user management actions"""
    
    action = serializers.ChoiceField(choices=['update_status', 'update_role'])
    is_active = serializers.BooleanField(required=False)
    role = serializers.ChoiceField(
        choices=UserProfile.USER_ROLES,
        required=False
    )
    
    def validate(self, data):
        """Validate action-specific fields"""
        action = data.get('action')
        
        if action == 'update_status' and 'is_active' not in data:
            raise serializers.ValidationError(
                "is_active field is required for update_status action"
            )
        
        if action == 'update_role' and 'role' not in data:
            raise serializers.ValidationError(
                "role field is required for update_role action"
            )
        
        return data


class ContentModerationActionSerializer(serializers.Serializer):
    """Serializer for content moderation actions"""
    
    action = serializers.ChoiceField(choices=['approve', 'reject', 'flag'])
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    reasons = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )
    
    def validate(self, data):
        """Validate action-specific fields"""
        action = data.get('action')
        
        if action == 'flag' and not data.get('reasons'):
            raise serializers.ValidationError(
                "reasons field is required for flag action"
            )
        
        return data