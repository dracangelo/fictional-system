"""
Tests for error handling and logging system.
"""

import json
import logging
import tempfile
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.db import connection
from rest_framework.test import APITestCase
from rest_framework import status

from movie_booking_app.exceptions import (
    MovieBookingAppException,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    BookingError,
    SeatUnavailableError,
    TicketUnavailableError,
    PaymentError,
    PaymentProcessingError,
    RefundError,
    WebhookError,
    NotificationError,
    EmailDeliveryError,
    SMSDeliveryError,
    ExternalServiceError,
    RateLimitExceededError,
    SystemMaintenanceError,
    custom_exception_handler
)
from movie_booking_app.error_monitoring import (
    ErrorMonitor,
    AlertRule,
    AlertSeverity,
    EmailAlertHandler,
    RetryMechanism,
    error_monitor,
    monitor_errors
)
from movie_booking_app.error_recovery import (
    ErrorRecoveryManager,
    CircuitBreaker,
    RecoveryStrategy,
    RecoveryAction,
    recovery_manager,
    with_recovery
)
from movie_booking_app.logging_config import (
    StructuredFormatter,
    SecurityFormatter,
    PerformanceFormatter,
    LoggerMixin
)


class ExceptionTests(TestCase):
    """Test custom exception classes."""
    
    def test_base_exception_creation(self):
        """Test base exception creation and serialization."""
        exc = MovieBookingAppException(
            message="Test error",
            code="TEST_ERROR",
            details={"field": "value"},
            status_code=400
        )
        
        self.assertEqual(exc.message, "Test error")
        self.assertEqual(exc.code, "TEST_ERROR")
        self.assertEqual(exc.details, {"field": "value"})
        self.assertEqual(exc.status_code, 400)
        
        # Test serialization
        exc_dict = exc.to_dict()
        self.assertIn("error", exc_dict)
        self.assertEqual(exc_dict["error"]["code"], "TEST_ERROR")
        self.assertEqual(exc_dict["error"]["message"], "Test error")
        self.assertEqual(exc_dict["error"]["details"], {"field": "value"})
        self.assertIn("timestamp", exc_dict["error"])
    
    def test_validation_error(self):
        """Test validation error with field errors."""
        field_errors = {"email": ["Invalid email format"]}
        exc = ValidationError("Validation failed", field_errors)
        
        self.assertEqual(exc.code, "VALIDATION_ERROR")
        self.assertEqual(exc.status_code, 400)
        self.assertEqual(exc.details["field_errors"], field_errors)
    
    def test_seat_unavailable_error(self):
        """Test seat unavailable error with suggestions."""
        unavailable_seats = ["A1", "A2"]
        suggested_alternatives = ["B1", "B2"]
        
        exc = SeatUnavailableError(unavailable_seats, suggested_alternatives)
        
        self.assertEqual(exc.code, "SEAT_UNAVAILABLE")
        self.assertEqual(exc.details["unavailable_seats"], unavailable_seats)
        self.assertEqual(exc.details["suggested_alternatives"], suggested_alternatives)
    
    def test_payment_processing_error(self):
        """Test payment processing error."""
        exc = PaymentProcessingError("pi_123", "Card declined")
        
        self.assertEqual(exc.code, "PAYMENT_PROCESSING_ERROR")
        self.assertEqual(exc.status_code, 402)
        self.assertEqual(exc.details["payment_intent_id"], "pi_123")
        self.assertEqual(exc.details["reason"], "Card declined")
    
    def test_external_service_error(self):
        """Test external service error with transient flag."""
        exc = ExternalServiceError("stripe", "Connection timeout", is_transient=True)
        
        self.assertEqual(exc.code, "EXTERNAL_SERVICE_ERROR")
        self.assertEqual(exc.status_code, 502)  # Bad Gateway for transient errors
        self.assertTrue(exc.details["is_transient"])


