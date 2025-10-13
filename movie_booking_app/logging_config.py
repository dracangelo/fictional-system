"""
Comprehensive logging configuration for the Movie Booking App.

This module provides structured logging with different handlers for
various types of events and errors.
"""

import os
import logging
import logging.handlers
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
import json


class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured JSON logs.
    """
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add extra fields if they exist
        if hasattr(record, 'user'):
            log_entry['user'] = record.user
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'request_path'):
            log_entry['request_path'] = record.request_path
        if hasattr(record, 'exception_type'):
            log_entry['exception_type'] = record.exception_type
        if hasattr(record, 'details'):
            log_entry['details'] = record.details
        if hasattr(record, 'traceback'):
            log_entry['traceback'] = record.traceback
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, default=str)


class SecurityFormatter(logging.Formatter):
    """
    Specialized formatter for security-related logs.
    """
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'event_type': 'security',
            'severity': record.levelname,
            'message': record.getMessage(),
            'source_ip': getattr(record, 'source_ip', None),
            'user_agent': getattr(record, 'user_agent', None),
            'user': getattr(record, 'user', None),
            'action': getattr(record, 'action', None),
            'resource': getattr(record, 'resource', None),
            'outcome': getattr(record, 'outcome', None),
        }
        
        return json.dumps(log_entry, default=str)


class PerformanceFormatter(logging.Formatter):
    """
    Specialized formatter for performance-related logs.
    """
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'event_type': 'performance',
            'message': record.getMessage(),
            'duration_ms': getattr(record, 'duration_ms', None),
            'endpoint': getattr(record, 'endpoint', None),
            'method': getattr(record, 'method', None),
            'status_code': getattr(record, 'status_code', None),
            'user': getattr(record, 'user', None),
            'query_count': getattr(record, 'query_count', None),
            'cache_hits': getattr(record, 'cache_hits', None),
        }
        
        return json.dumps(log_entry, default=str)


def get_logging_config(base_dir: Path, debug: bool = False) -> Dict[str, Any]:
    """
    Generate comprehensive logging configuration.
    
    Args:
        base_dir: Base directory for log files
        debug: Whether debug logging is enabled
    
    Returns:
        Dictionary containing logging configuration
    """
    
    # Create logs directory if it doesn't exist
    logs_dir = base_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    # Determine log levels
    root_level = 'DEBUG' if debug else 'INFO'
    django_level = 'INFO' if debug else 'WARNING'
    
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'simple': {
                'format': '{levelname} {message}',
                'style': '{',
            },
            'structured': {
                '()': StructuredFormatter,
            },
            'security': {
                '()': SecurityFormatter,
            },
            'performance': {
                '()': PerformanceFormatter,
            },
        },
        'handlers': {
            'console': {
                'level': 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
            'file_general': {
                'level': root_level,
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'general.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 5,
                'formatter': 'structured',
            },
            'file_error': {
                'level': 'ERROR',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'error.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 10,
                'formatter': 'structured',
            },
            'file_security': {
                'level': 'WARNING',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'security.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 10,
                'formatter': 'security',
            },
            'file_performance': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'performance.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 5,
                'formatter': 'performance',
            },
            'file_audit': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'audit.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 20,  # Keep more audit logs
                'formatter': 'structured',
            },
            'file_booking': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'booking.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 10,
                'formatter': 'structured',
            },
            'file_payment': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'payment.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 15,  # Keep more payment logs for compliance
                'formatter': 'structured',
            },
            'file_notification': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': logs_dir / 'notification.log',
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 5,
                'formatter': 'structured',
            },
        },
        'loggers': {
            # Root logger
            '': {
                'handlers': ['console', 'file_general'],
                'level': root_level,
                'propagate': False,
            },
            # Django framework loggers
            'django': {
                'handlers': ['console', 'file_general'],
                'level': django_level,
                'propagate': False,
            },
            'django.request': {
                'handlers': ['file_error', 'console'],
                'level': 'ERROR',
                'propagate': False,
            },
            'django.security': {
                'handlers': ['file_security', 'console'],
                'level': 'WARNING',
                'propagate': False,
            },
            'django.db.backends': {
                'handlers': ['file_general'],
                'level': 'DEBUG' if debug else 'INFO',
                'propagate': False,
            },
            # Application-specific loggers
            'movie_booking_app': {
                'handlers': ['console', 'file_general', 'file_error'],
                'level': 'INFO',
                'propagate': False,
            },
            'movie_booking_app.exceptions': {
                'handlers': ['file_error', 'console'],
                'level': 'ERROR',
                'propagate': False,
            },
            'movie_booking_app.security': {
                'handlers': ['file_security', 'console'],
                'level': 'WARNING',
                'propagate': False,
            },
            'movie_booking_app.performance': {
                'handlers': ['file_performance'],
                'level': 'INFO',
                'propagate': False,
            },
            'movie_booking_app.audit': {
                'handlers': ['file_audit'],
                'level': 'INFO',
                'propagate': False,
            },
            # Business logic loggers
            'bookings': {
                'handlers': ['file_booking', 'file_general'],
                'level': 'INFO',
                'propagate': False,
            },
            'bookings.payment': {
                'handlers': ['file_payment', 'file_error'],
                'level': 'INFO',
                'propagate': False,
            },
            'notifications': {
                'handlers': ['file_notification', 'file_general'],
                'level': 'INFO',
                'propagate': False,
            },
            'events': {
                'handlers': ['file_general'],
                'level': 'INFO',
                'propagate': False,
            },
            'theaters': {
                'handlers': ['file_general'],
                'level': 'INFO',
                'propagate': False,
            },
            'users': {
                'handlers': ['file_general', 'file_audit'],
                'level': 'INFO',
                'propagate': False,
            },
            # Third-party loggers
            'celery': {
                'handlers': ['file_general'],
                'level': 'INFO',
                'propagate': False,
            },
            'stripe': {
                'handlers': ['file_payment'],
                'level': 'INFO',
                'propagate': False,
            },
        },
    }
    
    return config


class LoggerMixin:
    """
    Mixin class to add structured logging capabilities to any class.
    """
    
    @property
    def logger(self):
        """Get logger instance for this class."""
        if not hasattr(self, '_logger'):
            self._logger = logging.getLogger(f"{self.__module__}.{self.__class__.__name__}")
        return self._logger
    
    def log_info(self, message: str, **kwargs):
        """Log info message with extra context."""
        self.logger.info(message, extra=kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message with extra context."""
        self.logger.warning(message, extra=kwargs)
    
    def log_error(self, message: str, **kwargs):
        """Log error message with extra context."""
        self.logger.error(message, extra=kwargs)
    
    def log_security_event(self, action: str, outcome: str, **kwargs):
        """Log security-related event."""
        security_logger = logging.getLogger('movie_booking_app.security')
        security_logger.warning(
            f"Security event: {action}",
            extra={
                'action': action,
                'outcome': outcome,
                **kwargs
            }
        )
    
    def log_audit_event(self, action: str, resource: str, **kwargs):
        """Log audit event."""
        audit_logger = logging.getLogger('movie_booking_app.audit')
        audit_logger.info(
            f"Audit: {action} on {resource}",
            extra={
                'action': action,
                'resource': resource,
                **kwargs
            }
        )
    
    def log_performance_metric(self, operation: str, duration_ms: float, **kwargs):
        """Log performance metric."""
        performance_logger = logging.getLogger('movie_booking_app.performance')
        performance_logger.info(
            f"Performance: {operation} took {duration_ms}ms",
            extra={
                'operation': operation,
                'duration_ms': duration_ms,
                **kwargs
            }
        )