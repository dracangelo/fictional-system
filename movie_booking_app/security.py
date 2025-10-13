"""
Security configuration and utilities for the movie booking app
"""
import time
import hashlib
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
import logging

logger = logging.getLogger(__name__)


class CustomUserRateThrottle(UserRateThrottle):
    """Custom rate throttle for authenticated users"""
    scope = 'user'


class CustomAnonRateThrottle(AnonRateThrottle):
    """Custom rate throttle for anonymous users"""
    scope = 'anon'


class LoginRateThrottle(UserRateThrottle):
    """Special rate throttle for login attempts"""
    scope = 'login'


class BookingRateThrottle(UserRateThrottle):
    """Special rate throttle for booking operations"""
    scope = 'booking'


class RateLimitMiddleware(MiddlewareMixin):
    """
    Advanced rate limiting middleware with different limits for different endpoints
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
        # Rate limits per endpoint type (requests per minute)
        self.rate_limits = {
            'auth': {'authenticated': 10, 'anonymous': 5},
            'booking': {'authenticated': 20, 'anonymous': 0},  # No anonymous bookings
            'search': {'authenticated': 60, 'anonymous': 30},
            'api': {'authenticated': 100, 'anonymous': 20},
            'admin': {'authenticated': 50, 'anonymous': 0},
        }
    
    def process_request(self, request):
        """Check rate limits before processing request"""
        # Skip rate limiting for certain paths
        skip_paths = ['/admin/static/', '/static/', '/media/', '/favicon.ico']
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Determine endpoint type
        endpoint_type = self.get_endpoint_type(request.path)
        if not endpoint_type:
            return None
        
        # Get client identifier
        client_id = self.get_client_identifier(request)
        
        # Check if user is authenticated
        is_authenticated = (hasattr(request, 'user') and 
                          not isinstance(request.user, AnonymousUser) and 
                          request.user.is_authenticated)
        
        # Get rate limit for this endpoint and user type
        user_type = 'authenticated' if is_authenticated else 'anonymous'
        rate_limit = self.rate_limits.get(endpoint_type, {}).get(user_type, 0)
        
        if rate_limit == 0:
            # No access allowed
            return JsonResponse({
                'error': {
                    'code': 'ACCESS_DENIED',
                    'message': 'Access denied for this endpoint'
                }
            }, status=403)
        
        # Check rate limit
        if self.is_rate_limited(client_id, endpoint_type, rate_limit):
            return JsonResponse({
                'error': {
                    'code': 'RATE_LIMIT_EXCEEDED',
                    'message': f'Rate limit exceeded. Maximum {rate_limit} requests per minute allowed.',
                    'retry_after': 60
                }
            }, status=429)
        
        return None
    
    def get_endpoint_type(self, path):
        """Determine the endpoint type from the path"""
        if '/api/auth/' in path:
            return 'auth'
        elif '/api/bookings/' in path:
            return 'booking'
        elif '/api/search/' in path or 'search' in path:
            return 'search'
        elif '/api/admin/' in path:
            return 'admin'
        elif '/api/' in path:
            return 'api'
        return None
    
    def get_client_identifier(self, request):
        """Get unique identifier for the client"""
        # Use user ID if authenticated, otherwise use IP
        if (hasattr(request, 'user') and 
            not isinstance(request.user, AnonymousUser) and 
            request.user.is_authenticated):
            return f"user_{request.user.id}"
        else:
            ip = self.get_client_ip(request)
            return f"ip_{ip}"
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip
    
    def is_rate_limited(self, client_id, endpoint_type, rate_limit):
        """Check if client has exceeded rate limit"""
        cache_key = f"rate_limit_{endpoint_type}_{client_id}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= rate_limit:
            return True
        
        # Increment count
        cache.set(cache_key, current_count + 1, 60)  # 60 seconds TTL
        return False


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add security headers to all responses
    """
    
    def process_response(self, request, response):
        """Add security headers to response"""
        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:; "
            "connect-src 'self' https://api.stripe.com; "
            "frame-src https://js.stripe.com https://hooks.stripe.com;"
        )
        
        # X-Content-Type-Options
        response['X-Content-Type-Options'] = 'nosniff'
        
        # X-Frame-Options
        response['X-Frame-Options'] = 'DENY'
        
        # X-XSS-Protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response['Permissions-Policy'] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(self), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # HSTS (only in production)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


