"""
Custom exception classes for the Movie Booking App.

This module defines a hierarchy of custom exceptions that provide
structured error handling throughout the application.
"""

from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger('movie_booking_app.exceptions')


class MovieBookingAppException(Exception):
    """
    Base exception for all Movie Booking App errors.
    
    Attributes:
        message: Human-readable error message
        code: Machine-readable error code
        details: Additional error details
        status_code: HTTP status code for API responses
    """
    
    def __init__(
        self, 
        message: str = "An error occurred", 
        code: str = "GENERAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary format for API responses."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }


class ValidationError(MovieBookingAppException):
    """Raised when data validation fails."""
    
    def __init__(self, message: str = "Validation failed", field_errors: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details={"field_errors": field_errors or {}},
            status_code=status.HTTP_400_BAD_REQUEST
        )


class AuthenticationError(MovieBookingAppException):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthorizationError(MovieBookingAppException):
    """Raised when authorization fails."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN
        )


class NotFoundError(MovieBookingAppException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, message: str = "Resource not found", resource_type: str = "resource"):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            details={"resource_type": resource_type},
            status_code=status.HTTP_404_NOT_FOUND
        )


class ConflictError(MovieBookingAppException):
    """Raised when there's a conflict with the current state."""
    
    def __init__(self, message: str = "Conflict detected", conflict_type: str = "general"):
        super().__init__(
            message=message,
            code="CONFLICT_ERROR",
            details={"conflict_type": conflict_type},
            status_code=status.HTTP_409_CONFLICT
        )


class BookingError(MovieBookingAppException):
    """Base class for booking-related errors."""
    
    def __init__(self, message: str, code: str = "BOOKING_ERROR", **kwargs):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_400_BAD_REQUEST,
            **kwargs
        )


class SeatUnavailableError(BookingError):
    """Raised when requested seats are not available."""
    
    def __init__(self, unavailable_seats: list, suggested_alternatives: Optional[list] = None):
        message = f"Seats {', '.join(unavailable_seats)} are no longer available"
        details = {
            "unavailable_seats": unavailable_seats,
            "suggested_alternatives": suggested_alternatives or []
        }
        super().__init__(
            message=message,
            code="SEAT_UNAVAILABLE",
            details=details
        )


class TicketUnavailableError(BookingError):
    """Raised when requested tickets are not available."""
    
    def __init__(self, ticket_type: str, requested_quantity: int, available_quantity: int):
        message = f"Only {available_quantity} {ticket_type} tickets available, {requested_quantity} requested"
        details = {
            "ticket_type": ticket_type,
            "requested_quantity": requested_quantity,
            "available_quantity": available_quantity
        }
        super().__init__(
            message=message,
            code="TICKET_UNAVAILABLE",
            details=details
        )


class BookingExpiredError(BookingError):
    """Raised when a booking has expired."""
    
    def __init__(self, booking_reference: str):
        super().__init__(
            message=f"Booking {booking_reference} has expired",
            code="BOOKING_EXPIRED",
            details={"booking_reference": booking_reference}
        )


class PaymentError(MovieBookingAppException):
    """Base class for payment-related errors."""
    
    def __init__(self, message: str, code: str = "PAYMENT_ERROR", **kwargs):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            **kwargs
        )


class PaymentProcessingError(PaymentError):
    """Raised when payment processing fails."""
    
    def __init__(self, payment_intent_id: str, reason: str):
        super().__init__(
            message=f"Payment processing failed: {reason}",
            code="PAYMENT_PROCESSING_ERROR",
            details={
                "payment_intent_id": payment_intent_id,
                "reason": reason
            }
        )


class RefundError(PaymentError):
    """Raised when refund processing fails."""
    
    def __init__(self, booking_reference: str, reason: str):
        super().__init__(
            message=f"Refund processing failed: {reason}",
            code="REFUND_ERROR",
            details={
                "booking_reference": booking_reference,
                "reason": reason
            }
        )


