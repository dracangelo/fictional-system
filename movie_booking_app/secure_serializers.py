"""
Secure serializers with input validation and sanitization
"""
from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from .security import InputSanitizationMixin, validate_file_upload, generate_secure_filename
import re


class SecureSerializerMixin(InputSanitizationMixin):
    """
    Mixin to add security features to serializers
    """
    
    def validate_string_field(self, value, field_name, max_length=None, allow_html=False):
        """Validate and sanitize string fields"""
        if value is None:
            return value
        
        if not isinstance(value, str):
            raise serializers.ValidationError(f"{field_name} must be a string")
        
        # Sanitize the value
        try:
            sanitized_value = self.sanitize_string(value, max_length, allow_html)
        except Exception as e:
            raise serializers.ValidationError(f"Invalid {field_name}: {str(e)}")
        
        return sanitized_value
    
    def validate_email_field(self, value, field_name='email'):
        """Validate and sanitize email fields"""
        if value is None:
            return value
        
        try:
            sanitized_email = self.sanitize_email(value)
        except ValueError as e:
            raise serializers.ValidationError(f"Invalid {field_name}: {str(e)}")
        
        return sanitized_email
    
    def validate_phone_field(self, value, field_name='phone'):
        """Validate and sanitize phone fields"""
        if value is None:
            return value
        
        try:
            sanitized_phone = self.sanitize_phone(value)
        except ValueError as e:
            raise serializers.ValidationError(f"Invalid {field_name}: {str(e)}")
        
        return sanitized_phone
    
    def validate_json_field(self, value, field_name):
        """Validate and sanitize JSON fields"""
        if value is None:
            return value
        
        if not isinstance(value, (dict, list)):
            raise serializers.ValidationError(f"{field_name} must be a valid JSON object or array")
        
        try:
            sanitized_value = self.sanitize_json_field(value)
        except Exception as e:
            raise serializers.ValidationError(f"Invalid {field_name}: {str(e)}")
        
        return sanitized_value
    
    def validate_file_field(self, value, field_name='file'):
        """Validate uploaded files"""
        if value is None:
            return value
        
        try:
            validate_file_upload(value)
        except ValueError as e:
            raise serializers.ValidationError(f"Invalid {field_name}: {str(e)}")
        
        return value


class SecureUserRegistrationSerializer(serializers.ModelSerializer, SecureSerializerMixin):
    """Secure user registration serializer"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate_username(self, value):
        """Validate username"""
        value = self.validate_string_field(value, 'username', max_length=150)
        
        # Check for valid username pattern
        if not re.match(r'^[a-zA-Z0-9_.-]+$', value):
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, dots, hyphens, and underscores"
            )
        
        return value
    
    def validate_email(self, value):
        """Validate email"""
        return self.validate_email_field(value)
    
    def validate_first_name(self, value):
        """Validate first name"""
        return self.validate_string_field(value, 'first_name', max_length=30)
    
    def validate_last_name(self, value):
        """Validate last name"""
        return self.validate_string_field(value, 'last_name', max_length=30)
    
    def validate_password(self, value):
        """Validate password strength"""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter")
        
        # Check for at least one digit
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one digit")
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character")
        
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        
        return attrs
    
    def create(self, validated_data):
        """Create user with validated data"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class SecureEventSerializer(serializers.Serializer, SecureSerializerMixin):
    """Secure event serializer"""
    
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    venue = serializers.CharField(max_length=200)
    address = serializers.CharField()
    category = serializers.CharField(max_length=50)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    media = serializers.JSONField(required=False, default=list)
    
    def validate_title(self, value):
        """Validate event title"""
        return self.validate_string_field(value, 'title', max_length=200)
    
    def validate_description(self, value):
        """Validate event description"""
        return self.validate_string_field(value, 'description', max_length=2000)
    
    def validate_venue(self, value):
        """Validate venue"""
        return self.validate_string_field(value, 'venue', max_length=200)
    
    def validate_address(self, value):
        """Validate address"""
        return self.validate_string_field(value, 'address', max_length=500)
    
    def validate_category(self, value):
        """Validate category"""
        value = self.validate_string_field(value, 'category', max_length=50)
        
        # Validate against allowed categories
        allowed_categories = [
            'concert', 'theater', 'sports', 'conference', 'workshop',
            'festival', 'comedy', 'dance', 'exhibition', 'other'
        ]
        
        if value.lower() not in allowed_categories:
            raise serializers.ValidationError(f"Category must be one of: {', '.join(allowed_categories)}")
        
        return value.lower()
    
    def validate_media(self, value):
        """Validate media JSON field"""
        return self.validate_json_field(value, 'media')
    
    def validate(self, attrs):
        """Validate event dates"""
        if attrs['start_datetime'] >= attrs['end_datetime']:
            raise serializers.ValidationError("End datetime must be after start datetime")
        
        return attrs