class InputSanitizationMixin:
    """
    Mixin to provide input sanitization methods
    """
    
    @staticmethod
    def sanitize_string(value, max_length=None, allow_html=False):
        """Sanitize string input"""
        if not isinstance(value, str):
            return value
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # Trim whitespace
        value = value.strip()
        
        # Limit length
        if max_length and len(value) > max_length:
            value = value[:max_length]
        
        # Remove HTML if not allowed
        if not allow_html:
            import html
            value = html.escape(value)
        
        return value
    
    @staticmethod
    def sanitize_email(email):
        """Sanitize email input"""
        if not isinstance(email, str):
            return email
        
        email = email.strip().lower()
        
        # Basic email validation
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")
        
        return email
    
    @staticmethod
    def sanitize_phone(phone):
        """Sanitize phone number input"""
        if not isinstance(phone, str):
            return phone
        
        # Remove all non-digit characters except +
        import re
        phone = re.sub(r'[^\d+]', '', phone)
        
        # Validate phone number format
        if not re.match(r'^\+?[\d]{10,15}$', phone):
            raise ValueError("Invalid phone number format")
        
        return phone
    
    @staticmethod
    def sanitize_json_field(data):
        """Sanitize JSON field data"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                # Sanitize key
                if isinstance(key, str):
                    key = InputSanitizationMixin.sanitize_string(key, max_length=100)
                
                # Sanitize value
                if isinstance(value, str):
                    value = InputSanitizationMixin.sanitize_string(value, max_length=1000)
                elif isinstance(value, dict):
                    value = InputSanitizationMixin.sanitize_json_field(value)
                elif isinstance(value, list):
                    value = [InputSanitizationMixin.sanitize_string(item, max_length=500) 
                            if isinstance(item, str) else item for item in value]
                
                sanitized[key] = value
            return sanitized
        
        return data


def validate_file_upload(uploaded_file):
    """
    Validate uploaded files for security
    """
    # Check file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if uploaded_file.size > max_size:
        raise ValueError("File size exceeds maximum allowed size (10MB)")
    
    # Check file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp4', '.mov', '.avi']
    file_extension = uploaded_file.name.lower().split('.')[-1] if '.' in uploaded_file.name else ''
    if f'.{file_extension}' not in allowed_extensions:
        raise ValueError(f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}")
    
    # Check MIME type
    import mimetypes
    mime_type, _ = mimetypes.guess_type(uploaded_file.name)
    allowed_mime_types = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ]
    if mime_type not in allowed_mime_types:
        raise ValueError("Invalid file type")
    
    # Scan file content for malicious patterns
    uploaded_file.seek(0)
    file_content = uploaded_file.read(1024)  # Read first 1KB
    uploaded_file.seek(0)  # Reset file pointer
    
    # Check for script tags or other suspicious content
    suspicious_patterns = [b'<script', b'javascript:', b'<?php', b'<%']
    for pattern in suspicious_patterns:
        if pattern in file_content.lower():
            raise ValueError("File contains suspicious content")
    
    return True


def generate_secure_filename(original_filename):
    """
    Generate a secure filename for uploaded files
    """
    import uuid
    import os
    
    # Get file extension
    _, ext = os.path.splitext(original_filename)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())
    timestamp = str(int(time.time()))
    
    # Create secure filename
    secure_filename = f"{timestamp}_{unique_id}{ext}"
    
    return secure_filename


class SecurityLogger:
    """
    Centralized security event logging
    """
    
    @staticmethod
    def log_security_event(event_type, message, user=None, ip_address=None, severity='medium'):
        """Log security events"""
        logger.warning(f"SECURITY EVENT [{event_type}]: {message}", extra={
            'user': user.username if user else 'anonymous',
            'ip_address': ip_address,
            'severity': severity,
            'event_type': event_type
        })
    
    @staticmethod
    def log_failed_login(username, ip_address):
        """Log failed login attempts"""
        SecurityLogger.log_security_event(
            'FAILED_LOGIN',
            f"Failed login attempt for username: {username}",
            ip_address=ip_address,
            severity='medium'
        )
    
    @staticmethod
    def log_rate_limit_exceeded(client_id, endpoint, ip_address):
        """Log rate limit violations"""
        SecurityLogger.log_security_event(
            'RATE_LIMIT_EXCEEDED',
            f"Rate limit exceeded for client {client_id} on endpoint {endpoint}",
            ip_address=ip_address,
            severity='low'
        )
    
    @staticmethod
    def log_suspicious_activity(activity_type, details, user=None, ip_address=None):
        """Log suspicious activities"""
        SecurityLogger.log_security_event(
            'SUSPICIOUS_ACTIVITY',
            f"{activity_type}: {details}",
            user=user,
            ip_address=ip_address,
            severity='high'
        )