class CustomExceptionHandlerTests(APITestCase):
    """Test custom exception handler for DRF."""
    
    def setUp(self):
        """Set up test data."""
        self.mock_request = MagicMock()
        self.mock_request.path = "/api/test/"
        self.mock_request.user = "testuser"
    
    def test_custom_exception_handling(self):
        """Test handling of custom exceptions."""
        exc = ValidationError("Test validation error")
        context = {"request": self.mock_request}
        
        response = custom_exception_handler(exc, context)
        
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")
    
    def test_standard_exception_handling(self):
        """Test handling of standard exceptions."""
        exc = ValueError("Standard error")
        context = {"request": self.mock_request}
        
        # Mock the standard exception handler
        with patch('movie_booking_app.exceptions.exception_handler') as mock_handler:
            mock_response = MagicMock()
            mock_response.status_code = 500
            mock_response.data = {"detail": "Internal server error"}
            mock_handler.return_value = mock_response
            
            response = custom_exception_handler(exc, context)
            
            self.assertIn("error", response.data)
            self.assertIn("timestamp", response.data["error"])


class ErrorMonitoringTests(TestCase):
    """Test error monitoring system."""
    
    def setUp(self):
        """Set up test data."""
        self.monitor = ErrorMonitor()
    
    def tearDown(self):
        """Clean up after tests."""
        self.monitor.reset_metrics()
    
    def test_error_recording(self):
        """Test error recording and metrics."""
        error_details = {"function": "test_function", "args": "test_args"}
        
        self.monitor.record_error("TEST_ERROR", error_details)
        
        self.assertIn("TEST_ERROR", self.monitor.error_metrics)
        metric = self.monitor.error_metrics["TEST_ERROR"]
        self.assertEqual(metric.count, 1)
        self.assertIsNotNone(metric.last_occurrence)
        self.assertEqual(len(metric.recent_errors), 1)
    
    def test_alert_triggering(self):
        """Test alert rule triggering."""
        # Create a test alert rule
        alert_rule = AlertRule(
            name="Test Alert",
            error_type="TEST_ERROR",
            threshold=3,
            time_window_minutes=5,
            severity=AlertSeverity.HIGH
        )
        self.monitor.alert_rules = [alert_rule]
        
        # Mock alert handler
        alert_handler = MagicMock()
        self.monitor.add_alert_handler(alert_handler)
        
        # Record errors to trigger alert
        for i in range(4):
            self.monitor.record_error("TEST_ERROR")
        
        # Verify alert was triggered
        alert_handler.assert_called_once()
        call_args = alert_handler.call_args[0][0]
        self.assertEqual(call_args["rule_name"], "Test Alert")
        self.assertEqual(call_args["error_type"], "TEST_ERROR")
    
    def test_error_summary(self):
        """Test error summary generation."""
        self.monitor.record_error("ERROR_1")
        self.monitor.record_error("ERROR_2")
        self.monitor.record_error("ERROR_1")
        
        summary = self.monitor.get_error_summary()
        
        self.assertEqual(summary["total_error_types"], 2)
        self.assertIn("ERROR_1", summary["error_breakdown"])
        self.assertIn("ERROR_2", summary["error_breakdown"])
        self.assertEqual(summary["error_breakdown"]["ERROR_1"]["count"], 2)
        self.assertEqual(summary["error_breakdown"]["ERROR_2"]["count"], 1)
    
    def test_monitor_errors_decorator(self):
        """Test monitor_errors decorator."""
        @monitor_errors("CUSTOM_ERROR")
        def failing_function():
            raise ValueError("Test error")
        
        with self.assertRaises(ValueError):
            failing_function()
        
        # Verify error was recorded
        self.assertIn("CUSTOM_ERROR", self.monitor.error_metrics)
        self.assertEqual(self.monitor.error_metrics["CUSTOM_ERROR"].count, 1)