class WebhookError(PaymentError):
    """Raised when webhook processing fails."""
    
    def __init__(self, webhook_type: str, reason: str):
        super().__init__(
            message=f"Webhook processing failed: {reason}",
            code="WEBHOOK_ERROR",
            details={
                "webhook_type": webhook_type,
                "reason": reason
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class NotificationError(MovieBookingAppException):
    """Base class for notification-related errors."""
    
    def __init__(self, message: str, code: str = "NOTIFICATION_ERROR", **kwargs):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            **kwargs
        )


class EmailDeliveryError(NotificationError):
    """Raised when email delivery fails."""
    
    def __init__(self, recipient: str, reason: str):
        super().__init__(
            message=f"Email delivery failed to {recipient}: {reason}",
            code="EMAIL_DELIVERY_ERROR",
            details={
                "recipient": recipient,
                "reason": reason
            }
        )


class SMSDeliveryError(NotificationError):
    """Raised when SMS delivery fails."""
    
    def __init__(self, phone_number: str, reason: str):
        super().__init__(
            message=f"SMS delivery failed to {phone_number}: {reason}",
            code="SMS_DELIVERY_ERROR",
            details={
                "phone_number": phone_number,
                "reason": reason
            }
        )


class ExternalServiceError(MovieBookingAppException):
    """Raised when external service integration fails."""
    
    def __init__(self, service_name: str, reason: str, is_transient: bool = False):
        super().__init__(
            message=f"External service '{service_name}' error: {reason}",
            code="EXTERNAL_SERVICE_ERROR",
            details={
                "service_name": service_name,
                "reason": reason,
                "is_transient": is_transient
            },
            status_code=status.HTTP_502_BAD_GATEWAY if is_transient else status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class RateLimitExceededError(MovieBookingAppException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, limit: int, window: str, retry_after: int):
        super().__init__(
            message=f"Rate limit exceeded: {limit} requests per {window}",
            code="RATE_LIMIT_EXCEEDED",
            details={
                "limit": limit,
                "window": window,
                "retry_after": retry_after
            },
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )


class SystemMaintenanceError(MovieBookingAppException):
    """Raised when system is under maintenance."""
    
    def __init__(self, maintenance_window: str):
        super().__init__(
            message="System is currently under maintenance",
            code="SYSTEM_MAINTENANCE",
            details={"maintenance_window": maintenance_window},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    
    This handler provides structured error responses for both
    custom exceptions and standard Django/DRF exceptions.
    """
    
    # Get the standard error response first
    response = exception_handler(exc, context)
    
    # Handle custom exceptions
    if isinstance(exc, MovieBookingAppException):
        logger.error(
            f"Custom exception occurred: {exc.__class__.__name__}",
            extra={
                'exception_type': exc.__class__.__name__,
                'message': exc.message,
                'code': exc.code,
                'details': exc.details,
                'request_path': context.get('request').path if context.get('request') else None,
                'user': str(context.get('request').user) if context.get('request') and hasattr(context.get('request'), 'user') else None,
                'traceback': traceback.format_exc()
            }
        )
        
        return Response(
            exc.to_dict(),
            status=exc.status_code
        )
    
    # Handle standard exceptions with custom formatting
    if response is not None:
        custom_response_data = {
            "error": {
                "code": "VALIDATION_ERROR" if response.status_code == 400 else "ERROR",
                "message": "Request validation failed" if response.status_code == 400 else "An error occurred",
                "details": response.data,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
        
        # Log the error
        logger.error(
            f"Standard exception occurred: {exc.__class__.__name__}",
            extra={
                'exception_type': exc.__class__.__name__,
                'status_code': response.status_code,
                'response_data': response.data,
                'request_path': context.get('request').path if context.get('request') else None,
                'user': str(context.get('request').user) if context.get('request') and hasattr(context.get('request'), 'user') else None,
                'traceback': traceback.format_exc()
            }
        )
        
        response.data = custom_response_data
    
    return response