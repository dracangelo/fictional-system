"""
Error handling system setup and initialization.

This module initializes the error monitoring and recovery systems
when the Django application starts.
"""

import logging
from django.conf import settings
from django.apps import AppConfig

from movie_booking_app.error_monitoring import setup_error_monitoring
from movie_booking_app.error_recovery import setup_error_recovery

logger = logging.getLogger(__name__)


def initialize_error_handling():
    """
    Initialize the complete error handling system.
    
    This function should be called during Django application startup
    to set up error monitoring, recovery mechanisms, and alerting.
    """
    try:
        # Setup error monitoring
        setup_error_monitoring()
        logger.info("Error monitoring system initialized")
        
        # Setup error recovery
        setup_error_recovery()
        logger.info("Error recovery system initialized")
        
        # Setup additional error handling configurations
        _setup_error_thresholds()
        _setup_recovery_handlers()
        
        logger.info("Error handling system fully initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize error handling system: {e}")
        raise


def _setup_error_thresholds():
    """Setup error thresholds and alert configurations."""
    from movie_booking_app.error_monitoring import error_monitor, AlertRule, AlertSeverity
    
    # Add custom alert rules based on application requirements
    custom_rules = [
        AlertRule(
            name="Booking System Overload",
            error_type="SEAT_UNAVAILABLE",
            threshold=100,
            time_window_minutes=5,
            severity=AlertSeverity.HIGH,
            cooldown_minutes=15
        ),
        AlertRule(
            name="Payment System Issues",
            error_type="PAYMENT_PROCESSING_ERROR",
            threshold=10,
            time_window_minutes=10,
            severity=AlertSeverity.CRITICAL,
            cooldown_minutes=5
        ),
        AlertRule(
            name="Authentication Attacks",
            error_type="AUTHENTICATION_ERROR",
            threshold=50,
            time_window_minutes=5,
            severity=AlertSeverity.CRITICAL,
            cooldown_minutes=10
        ),
        AlertRule(
            name="Database Performance Issues",
            error_type="DATABASE_ERROR",
            threshold=5,
            time_window_minutes=5,
            severity=AlertSeverity.HIGH,
            cooldown_minutes=20
        ),
    ]
    
    # Add rules to the error monitor
    error_monitor.alert_rules.extend(custom_rules)
    logger.info(f"Added {len(custom_rules)} custom alert rules")


def _setup_recovery_handlers():
    """Setup custom recovery handlers for application-specific errors."""
    from movie_booking_app.error_recovery import recovery_manager, RecoveryAction, RecoveryStrategy
    
    # Booking-specific recovery handlers
    def booking_conflict_recovery(error_details):
        """Handle booking conflicts by suggesting alternatives."""
        logger.info("Attempting booking conflict recovery")
        # In a real implementation, this would:
        # 1. Find alternative seats/times
        # 2. Notify the user of alternatives
        # 3. Update booking preferences
        return True
    
    def payment_retry_recovery(error_details):
        """Handle payment failures with intelligent retry."""
        logger.info("Attempting payment retry recovery")
        # In a real implementation, this would:
        # 1. Check payment provider status
        # 2. Retry with exponential backoff
        # 3. Try alternative payment methods
        return False  # Placeholder
    
    def notification_fallback_recovery(error_details):
        """Handle notification failures with fallback channels."""
        logger.info("Attempting notification fallback recovery")
        # In a real implementation, this would:
        # 1. Try alternative delivery channels
        # 2. Queue for later retry
        # 3. Use different service providers
        return True
    
    # Register custom recovery actions
    recovery_manager.register_recovery_action(
        'SEAT_UNAVAILABLE',
        RecoveryAction(
            strategy=RecoveryStrategy.FALLBACK,
            handler=booking_conflict_recovery,
            max_attempts=1,
            delay_seconds=0.0
        )
    )
    
    recovery_manager.register_recovery_action(
        'PAYMENT_PROCESSING_ERROR',
        RecoveryAction(
            strategy=RecoveryStrategy.RETRY,
            handler=payment_retry_recovery,
            max_attempts=3,
            delay_seconds=30.0
        )
    )
    
    recovery_manager.register_recovery_action(
        'EMAIL_DELIVERY_ERROR',
        RecoveryAction(
            strategy=RecoveryStrategy.FALLBACK,
            handler=notification_fallback_recovery,
            max_attempts=2,
            delay_seconds=60.0
        )
    )
    
    logger.info("Custom recovery handlers registered")


class ErrorHandlingConfig(AppConfig):
    """
    Django app configuration for error handling system.
    
    This ensures the error handling system is initialized
    when Django starts up.
    """
    
    name = 'movie_booking_app'
    verbose_name = 'Movie Booking App Error Handling'
    
    def ready(self):
        """Initialize error handling when Django is ready."""
        # Only initialize in the main process, not in management commands
        import sys
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0]:
            try:
                initialize_error_handling()
            except Exception as e:
                # Log the error but don't prevent Django from starting
                logger.error(f"Error handling initialization failed: {e}")


# Utility functions for manual error handling

def handle_critical_error(error_type: str, error_details: dict, attempt_recovery: bool = True):
    """
    Handle critical errors with immediate alerting and recovery attempts.
    
    Args:
        error_type: Type of critical error
        error_details: Error details and context
        attempt_recovery: Whether to attempt automatic recovery
    """
    from movie_booking_app.error_monitoring import error_monitor
    from movie_booking_app.error_recovery import recovery_manager
    
    # Record the critical error
    error_monitor.record_error(error_type, error_details)
    
    # Log critical error
    logger.critical(
        f"Critical error occurred: {error_type}",
        extra={
            'error_type': error_type,
            'error_details': error_details,
            'severity': 'critical'
        }
    )
    
    # Attempt recovery if requested
    if attempt_recovery:
        recovery_success = recovery_manager.attempt_recovery(error_type, error_details)
        
        if recovery_success:
            logger.info(f"Recovery successful for critical error: {error_type}")
        else:
            logger.error(f"Recovery failed for critical error: {error_type}")
        
        return recovery_success
    
    return False


def get_system_health_status():
    """
    Get current system health status.
    
    Returns:
        Dictionary containing system health information
    """
    from movie_booking_app.error_monitoring import error_monitor
    
    try:
        # Get error summary
        error_summary = error_monitor.get_error_summary()
        
        # Get system health from recovery manager
        from movie_booking_app.error_recovery import health_checker
        health_status = health_checker.check_system_health()
        
        return {
            'overall_status': health_status['overall_status'],
            'error_summary': error_summary,
            'component_health': health_status.get('components', {}),
            'timestamp': health_status.get('timestamp')
        }
        
    except Exception as e:
        logger.error(f"Failed to get system health status: {e}")
        return {
            'overall_status': 'error',
            'error': str(e),
            'timestamp': None
        }


def reset_error_monitoring():
    """
    Reset error monitoring metrics (for testing/maintenance).
    
    This function should only be used in development or during
    maintenance windows.
    """
    from movie_booking_app.error_monitoring import error_monitor
    
    logger.warning("Resetting error monitoring metrics")
    error_monitor.reset_metrics()
    logger.info("Error monitoring metrics reset complete")