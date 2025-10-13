"""
Error handling middleware for the Movie Booking App.

This middleware integrates error monitoring and recovery into
the Django request/response cycle.
"""

import logging
import time
import uuid
from typing import Optional
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from rest_framework import status

from movie_booking_app.exceptions import (
    MovieBookingAppException,
    SystemMaintenanceError,
    RateLimitExceededError
)
from movie_booking_app.error_monitoring import error_monitor
from movie_booking_app.error_recovery import recovery_manager

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(MiddlewareMixin):
    """
    Middleware for comprehensive error handling and monitoring.
    
    This middleware:
    1. Adds request IDs for tracing
    2. Monitors errors and exceptions
    3. Attempts automatic recovery for transient failures
    4. Provides structured error responses
    5. Logs security and performance metrics
    """
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """
        Process incoming request.
        
        Args:
            request: Django HTTP request
            
        Returns:
            HttpResponse if request should be blocked, None otherwise
        """
        # Add unique request ID for tracing
        request.id = str(uuid.uuid4())
        request.start_time = time.time()
        
        # Check for system maintenance
        if self._is_maintenance_mode():
            return self._maintenance_response()
        
        # Log request start
        logger.info(
            f"Request started: {request.method} {request.path}",
            extra={
                'request_id': request.id,
                'method': request.method,
                'path': request.path,
                'user': str(request.user) if hasattr(request, 'user') else 'anonymous',
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'source_ip': self._get_client_ip(request)
            }
        )
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Process outgoing response.
        
        Args:
            request: Django HTTP request
            response: Django HTTP response
            
        Returns:
            Modified HTTP response
        """
        # Calculate request duration
        duration_ms = (time.time() - getattr(request, 'start_time', time.time())) * 1000
        
        # Log response
        logger.info(
            f"Request completed: {request.method} {request.path} - {response.status_code}",
            extra={
                'request_id': getattr(request, 'id', 'unknown'),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': duration_ms,
                'user': str(request.user) if hasattr(request, 'user') else 'anonymous'
            }
        )
        
        # Log performance metrics for slow requests
        if duration_ms > getattr(settings, 'SLOW_REQUEST_THRESHOLD_MS', 1000):
            performance_logger = logging.getLogger('movie_booking_app.performance')
            performance_logger.warning(
                f"Slow request detected: {request.method} {request.path}",
                extra={
                    'request_id': getattr(request, 'id', 'unknown'),
                    'duration_ms': duration_ms,
                    'endpoint': request.path,
                    'method': request.method,
                    'status_code': response.status_code,
                    'user': str(request.user) if hasattr(request, 'user') else 'anonymous'
                }
            )
        
        # Add request ID to response headers for debugging
        if hasattr(request, 'id'):
            response['X-Request-ID'] = request.id
        
        return response
    
    def process_exception(self, request: HttpRequest, exception: Exception) -> Optional[HttpResponse]:
        """
        Process unhandled exceptions.
        
        Args:
            request: Django HTTP request
            exception: Unhandled exception
            
        Returns:
            HttpResponse if exception should be handled, None otherwise
        """
        request_id = getattr(request, 'id', 'unknown')
        
        # Log the exception
        logger.error(
            f"Unhandled exception in request {request_id}: {exception.__class__.__name__}",
            extra={
                'request_id': request_id,
                'exception_type': exception.__class__.__name__,
                'exception_message': str(exception),
                'request_path': request.path,
                'request_method': request.method,
                'user': str(request.user) if hasattr(request, 'user') else 'anonymous',
                'source_ip': self._get_client_ip(request)
            },
            exc_info=True
        )
        
        # Record error for monitoring
        error_type = exception.__class__.__name__
        error_details = {
            'request_id': request_id,
            'request_path': request.path,
            'request_method': request.method,
            'user': str(request.user) if hasattr(request, 'user') else 'anonymous',
            'exception_message': str(exception)
        }
        
        error_monitor.record_error(error_type, error_details)
        
        # Attempt recovery for transient failures
        if self._is_transient_error(exception):
            recovery_attempted = recovery_manager.attempt_recovery(error_type, error_details)
            
            if recovery_attempted:
                logger.info(
                    f"Recovery attempted for {error_type} in request {request_id}",
                    extra={
                        'request_id': request_id,
                        'error_type': error_type,
                        'recovery_attempted': True
                    }
                )
        
        # Handle custom exceptions
        if isinstance(exception, MovieBookingAppException):
            return JsonResponse(
                exception.to_dict(),
                status=exception.status_code
            )
        
        # For API requests, return structured error response
        if self._is_api_request(request):
            return self._api_error_response(exception, request_id)
        
        # Let Django handle other exceptions normally
        return None
    
    def _is_maintenance_mode(self) -> bool:
        """Check if system is in maintenance mode."""
        return getattr(settings, 'MAINTENANCE_MODE', False)
    
    def _maintenance_response(self) -> HttpResponse:
        """Return maintenance mode response."""
        maintenance_window = getattr(settings, 'MAINTENANCE_WINDOW', 'Unknown')
        
        exc = SystemMaintenanceError(maintenance_window)
        return JsonResponse(
            exc.to_dict(),
            status=exc.status_code
        )
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or 'unknown'
    
    def _is_transient_error(self, exception: Exception) -> bool:
        """Check if exception represents a transient failure."""
        transient_exceptions = (
            ConnectionError,
            TimeoutError,
            # Add other transient exception types as needed
        )
        
        transient_error_messages = [
            'connection',
            'timeout',
            'temporary',
            'unavailable'
        ]
        
        # Check exception type
        if isinstance(exception, transient_exceptions):
            return True
        
        # Check exception message for transient keywords
        exception_message = str(exception).lower()
        return any(keyword in exception_message for keyword in transient_error_messages)
    
    def _is_api_request(self, request: HttpRequest) -> bool:
        """Check if request is an API request."""
        return (
            request.path.startswith('/api/') or
            request.content_type == 'application/json' or
            'application/json' in request.META.get('HTTP_ACCEPT', '')
        )
    
    def _api_error_response(self, exception: Exception, request_id: str) -> JsonResponse:
        """Generate structured API error response."""
        error_data = {
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "details": {
                    "request_id": request_id,
                    "exception_type": exception.__class__.__name__
                },
                "timestamp": time.time()
            }
        }
        
        # Don't expose sensitive error details in production
        if settings.DEBUG:
            error_data["error"]["details"]["exception_message"] = str(exception)
        
        return JsonResponse(error_data, status=500)


class SecurityLoggingMiddleware(MiddlewareMixin):
    """
    Middleware for security event logging.
    
    Logs security-relevant events such as authentication attempts,
    authorization failures, and suspicious activities.
    """
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Process request for security logging."""
        # Log authentication attempts
        if request.path in ['/api/auth/login/', '/api/auth/register/']:
            self._log_security_event(
                request,
                action='authentication_attempt',
                outcome='initiated'
            )
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """Process response for security logging."""
        # Log authentication results
        if request.path == '/api/auth/login/':
            outcome = 'success' if response.status_code == 200 else 'failed'
            self._log_security_event(
                request,
                action='login',
                outcome=outcome,
                status_code=response.status_code
            )
        
        # Log authorization failures
        if response.status_code == 403:
            self._log_security_event(
                request,
                action='authorization_check',
                outcome='denied',
                resource=request.path
            )
        
        # Log suspicious activities
        if response.status_code == 429:  # Rate limit exceeded
            self._log_security_event(
                request,
                action='rate_limit_exceeded',
                outcome='blocked',
                resource=request.path
            )
        
        return response
    
    def _log_security_event(self, request: HttpRequest, action: str, outcome: str, **kwargs):
        """Log security event."""
        security_logger = logging.getLogger('movie_booking_app.security')
        
        security_logger.warning(
            f"Security event: {action} - {outcome}",
            extra={
                'action': action,
                'outcome': outcome,
                'source_ip': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'user': str(request.user) if hasattr(request, 'user') else 'anonymous',
                'request_id': getattr(request, 'id', 'unknown'),
                'path': request.path,
                'method': request.method,
                **kwargs
            }
        )
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or 'unknown'


class HealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware for health check endpoints.
    
    Provides system health information without full request processing.
    """
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """Process health check requests."""
        if request.path == '/health/':
            return self._health_check_response()
        
        if request.path == '/health/ready/':
            return self._readiness_check_response()
        
        if request.path == '/health/live/':
            return self._liveness_check_response()
        
        return None
    
    def _health_check_response(self) -> JsonResponse:
        """Return comprehensive health check response."""
        from movie_booking_app.error_recovery import health_checker
        
        try:
            health_status = health_checker.check_system_health()
            status_code = 200 if health_status['overall_status'] == 'healthy' else 503
            
            return JsonResponse(health_status, status=status_code)
        
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return JsonResponse(
                {
                    'overall_status': 'error',
                    'error': str(e),
                    'timestamp': time.time()
                },
                status=500
            )
    
    def _readiness_check_response(self) -> JsonResponse:
        """Return readiness check response."""
        # Check if application is ready to serve requests
        try:
            from django.db import connection
            connection.ensure_connection()
            
            return JsonResponse({'status': 'ready'}, status=200)
        
        except Exception as e:
            return JsonResponse(
                {'status': 'not_ready', 'error': str(e)},
                status=503
            )
    
    def _liveness_check_response(self) -> JsonResponse:
        """Return liveness check response."""
        # Simple liveness check - if we can respond, we're alive
        return JsonResponse({'status': 'alive'}, status=200)