class SecureBookingSerializer(serializers.Serializer, SecureSerializerMixin):
    """Secure booking serializer"""
    
    event_id = serializers.IntegerField(required=False)
    showtime_id = serializers.IntegerField(required=False)
    seat_numbers = serializers.ListField(
        child=serializers.CharField(max_length=10),
        required=False,
        default=list
    )
    ticket_type_id = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=1, max_value=10, required=False)
    
    def validate_seat_numbers(self, value):
        """Validate seat numbers"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Seat numbers must be a list")
        
        # Validate each seat number
        validated_seats = []
        for seat in value:
            if not isinstance(seat, str):
                raise serializers.ValidationError("Each seat number must be a string")
            
            # Validate seat format (e.g., A1, B12, etc.)
            if not re.match(r'^[A-Z]\d{1,2}$', seat.upper()):
                raise serializers.ValidationError(f"Invalid seat format: {seat}")
            
            validated_seats.append(seat.upper())
        
        # Check for duplicates
        if len(validated_seats) != len(set(validated_seats)):
            raise serializers.ValidationError("Duplicate seat numbers not allowed")
        
        return validated_seats
    
    def validate(self, attrs):
        """Validate booking data"""
        # Must have either event_id or showtime_id
        if not attrs.get('event_id') and not attrs.get('showtime_id'):
            raise serializers.ValidationError("Either event_id or showtime_id is required")
        
        # Cannot have both event_id and showtime_id
        if attrs.get('event_id') and attrs.get('showtime_id'):
            raise serializers.ValidationError("Cannot specify both event_id and showtime_id")
        
        # For movie bookings, seat_numbers are required
        if attrs.get('showtime_id') and not attrs.get('seat_numbers'):
            raise serializers.ValidationError("Seat numbers are required for movie bookings")
        
        # For event bookings, ticket_type_id and quantity are required
        if attrs.get('event_id') and not attrs.get('ticket_type_id'):
            raise serializers.ValidationError("Ticket type is required for event bookings")
        
        if attrs.get('event_id') and not attrs.get('quantity'):
            raise serializers.ValidationError("Quantity is required for event bookings")
        
        return attrs


class SecureFileUploadSerializer(serializers.Serializer, SecureSerializerMixin):
    """Secure file upload serializer"""
    
    file = serializers.FileField()
    description = serializers.CharField(max_length=500, required=False)
    
    def validate_file(self, value):
        """Validate uploaded file"""
        return self.validate_file_field(value)
    
    def validate_description(self, value):
        """Validate file description"""
        if value:
            return self.validate_string_field(value, 'description', max_length=500)
        return value
    
    def save(self, **kwargs):
        """Save file with secure filename"""
        file = self.validated_data['file']
        
        # Generate secure filename
        secure_filename = generate_secure_filename(file.name)
        file.name = secure_filename
        
        return file


class SecureSearchSerializer(serializers.Serializer, SecureSerializerMixin):
    """Secure search serializer"""
    
    query = serializers.CharField(max_length=200, required=False)
    category = serializers.CharField(max_length=50, required=False)
    location = serializers.CharField(max_length=200, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    price_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    price_max = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    
    def validate_query(self, value):
        """Validate search query"""
        if value:
            return self.validate_string_field(value, 'query', max_length=200)
        return value
    
    def validate_category(self, value):
        """Validate category filter"""
        if value:
            return self.validate_string_field(value, 'category', max_length=50)
        return value
    
    def validate_location(self, value):
        """Validate location filter"""
        if value:
            return self.validate_string_field(value, 'location', max_length=200)
        return value
    
    def validate(self, attrs):
        """Validate search parameters"""
        # Validate date range
        if attrs.get('date_from') and attrs.get('date_to'):
            if attrs['date_from'] > attrs['date_to']:
                raise serializers.ValidationError("date_from must be before date_to")
        
        # Validate price range
        if attrs.get('price_min') and attrs.get('price_max'):
            if attrs['price_min'] > attrs['price_max']:
                raise serializers.ValidationError("price_min must be less than price_max")
        
        return attrs