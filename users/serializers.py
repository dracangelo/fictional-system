from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
from .models import UserProfile
from movie_booking_app.security import InputSanitizationMixin, SecurityLogger

# Import admin serializers
from .admin_serializers import (
    AdminUserListSerializer,
    AuditLogSerializer,
    ContentModerationSerializer,
    SystemHealthMetricSerializer,
    UserActionSerializer,
    AdminDashboardSummarySerializer,
    UserManagementActionSerializer,
    ContentModerationActionSerializer
)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User Profile Example',
            summary='User profile information',
            description='Complete user profile with preferences and settings',
            value={
                'role': 'customer',
                'phone_number': '+1234567890',
                'preferences': {
                    'notification_settings': {
                        'email': True,
                        'sms': True,
                        'push': True
                    },
                    'favorite_genres': ['action', 'comedy', 'drama'],
                    'preferred_locations': ['downtown', 'mall'],
                    'accessibility_needs': ['wheelchair', 'hearing_assistance']
                },
                'is_verified': True,
                'created_at': '2024-01-15T10:30:00Z',
                'updated_at': '2024-01-15T10:30:00Z'
            },
            response_only=True,
        ),
    ]
)
class UserProfileSerializer(serializers.ModelSerializer, InputSanitizationMixin):
    """
    Serializer for UserProfile model.
    
    Handles user profile information including role, contact details,
    and user preferences for notifications and accessibility.
    """
    
    role = serializers.CharField(
        help_text="User role (customer, event_owner, theater_owner, admin)"
    )
    phone_number = serializers.CharField(
        help_text="User's phone number in international format (e.g., +1234567890)"
    )
    preferences = serializers.JSONField(
        help_text="User preferences including notifications, favorites, and accessibility needs"
    )
    is_verified = serializers.BooleanField(
        read_only=True,
        help_text="Whether the user's account has been verified"
    )
    
    class Meta:
        model = UserProfile
        fields = ['role', 'phone_number', 'preferences', 'is_verified', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'is_verified']
    
    def validate_phone_number(self, value):
        """Validate and sanitize phone number"""
        if value:
            try:
                return self.sanitize_phone(value)
            except ValueError as e:
                raise serializers.ValidationError(str(e))
        return value
    
    def validate_preferences(self, value):
        """Validate and sanitize preferences JSON"""
        if value:
            return self.sanitize_json_field(value)
        return value


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Complete User Information',
            summary='User with profile data',
            description='Complete user information including profile and preferences',
            value={
                'id': 1,
                'username': 'john_doe',
                'email': 'john@example.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'date_joined': '2024-01-15T10:30:00Z',
                'profile': {
                    'role': 'customer',
                    'phone_number': '+1234567890',
                    'preferences': {
                        'notification_settings': {
                            'email': True,
                            'sms': True
                        },
                        'favorite_genres': ['action', 'comedy']
                    },
                    'is_verified': True
                }
            },
            response_only=True,
        ),
    ]
)
class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with profile information.
    
    Provides complete user information including basic account details
    and extended profile information with preferences.
    """
    profile = UserProfileSerializer(read_only=True)
    
    id = serializers.IntegerField(
        read_only=True,
        help_text="Unique user identifier"
    )
    username = serializers.CharField(
        help_text="Unique username for the account"
    )
    email = serializers.EmailField(
        help_text="User's email address"
    )
    first_name = serializers.CharField(
        help_text="User's first name"
    )
    last_name = serializers.CharField(
        help_text="User's last name"
    )
    date_joined = serializers.DateTimeField(
        read_only=True,
        help_text="Date and time when the user joined"
    )
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'profile']
        read_only_fields = ['id', 'date_joined']


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Customer Registration',
            summary='Register a new customer account',
            description='Example registration request for a customer account',
            value={
                'username': 'john_doe',
                'email': 'john@example.com',
                'password': 'SecurePassword123!',
                'password_confirm': 'SecurePassword123!',
                'first_name': 'John',
                'last_name': 'Doe',
                'role': 'customer',
                'phone_number': '+1234567890'
            },
            request_only=True,
        ),
        OpenApiExample(
            'Event Owner Registration',
            summary='Register a new event owner account',
            description='Example registration request for an event owner account',
            value={
                'username': 'event_organizer',
                'email': 'organizer@events.com',
                'password': 'SecurePassword123!',
                'password_confirm': 'SecurePassword123!',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'role': 'event_owner',
                'phone_number': '+1987654321'
            },
            request_only=True,
        ),
    ]
)
class UserRegistrationSerializer(serializers.ModelSerializer, InputSanitizationMixin):
    """
    Serializer for user registration.
    
    Handles new user account creation with role assignment and profile setup.
    Includes comprehensive validation for all user data and security measures.
    """
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password],
        help_text="Password must be at least 8 characters and meet security requirements"
    )
    password_confirm = serializers.CharField(
        write_only=True,
        help_text="Password confirmation (must match password)"
    )
    role = serializers.ChoiceField(
        choices=UserProfile.USER_ROLES, 
        default='customer',
        help_text="User role: customer, event_owner, theater_owner, or admin"
    )
    phone_number = serializers.CharField(
        max_length=15, 
        required=False, 
        allow_blank=True,
        help_text="Phone number in international format (optional)"
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'role', 'phone_number']
        extra_kwargs = {
            'email': {'required': True, 'help_text': 'Valid email address (required)'},
            'first_name': {'required': True, 'help_text': 'User\'s first name (required)'},
            'last_name': {'required': True, 'help_text': 'User\'s last name (required)'},
            'username': {'help_text': 'Unique username (letters, numbers, dots, hyphens, underscores only)'},
        }
    
    def validate_email(self, value):
        """Validate and sanitize email"""
        try:
            sanitized_email = self.sanitize_email(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        
        if User.objects.filter(email=sanitized_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return sanitized_email
    
    def validate_username(self, value):
        """Validate and sanitize username"""
        sanitized_username = self.sanitize_string(value, max_length=150)
        
        # Additional username validation
        import re
        if not re.match(r'^[a-zA-Z0-9_.-]+$', sanitized_username):
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, dots, hyphens, and underscores"
            )
        
        if User.objects.filter(username=sanitized_username).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return sanitized_username
    
    def validate_first_name(self, value):
        """Validate and sanitize first name"""
        return self.sanitize_string(value, max_length=30)
    
    def validate_last_name(self, value):
        """Validate and sanitize last name"""
        return self.sanitize_string(value, max_length=30)
    
    def validate_phone_number(self, value):
        """Validate and sanitize phone number"""
        if value:
            try:
                return self.sanitize_phone(value)
            except ValueError as e:
                raise serializers.ValidationError(str(e))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Password and password confirmation do not match.")
        return attrs
    
    def create(self, validated_data):
        """Create user with profile"""
        # Remove fields that don't belong to User model
        role = validated_data.pop('role', 'customer')
        phone_number = validated_data.pop('phone_number', '')
        validated_data.pop('password_confirm')
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Update profile with additional information
        profile = user.profile
        profile.role = role
        profile.phone_number = phone_number
        profile.save()
        
        return user


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Login with Username',
            summary='Login using username',
            description='Login request using username and password',
            value={
                'username': 'john_doe',
                'password': 'SecurePassword123!'
            },
            request_only=True,
        ),
        OpenApiExample(
            'Login with Email',
            summary='Login using email',
            description='Login request using email address and password',
            value={
                'username': 'john@example.com',
                'password': 'SecurePassword123!'
            },
            request_only=True,
        ),
    ]
)
class UserLoginSerializer(serializers.Serializer, InputSanitizationMixin):
    """
    Serializer for user login.
    
    Handles user authentication using either username or email address.
    Includes security logging for failed login attempts and account status validation.
    """
    username = serializers.CharField(
        help_text="Username or email address"
    )
    password = serializers.CharField(
        write_only=True,
        help_text="User password"
    )
    
    def validate_username(self, value):
        """Validate and sanitize username"""
        return self.sanitize_string(value, max_length=150)
    
    def validate(self, attrs):
        """Validate user credentials"""
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            # Try to authenticate with username or email
            user = authenticate(username=username, password=password)
            
            if not user:
                # Try with email if username authentication failed
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass
            
            if not user:
                # Log failed login attempt
                request = self.context.get('request')
                ip_address = None
                if request:
                    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                    if x_forwarded_for:
                        ip_address = x_forwarded_for.split(',')[0].strip()
                    else:
                        ip_address = request.META.get('REMOTE_ADDR')
                
                SecurityLogger.log_failed_login(username, ip_address)
                raise serializers.ValidationError("Invalid credentials.")
            
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError("Must include username and password.")


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_old_password(self, value):
        """Validate old password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
    
    def validate(self, attrs):
        """Validate new password confirmation"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New password and confirmation do not match.")
        return attrs
    
    def save(self):
        """Change user password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email')
    
    class Meta:
        model = UserProfile
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'preferences']
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        user = self.instance.user
        if User.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def update(self, instance, validated_data):
        """Update user and profile"""
        user_data = validated_data.pop('user', {})
        
        # Update user fields
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance