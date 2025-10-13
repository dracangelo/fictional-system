"""
Error recovery mechanisms for the Movie Booking App.

This module provides automatic recovery strategies for various
types of transient failures and system issues.
"""

import logging
import time
import threading
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from django.core.cache import cache
from django.db import connection, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class RecoveryStrategy(Enum):
    """Available recovery strategies."""
    RETRY = "retry"
    CIRCUIT_BREAKER = "circuit_breaker"
    FALLBACK = "fallback"
    RESET_CONNECTION = "reset_connection"
    CLEAR_CACHE = "clear_cache"


@dataclass
class RecoveryAction:
    """Represents a recovery action."""
    strategy: RecoveryStrategy
    handler: Callable
    max_attempts: int = 3
    delay_seconds: float = 1.0
    timeout_seconds: float = 30.0
    conditions: Optional[Dict[str, Any]] = None


class CircuitBreaker:
    """
    Circuit breaker pattern implementation for external service calls.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
        self._lock = threading.Lock()
    
    def __call__(self, func):
        """Decorator to apply circuit breaker to a function."""
        def wrapper(*args, **kwargs):
            with self._lock:
                if self.state == 'OPEN':
                    if self._should_attempt_reset():
                        self.state = 'HALF_OPEN'
                        logger.info(f"Circuit breaker for {func.__name__} moved to HALF_OPEN")
                    else:
                        raise Exception(f"Circuit breaker is OPEN for {func.__name__}")
                
                try:
                    result = func(*args, **kwargs)
                    self._on_success()
                    return result
                except self.expected_exception as e:
                    self._on_failure()
                    raise e
        
        return wrapper
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt to reset."""
        if self.last_failure_time is None:
            return True
        
        return (datetime.now() - self.last_failure_time).seconds >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        if self.state == 'HALF_OPEN':
            self.state = 'CLOSED'
            logger.info("Circuit breaker reset to CLOSED state")
    
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


