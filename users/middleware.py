import time
import json
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from .admin_models import AuditLog, UserAction


class AuditLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log user actions and API requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming request"""
        request._audit_start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Process response and log user actions"""
        # Skip logging for certain paths
        skip_paths = [
            '/admin/static/',
            '/static/',
            '/media/',
            '/favicon.ico',
        ]
        
        if any(request.path.startswith(path) for path in skip_paths):
            return response
        
        # Skip logging for non-API requests (unless it's an important action)
        if not request.path.startswith('/api/') and request.method == 'GET':
            return response
        
        # Calculate response time
        response_time = None
        if hasattr(request, '_audit_start_time'):
            response_time = (time.time() - request._audit_start_time) * 1000  # Convert to milliseconds
        
        # Get user information
        user = request.user if hasattr(request, 'user') and not isinstance(request.user, AnonymousUser) else None
        
        # Get request details
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length
        
        # Determine action category and name
        action_category, action_name = self.categorize_action(request)
        
        # Log user action if user is authenticated
        if user and action_category:
            try:
                UserAction.objects.create(
                    user=user,
                    action_category=action_category,
                    action_name=action_name,
                    action_details=self.get_action_details(request),
                    endpoint=request.path,
                    method=request.method,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    response_status=response.status_code,
                    response_time=response_time
                )
            except Exception:
                # Don't let logging errors break the request
                pass
        
        # Log important actions to audit log
        if self.should_audit_log(request, response):
            try:
                self.create_audit_log(request, response, user, ip_address, user_agent)
            except Exception:
                # Don't let logging errors break the request
                pass
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def categorize_action(self, request):
        """Categorize the action based on the request"""
        path = request.path.lower()
        method = request.method
        
        # Authentication actions
        if '/auth/' in path:
            if 'login' in path:
                return 'authentication', 'login'
            elif 'logout' in path:
                return 'authentication', 'logout'
            elif 'register' in path:
                return 'authentication', 'register'
            elif 'password' in path:
                return 'authentication', 'password_change'
            else:
                return 'authentication', f'{method.lower()}_auth'
        
        # Booking actions
        elif '/bookings/' in path:
            if method == 'POST':
                return 'booking', 'create_booking'
            elif method == 'DELETE' or 'cancel' in path:
                return 'booking', 'cancel_booking'
            elif method == 'GET':
                return 'booking', 'view_booking'
            else:
                return 'booking', f'{method.lower()}_booking'
        
        # Payment actions
        elif '/payment/' in path or '/stripe/' in path:
            return 'payment', f'{method.lower()}_payment'
        
        # Search actions
        elif '/search/' in path or 'search' in request.GET:
            return 'search', 'search_content'
        
        # Profile actions
        elif '/profile/' in path:
            return 'profile', f'{method.lower()}_profile'
        
        # Content management
        elif '/events/' in path or '/theaters/' in path or '/movies/' in path:
            if method == 'POST':
                return 'content', 'create_content'
            elif method in ['PUT', 'PATCH']:
                return 'content', 'update_content'
            elif method == 'DELETE':
                return 'content', 'delete_content'
            elif method == 'GET':
                return 'content', 'view_content'
        
        # Admin actions
        elif '/admin/' in path:
            return 'api', f'admin_{method.lower()}'
        
        # API actions
        elif '/api/' in path:
            return 'api', f'{method.lower()}_api'
        
        return None, None
    
    def get_action_details(self, request):
        """Get additional action details"""
        details = {}
        
        # Add query parameters for GET requests
        if request.method == 'GET' and request.GET:
            details['query_params'] = dict(request.GET)
        
        # Add request data for POST/PUT/PATCH (but limit size and exclude sensitive data)
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if hasattr(request, 'data') and request.data:
                    # Filter out sensitive fields
                    sensitive_fields = ['password', 'token', 'secret', 'key']
                    filtered_data = {}
                    for key, value in request.data.items():
                        if not any(field in key.lower() for field in sensitive_fields):
                            # Limit string length
                            if isinstance(value, str) and len(value) > 100:
                                filtered_data[key] = value[:100] + '...'
                            else:
                                filtered_data[key] = value
                    details['request_data'] = filtered_data
            except Exception:
                pass
        
        return details
    
    def should_audit_log(self, request, response):
        """Determine if this action should be logged to audit log"""
        # Log all admin actions
        if '/admin/' in request.path:
            return True
        
        # Log authentication actions
        if '/auth/' in request.path:
            return True
        
        # Log failed requests
        if response.status_code >= 400:
            return True
        
        # Log important state changes
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return True
        
        return False
    
    def create_audit_log(self, request, response, user, ip_address, user_agent):
        """Create audit log entry"""
        # Determine action type
        action_type = 'system'
        if '/auth/' in request.path:
            if 'login' in request.path:
                action_type = 'login'
            elif 'logout' in request.path:
                action_type = 'logout'
        elif request.method == 'POST':
            action_type = 'create'
        elif request.method in ['PUT', 'PATCH']:
            action_type = 'update'
        elif request.method == 'DELETE':
            action_type = 'delete'
        
        # Determine severity
        severity = 'low'
        if response.status_code >= 500:
            severity = 'critical'
        elif response.status_code >= 400:
            severity = 'medium'
        elif '/admin/' in request.path:
            severity = 'medium'
        elif action_type in ['login', 'logout']:
            severity = 'low'
        
        # Create description
        description = f"{request.method} {request.path}"
        if response.status_code >= 400:
            description += f" - HTTP {response.status_code}"
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            action_type=action_type,
            action_description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data={
                'endpoint': request.path,
                'method': request.method,
                'status_code': response.status_code,
                'query_params': dict(request.GET) if request.GET else {}
            },
            severity=severity,
            is_successful=response.status_code < 400
        )


class ContentModerationMiddleware(MiddlewareMixin):
    """
    Middleware to automatically add content to moderation queue
    """
    
    def process_response(self, request, response):
        """Check if content needs moderation"""
        # Only process successful POST requests (content creation)
        if request.method != 'POST' or response.status_code not in [200, 201]:
            return response
        
        # Skip if user is admin
        if (hasattr(request, 'user') and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == 'admin'):
            return response
        
        # Check if this is content creation that needs moderation
        if self.needs_moderation(request):
            try:
                self.add_to_moderation_queue(request, response)
            except Exception:
                # Don't let moderation errors break the request
                pass
        
        return response
    
    def needs_moderation(self, request):
        """Check if the request creates content that needs moderation"""
        moderation_paths = [
            '/api/events/',
            '/api/movies/',
            '/api/reviews/',
        ]
        
        return any(request.path.startswith(path) for path in moderation_paths)
    
    def add_to_moderation_queue(self, request, response):
        """Add created content to moderation queue"""
        from .admin_services import ContentModerationService
        
        # This would need to be implemented based on the specific content type
        # For now, we'll skip the actual implementation as it requires
        # knowing the created object ID from the response
        pass