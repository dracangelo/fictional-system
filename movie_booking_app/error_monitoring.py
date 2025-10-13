"""
Error monitoring and alerting system for the Movie Booking App.

This module provides error tracking, alerting, and recovery mechanisms
for production issues.
"""

import logging
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
try:
    import smtplib
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
except ImportError:
    # Handle import issues in some environments
    smtplib = None
    MimeText = None
    MimeMultipart = None
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ErrorMetric:
    """Represents an error metric for monitoring."""
    error_type: str
    count: int = 0
    last_occurrence: Optional[datetime] = None
    first_occurrence: Optional[datetime] = None
    recent_errors: deque = field(default_factory=lambda: deque(maxlen=100))
    
    def increment(self, error_details: Dict[str, Any] = None):
        """Increment error count and update timestamps."""
        self.count += 1
        now = timezone.now()
        
        if self.first_occurrence is None:
            self.first_occurrence = now
        
        self.last_occurrence = now
        
        if error_details:
            self.recent_errors.append({
                'timestamp': now,
                'details': error_details
            })


@dataclass
class AlertRule:
    """Defines conditions for triggering alerts."""
    name: str
    error_type: str
    threshold: int
    time_window_minutes: int
    severity: AlertSeverity
    cooldown_minutes: int = 30
    last_triggered: Optional[datetime] = None
    
    def should_trigger(self, error_count: int) -> bool:
        """Check if alert should be triggered."""
        # Check cooldown period
        if self.last_triggered:
            cooldown_end = self.last_triggered + timedelta(minutes=self.cooldown_minutes)
            if timezone.now() < cooldown_end:
                return False
        
        return error_count >= self.threshold
    
    def trigger(self):
        """Mark alert as triggered."""
        self.last_triggered = timezone.now()