class ErrorRecoveryManager:
    """
    Manages error recovery strategies and actions.
    """
    
    def __init__(self):
        self.recovery_actions: Dict[str, List[RecoveryAction]] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.fallback_handlers: Dict[str, Callable] = {}
        self._setup_default_recovery_actions()
    
    def _setup_default_recovery_actions(self):
        """Setup default recovery actions for common error types."""
        
        # Database connection errors
        self.register_recovery_action(
            'DATABASE_ERROR',
            RecoveryAction(
                strategy=RecoveryStrategy.RESET_CONNECTION,
                handler=self._reset_database_connection,
                max_attempts=3,
                delay_seconds=2.0
            )
        )
        
        # Cache errors
        self.register_recovery_action(
            'CACHE_ERROR',
            RecoveryAction(
                strategy=RecoveryStrategy.CLEAR_CACHE,
                handler=self._clear_cache,
                max_attempts=2,
                delay_seconds=1.0
            )
        )
        
        # External service errors
        self.register_recovery_action(
            'EXTERNAL_SERVICE_ERROR',
            RecoveryAction(
                strategy=RecoveryStrategy.CIRCUIT_BREAKER,
                handler=self._handle_external_service_failure,
                max_attempts=3,
                delay_seconds=5.0
            )
        )
    
    def register_recovery_action(self, error_type: str, action: RecoveryAction):
        """Register a recovery action for an error type."""
        if error_type not in self.recovery_actions:
            self.recovery_actions[error_type] = []
        
        self.recovery_actions[error_type].append(action)
        logger.info(f"Registered recovery action for {error_type}: {action.strategy.value}")
    
    def attempt_recovery(self, error_type: str, error_details: Dict[str, Any] = None) -> bool:
        """
        Attempt recovery for a specific error type.
        
        Args:
            error_type: Type of error to recover from
            error_details: Additional error details
        
        Returns:
            True if recovery was successful, False otherwise
        """
        if error_type not in self.recovery_actions:
            logger.warning(f"No recovery actions registered for error type: {error_type}")
            return False
        
        actions = self.recovery_actions[error_type]
        
        for action in actions:
            try:
                logger.info(
                    f"Attempting recovery for {error_type} using {action.strategy.value}",
                    extra={
                        'error_type': error_type,
                        'strategy': action.strategy.value,
                        'error_details': error_details
                    }
                )
                
                success = self._execute_recovery_action(action, error_details)
                
                if success:
                    logger.info(
                        f"Recovery successful for {error_type} using {action.strategy.value}",
                        extra={
                            'error_type': error_type,
                            'strategy': action.strategy.value
                        }
                    )
                    return True
                
            except Exception as e:
                logger.error(
                    f"Recovery action failed for {error_type}: {e}",
                    extra={
                        'error_type': error_type,
                        'strategy': action.strategy.value,
                        'recovery_error': str(e)
                    }
                )
        
        logger.warning(f"All recovery attempts failed for {error_type}")
        return False
    
    def _execute_recovery_action(self, action: RecoveryAction, error_details: Dict[str, Any] = None) -> bool:
        """Execute a specific recovery action."""
        for attempt in range(action.max_attempts):
            try:
                if action.strategy == RecoveryStrategy.RETRY:
                    return self._execute_with_retry(action, error_details)
                else:
                    return action.handler(error_details)
                
            except Exception as e:
                if attempt < action.max_attempts - 1:
                    logger.warning(f"Recovery attempt {attempt + 1} failed, retrying in {action.delay_seconds}s")
                    time.sleep(action.delay_seconds)
                else:
                    logger.error(f"All recovery attempts failed: {e}")
                    raise e
        
        return False
    
    def _execute_with_retry(self, action: RecoveryAction, error_details: Dict[str, Any] = None) -> bool:
        """Execute action with retry logic."""
        for attempt in range(action.max_attempts):
            try:
                result = action.handler(error_details)
                if result:
                    return True
            except Exception as e:
                if attempt < action.max_attempts - 1:
                    delay = action.delay_seconds * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"Retry attempt {attempt + 1} failed, waiting {delay}s")
                    time.sleep(delay)
                else:
                    raise e
        
        return False
    
    # Default recovery handlers
    
    def _reset_database_connection(self, error_details: Dict[str, Any] = None) -> bool:
        """Reset database connection."""
        try:
            connection.close()
            # Test the connection
            connection.ensure_connection()
            logger.info("Database connection reset successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to reset database connection: {e}")
            return False
    
    def _clear_cache(self, error_details: Dict[str, Any] = None) -> bool:
        """Clear application cache."""
        try:
            cache.clear()
            logger.info("Cache cleared successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return False
    
    def _handle_external_service_failure(self, error_details: Dict[str, Any] = None) -> bool:
        """Handle external service failure with circuit breaker."""
        service_name = error_details.get('service_name', 'unknown') if error_details else 'unknown'
        
        if service_name in self.circuit_breakers:
            circuit_breaker = self.circuit_breakers[service_name]
            if circuit_breaker.state == 'OPEN':
                logger.warning(f"Circuit breaker is open for {service_name}")
                return False
        
        # For now, just log and return False to trigger circuit breaker
        logger.info(f"External service {service_name} failure handled")
        return False


# Global instances
recovery_manager = ErrorRecoveryManager()


def setup_error_recovery():
    """Setup error recovery system with default configuration."""
    
    # Setup circuit breakers for external services
    stripe_circuit_breaker = CircuitBreaker(
        failure_threshold=3,
        recovery_timeout=120,
        expected_exception=Exception
    )
    recovery_manager.circuit_breakers['stripe'] = stripe_circuit_breaker
    
    email_circuit_breaker = CircuitBreaker(
        failure_threshold=5,
        recovery_timeout=60,
        expected_exception=Exception
    )
    recovery_manager.circuit_breakers['email'] = email_circuit_breaker
    
    logger.info("Error recovery system initialized")


# Decorator for automatic error recovery
def with_recovery(error_type: str = None, max_attempts: int = 3):
    """
    Decorator to automatically attempt recovery on function failures.
    
    Args:
        error_type: Specific error type to handle
        max_attempts: Maximum recovery attempts
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            attempts = 0
            last_exception = None
            
            while attempts <= max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    attempts += 1
                    
                    # Determine error type for recovery
                    recovery_error_type = error_type or e.__class__.__name__
                    
                    if attempts <= max_attempts:
                        logger.warning(
                            f"Function {func.__name__} failed, attempting recovery (attempt {attempts}/{max_attempts})",
                            extra={
                                'function': func.__name__,
                                'error': str(e),
                                'attempt': attempts
                            }
                        )
                        
                        # Attempt recovery
                        recovery_success = recovery_manager.attempt_recovery(
                            recovery_error_type,
                            {
                                'function': func.__name__,
                                'exception': str(e),
                                'attempt': attempts
                            }
                        )
                        
                        if not recovery_success and attempts == max_attempts:
                            break
                        
                        # Wait before retry
                        time.sleep(2 ** (attempts - 1))  # Exponential backoff
                    
            # If we get here, all attempts failed
            logger.error(
                f"Function {func.__name__} failed after {max_attempts} recovery attempts",
                extra={
                    'function': func.__name__,
                    'final_error': str(last_exception),
                    'total_attempts': attempts
                }
            )
            
            raise last_exception
        
        return wrapper
    return decorator


class HealthChecker:
    """
    System health checker that monitors various components.
    """
    
    def __init__(self):
        self.health_checks: Dict[str, Callable] = {}
        self._setup_default_health_checks()
    
    def _setup_default_health_checks(self):
        """Setup default health checks."""
        self.health_checks['database'] = self._check_database_health
        self.health_checks['cache'] = self._check_cache_health
    
    def register_health_check(self, name: str, check_func: Callable):
        """Register a custom health check."""
        self.health_checks[name] = check_func
        logger.info(f"Registered health check: {name}")
    
    def check_system_health(self) -> Dict[str, Any]:
        """Check overall system health."""
        health_status = {
            'overall_status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'components': {}
        }
        
        failed_components = []
        
        for component, check_func in self.health_checks.items():
            try:
                component_health = check_func()
                health_status['components'][component] = component_health
                
                if not component_health.get('healthy', False):
                    failed_components.append(component)
                    
            except Exception as e:
                health_status['components'][component] = {
                    'healthy': False,
                    'error': str(e),
                    'timestamp': timezone.now().isoformat()
                }
                failed_components.append(component)
        
        # Determine overall status
        if failed_components:
            if len(failed_components) == len(self.health_checks):
                health_status['overall_status'] = 'critical'
            elif len(failed_components) > len(self.health_checks) / 2:
                health_status['overall_status'] = 'degraded'
            else:
                health_status['overall_status'] = 'warning'
            
            health_status['failed_components'] = failed_components
        
        return health_status
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            connection.ensure_connection()
            
            # Test a simple query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            return {
                'healthy': True,
                'response_time_ms': response_time,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }
    
    def _check_cache_health(self) -> Dict[str, Any]:
        """Check cache connectivity and performance."""
        try:
            start_time = time.time()
            
            # Test cache operations
            test_key = 'health_check_test'
            test_value = 'test_value'
            
            cache.set(test_key, test_value, 60)
            retrieved_value = cache.get(test_key)
            cache.delete(test_key)
            
            if retrieved_value != test_value:
                raise Exception("Cache value mismatch")
            
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            return {
                'healthy': True,
                'response_time_ms': response_time,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }


# Global instances
health_checker = HealthChecker()