class ErrorRecoveryTests(TestCase):
    """Test error recovery system."""
    
    def setUp(self):
        """Set up test data."""
        self.recovery_manager = ErrorRecoveryManager()
    
    def test_database_connection_recovery(self):
        """Test database connection recovery."""
        # Mock database connection
        with patch('movie_booking_app.error_recovery.connection') as mock_connection:
            mock_connection.close.return_value = None
            mock_connection.ensure_connection.return_value = None
            
            success = self.recovery_manager.attempt_recovery("DATABASE_ERROR")
            
            self.assertTrue(success)
            mock_connection.close.assert_called_once()
            mock_connection.ensure_connection.assert_called_once()
    
    def test_cache_recovery(self):
        """Test cache recovery."""
        with patch('movie_booking_app.error_recovery.cache') as mock_cache:
            mock_cache.clear.return_value = None
            
            success = self.recovery_manager.attempt_recovery("CACHE_ERROR")
            
            self.assertTrue(success)
            mock_cache.clear.assert_called_once()
    
    def test_circuit_breaker(self):
        """Test circuit breaker functionality."""
        circuit_breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=1)
        
        @circuit_breaker
        def failing_function():
            raise Exception("Service unavailable")
        
        # First failure
        with self.assertRaises(Exception):
            failing_function()
        self.assertEqual(circuit_breaker.failure_count, 1)
        self.assertEqual(circuit_breaker.state, 'CLOSED')
        
        # Second failure - should open circuit
        with self.assertRaises(Exception):
            failing_function()
        self.assertEqual(circuit_breaker.failure_count, 2)
        self.assertEqual(circuit_breaker.state, 'OPEN')
        
        # Third call - should fail immediately due to open circuit
        with self.assertRaises(Exception) as cm:
            failing_function()
        self.assertIn("Circuit breaker is OPEN", str(cm.exception))
    
    def test_with_recovery_decorator(self):
        """Test with_recovery decorator."""
        call_count = 0
        
        @with_recovery("TEST_ERROR", max_attempts=2)
        def sometimes_failing_function():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Temporary failure")
            return "success"
        
        # Mock recovery manager
        with patch.object(self.recovery_manager, 'attempt_recovery', return_value=True):
            result = sometimes_failing_function()
            self.assertEqual(result, "success")
            self.assertEqual(call_count, 2)


class RetryMechanismTests(TestCase):
    """Test retry mechanism."""
    
    def test_exponential_backoff_success(self):
        """Test successful retry with exponential backoff."""
        call_count = 0
        
        def sometimes_failing_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary failure")
            return "success"
        
        # Apply retry mechanism
        retry_func = RetryMechanism.exponential_backoff(
            sometimes_failing_function,
            max_retries=3,
            base_delay=0.1,  # Short delay for testing
            exceptions=(ValueError,)
        )
        
        result = retry_func()
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 3)
    
    def test_exponential_backoff_failure(self):
        """Test retry mechanism when all attempts fail."""
        def always_failing_function():
            raise ValueError("Permanent failure")
        
        retry_func = RetryMechanism.exponential_backoff(
            always_failing_function,
            max_retries=2,
            base_delay=0.1,
            exceptions=(ValueError,)
        )
        
        with self.assertRaises(ValueError):
            retry_func()


class LoggingFormatterTests(TestCase):
    """Test custom logging formatters."""
    
    def test_structured_formatter(self):
        """Test structured JSON formatter."""
        formatter = StructuredFormatter()
        
        # Create a log record
        record = logging.LogRecord(
            name="test.logger",
            level=logging.ERROR,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None
        )
        record.user = "testuser"
        record.request_path = "/api/test/"
        
        formatted = formatter.format(record)
        log_data = json.loads(formatted)
        
        self.assertEqual(log_data["level"], "ERROR")
        self.assertEqual(log_data["message"], "Test message")
        self.assertEqual(log_data["user"], "testuser")
        self.assertEqual(log_data["request_path"], "/api/test/")
        self.assertIn("timestamp", log_data)
    
    def test_security_formatter(self):
        """Test security-specific formatter."""
        formatter = SecurityFormatter()
        
        record = logging.LogRecord(
            name="security.logger",
            level=logging.WARNING,
            pathname="security.py",
            lineno=20,
            msg="Security event",
            args=(),
            exc_info=None
        )
        record.action = "login_attempt"
        record.outcome = "failed"
        record.source_ip = "192.168.1.1"
        
        formatted = formatter.format(record)
        log_data = json.loads(formatted)
        
        self.assertEqual(log_data["event_type"], "security")
        self.assertEqual(log_data["action"], "login_attempt")
        self.assertEqual(log_data["outcome"], "failed")
        self.assertEqual(log_data["source_ip"], "192.168.1.1")
    
    def test_performance_formatter(self):
        """Test performance-specific formatter."""
        formatter = PerformanceFormatter()
        
        record = logging.LogRecord(
            name="performance.logger",
            level=logging.INFO,
            pathname="performance.py",
            lineno=30,
            msg="Performance metric",
            args=(),
            exc_info=None
        )
        record.duration_ms = 150.5
        record.endpoint = "/api/bookings/"
        record.method = "POST"
        
        formatted = formatter.format(record)
        log_data = json.loads(formatted)
        
        self.assertEqual(log_data["event_type"], "performance")
        self.assertEqual(log_data["duration_ms"], 150.5)
        self.assertEqual(log_data["endpoint"], "/api/bookings/")
        self.assertEqual(log_data["method"], "POST")


class LoggerMixinTests(TestCase):
    """Test logger mixin functionality."""
    
    def test_logger_mixin(self):
        """Test logger mixin methods."""
        class TestClass(LoggerMixin):
            pass
        
        test_obj = TestClass()
        
        # Test logger property
        logger = test_obj.logger
        self.assertIsInstance(logger, logging.Logger)
        self.assertEqual(logger.name, f"{TestClass.__module__}.TestClass")
        
        # Test logging methods (we can't easily test the actual logging output,
        # but we can verify the methods exist and don't raise exceptions)
        test_obj.log_info("Test info message", extra_field="value")
        test_obj.log_warning("Test warning message")
        test_obj.log_error("Test error message")
        test_obj.log_security_event("login", "success", user="testuser")
        test_obj.log_audit_event("create", "booking", booking_id=123)
        test_obj.log_performance_metric("api_call", 100.5, endpoint="/api/test/")


class EmailAlertHandlerTests(TestCase):
    """Test email alert handler."""
    
    def test_email_alert_handler(self):
        """Test email alert sending."""
        handler = EmailAlertHandler(
            smtp_host="smtp.test.com",
            smtp_port=587,
            username="test@example.com",
            password="password",
            recipients=["admin@example.com"]
        )
        
        alert_data = {
            "rule_name": "Test Alert",
            "error_type": "TEST_ERROR",
            "error_count": 5,
            "time_window": 10,
            "severity": "high",
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
        # Mock SMTP server
        with patch('movie_booking_app.error_monitoring.smtplib.SMTP') as mock_smtp:
            mock_server = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_server
            
            handler(alert_data)
            
            # Verify SMTP methods were called
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once_with("test@example.com", "password")
            mock_server.send_message.assert_called_once()


@override_settings(
    LOGGING={
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'test': {
                'class': 'logging.NullHandler',
            },
        },
        'loggers': {
            'movie_booking_app': {
                'handlers': ['test'],
                'level': 'DEBUG',
            },
        },
    }
)
class IntegrationTests(TestCase):
    """Integration tests for error handling system."""
    
    def test_error_monitoring_integration(self):
        """Test integration between error monitoring and recovery."""
        # Record an error
        error_monitor.record_error("DATABASE_ERROR", {"connection": "lost"})
        
        # Verify error was recorded
        self.assertIn("DATABASE_ERROR", error_monitor.error_metrics)
        
        # Attempt recovery
        with patch.object(recovery_manager, 'attempt_recovery', return_value=True) as mock_recovery:
            success = recovery_manager.attempt_recovery("DATABASE_ERROR")
            self.assertTrue(success)
            mock_recovery.assert_called_once()
    
    def test_full_error_handling_flow(self):
        """Test complete error handling flow from exception to recovery."""
        
        @monitor_errors("INTEGRATION_TEST_ERROR", attempt_recovery=True)
        @with_recovery("INTEGRATION_TEST_ERROR", max_attempts=2)
        def test_function():
            raise ValueError("Test integration error")
        
        # Mock recovery to succeed on second attempt
        recovery_attempts = 0
        
        def mock_recovery(error_type, error_details=None):
            nonlocal recovery_attempts
            recovery_attempts += 1
            return recovery_attempts >= 2
        
        with patch.object(recovery_manager, 'attempt_recovery', side_effect=mock_recovery):
            with self.assertRaises(ValueError):
                test_function()
            
            # Verify error was monitored and recovery was attempted
            self.assertIn("INTEGRATION_TEST_ERROR", error_monitor.error_metrics)
            self.assertEqual(recovery_attempts, 2)