class ErrorMonitor:
    """
    Centralized error monitoring system.
    
    Tracks error patterns, triggers alerts, and provides
    recovery mechanisms for transient failures.
    """
    
    def __init__(self):
        self.error_metrics: Dict[str, ErrorMetric] = defaultdict(ErrorMetric)
        self.alert_rules: List[AlertRule] = []
        self.alert_handlers: List[Callable] = []
        self.recovery_handlers: Dict[str, Callable] = {}
        self._lock = threading.Lock()
        self._setup_default_rules()
    
    def _setup_default_rules(self):
        """Setup default alert rules."""
        self.alert_rules = [
            AlertRule(
                name="High Error Rate",
                error_type="*",  # Any error type
                threshold=50,
                time_window_minutes=5,
                severity=AlertSeverity.HIGH
            ),
            AlertRule(
                name="Payment Processing Errors",
                error_type="PAYMENT_PROCESSING_ERROR",
                threshold=5,
                time_window_minutes=10,
                severity=AlertSeverity.CRITICAL
            ),
            AlertRule(
                name="Database Connection Errors",
                error_type="DATABASE_ERROR",
                threshold=3,
                time_window_minutes=5,
                severity=AlertSeverity.CRITICAL
            ),
            AlertRule(
                name="External Service Errors",
                error_type="EXTERNAL_SERVICE_ERROR",
                threshold=10,
                time_window_minutes=15,
                severity=AlertSeverity.MEDIUM
            ),
            AlertRule(
                name="Authentication Failures",
                error_type="AUTHENTICATION_ERROR",
                threshold=20,
                time_window_minutes=10,
                severity=AlertSeverity.HIGH
            ),
            AlertRule(
                name="Booking Conflicts",
                error_type="SEAT_UNAVAILABLE",
                threshold=30,
                time_window_minutes=5,
                severity=AlertSeverity.MEDIUM
            ),
        ]
    
    def record_error(self, error_type: str, error_details: Dict[str, Any] = None):
        """
        Record an error occurrence.
        
        Args:
            error_type: Type/code of the error
            error_details: Additional error details
        """
        with self._lock:
            # Update error metrics
            if error_type not in self.error_metrics:
                self.error_metrics[error_type] = ErrorMetric(error_type=error_type)
            
            self.error_metrics[error_type].increment(error_details)
            
            # Check alert rules
            self._check_alert_rules(error_type)
            
            # Log the error
            logger.error(
                f"Error recorded: {error_type}",
                extra={
                    'error_type': error_type,
                    'error_details': error_details,
                    'total_count': self.error_metrics[error_type].count
                }
            )
    
    def _check_alert_rules(self, error_type: str):
        """Check if any alert rules should be triggered."""
        current_time = timezone.now()
        
        for rule in self.alert_rules:
            # Check if rule applies to this error type
            if rule.error_type != "*" and rule.error_type != error_type:
                continue
            
            # Count errors in the time window
            error_count = self._count_errors_in_window(
                error_type if rule.error_type != "*" else None,
                rule.time_window_minutes
            )
            
            # Check if alert should be triggered
            if rule.should_trigger(error_count):
                self._trigger_alert(rule, error_type, error_count)
    
    def _count_errors_in_window(self, error_type: Optional[str], window_minutes: int) -> int:
        """Count errors within a time window."""
        cutoff_time = timezone.now() - timedelta(minutes=window_minutes)
        count = 0
        
        if error_type:
            # Count specific error type
            if error_type in self.error_metrics:
                metric = self.error_metrics[error_type]
                for error in metric.recent_errors:
                    if error['timestamp'] >= cutoff_time:
                        count += 1
        else:
            # Count all error types
            for metric in self.error_metrics.values():
                for error in metric.recent_errors:
                    if error['timestamp'] >= cutoff_time:
                        count += 1
        
        return count
    
    def _trigger_alert(self, rule: AlertRule, error_type: str, error_count: int):
        """Trigger an alert."""
        rule.trigger()
        
        alert_data = {
            'rule_name': rule.name,
            'error_type': error_type,
            'error_count': error_count,
            'time_window': rule.time_window_minutes,
            'severity': rule.severity.value,
            'timestamp': timezone.now()
        }
        
        logger.critical(
            f"Alert triggered: {rule.name}",
            extra=alert_data
        )
        
        # Notify alert handlers
        for handler in self.alert_handlers:
            try:
                handler(alert_data)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")
    
    def add_alert_handler(self, handler: Callable):
        """Add an alert handler function."""
        self.alert_handlers.append(handler)
    
    def add_recovery_handler(self, error_type: str, handler: Callable):
        """Add a recovery handler for specific error types."""
        self.recovery_handlers[error_type] = handler
    
    def attempt_recovery(self, error_type: str, error_details: Dict[str, Any] = None) -> bool:
        """
        Attempt to recover from an error.
        
        Returns:
            True if recovery was attempted, False otherwise
        """
        if error_type in self.recovery_handlers:
            try:
                recovery_handler = self.recovery_handlers[error_type]
                result = recovery_handler(error_details)
                
                logger.info(
                    f"Recovery attempted for {error_type}",
                    extra={
                        'error_type': error_type,
                        'recovery_result': result,
                        'error_details': error_details
                    }
                )
                
                return True
            except Exception as e:
                logger.error(
                    f"Recovery handler failed for {error_type}: {e}",
                    extra={
                        'error_type': error_type,
                        'recovery_error': str(e),
                        'error_details': error_details
                    }
                )
        
        return False
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of error metrics."""
        with self._lock:
            summary = {
                'total_error_types': len(self.error_metrics),
                'error_breakdown': {},
                'recent_alerts': [],
                'system_health': self._calculate_system_health()
            }
            
            for error_type, metric in self.error_metrics.items():
                summary['error_breakdown'][error_type] = {
                    'count': metric.count,
                    'last_occurrence': metric.last_occurrence,
                    'first_occurrence': metric.first_occurrence,
                    'recent_count': len(metric.recent_errors)
                }
            
            return summary
    
    def _calculate_system_health(self) -> str:
        """Calculate overall system health based on error patterns."""
        recent_errors = self._count_errors_in_window(None, 15)  # Last 15 minutes
        
        if recent_errors == 0:
            return "healthy"
        elif recent_errors < 10:
            return "warning"
        elif recent_errors < 50:
            return "degraded"
        else:
            return "critical"
    
    def reset_metrics(self):
        """Reset all error metrics (for testing)."""
        with self._lock:
            self.error_metrics.clear()


class EmailAlertHandler:
    """Email alert handler for sending notifications."""
    
    def __init__(self, smtp_host: str, smtp_port: int, username: str, password: str, recipients: List[str]):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.recipients = recipients
    
    def __call__(self, alert_data: Dict[str, Any]):
        """Send email alert."""
        if not all([smtplib, MimeText, MimeMultipart]):
            logger.error("Email modules not available, cannot send alert")
            return
            
        try:
            subject = f"[{alert_data['severity'].upper()}] Movie Booking App Alert: {alert_data['rule_name']}"
            
            body = f"""
            Alert Details:
            - Rule: {alert_data['rule_name']}
            - Error Type: {alert_data['error_type']}
            - Error Count: {alert_data['error_count']} in {alert_data['time_window']} minutes
            - Severity: {alert_data['severity']}
            - Timestamp: {alert_data['timestamp']}
            
            Please investigate this issue immediately.
            """
            
            msg = MimeMultipart()
            msg['From'] = self.username
            msg['To'] = ', '.join(self.recipients)
            msg['Subject'] = subject
            msg.attach(MimeText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"Alert email sent for: {alert_data['rule_name']}")
            
        except Exception as e:
            logger.error(f"Failed to send alert email: {e}")


class RetryMechanism:
    """
    Retry mechanism for transient failures.
    """
    
    @staticmethod
    def exponential_backoff(
        func: Callable,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exceptions: tuple = (Exception,)
    ):
        """
        Execute function with exponential backoff retry.
        
        Args:
            func: Function to execute
            max_retries: Maximum number of retries
            base_delay: Base delay in seconds
            max_delay: Maximum delay in seconds
            exceptions: Tuple of exceptions to catch and retry
        """
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(
                            f"Function {func.__name__} failed after {max_retries} retries",
                            extra={
                                'function': func.__name__,
                                'attempts': attempt + 1,
                                'final_error': str(e)
                            }
                        )
                        raise e
                    
                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    
                    logger.warning(
                        f"Function {func.__name__} failed, retrying in {delay}s (attempt {attempt + 1}/{max_retries})",
                        extra={
                            'function': func.__name__,
                            'attempt': attempt + 1,
                            'delay': delay,
                            'error': str(e)
                        }
                    )
                    
                    time.sleep(delay)
            
            raise last_exception
        
        return wrapper


# Global error monitor instance
error_monitor = ErrorMonitor()


def setup_error_monitoring():
    """Setup error monitoring with default configuration."""
    
    # Add email alert handler if configured
    if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
        email_handler = EmailAlertHandler(
            smtp_host=settings.EMAIL_HOST,
            smtp_port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            recipients=getattr(settings, 'ALERT_RECIPIENTS', ['admin@moviebooking.com'])
        )
        error_monitor.add_alert_handler(email_handler)
    
    # Add recovery handlers for common transient failures
    def database_recovery_handler(error_details):
        """Attempt to recover from database connection issues."""
        from django.db import connection
        try:
            connection.close()
            return True
        except Exception:
            return False
    
    def cache_recovery_handler(error_details):
        """Attempt to recover from cache issues."""
        try:
            cache.clear()
            return True
        except Exception:
            return False
    
    error_monitor.add_recovery_handler('DATABASE_ERROR', database_recovery_handler)
    error_monitor.add_recovery_handler('CACHE_ERROR', cache_recovery_handler)
    
    logger.info("Error monitoring system initialized")


# Decorator for automatic error monitoring
def monitor_errors(error_type: str = None, attempt_recovery: bool = False):
    """
    Decorator to automatically monitor errors in functions.
    
    Args:
        error_type: Custom error type to record
        attempt_recovery: Whether to attempt recovery on failure
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Determine error type
                recorded_error_type = error_type or e.__class__.__name__
                
                # Record the error
                error_monitor.record_error(
                    recorded_error_type,
                    {
                        'function': func.__name__,
                        'exception': str(e),
                        'args': str(args)[:200],  # Limit size
                        'kwargs': str(kwargs)[:200]  # Limit size
                    }
                )
                
                # Attempt recovery if requested
                if attempt_recovery:
                    recovery_attempted = error_monitor.attempt_recovery(
                        recorded_error_type,
                        {'function': func.__name__, 'exception': str(e)}
                    )
                    
                    if recovery_attempted:
                        logger.info(f"Recovery attempted for {func.__name__}")
                
                # Re-raise the exception
                raise e
        
        return wrapper
    return decorator