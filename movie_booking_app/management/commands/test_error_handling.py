"""
Management command to test and demonstrate the error handling system.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from movie_booking_app.exceptions import (
    SeatUnavailableError,
    PaymentProcessingError,
    ExternalServiceError
)
from movie_booking_app.error_monitoring import error_monitor
from movie_booking_app.error_recovery import recovery_manager
from movie_booking_app.error_setup import get_system_health_status


class Command(BaseCommand):
    help = 'Test and demonstrate the error handling system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--scenario',
            type=str,
            choices=['booking', 'payment', 'external', 'all'],
            default='all',
            help='Error scenario to test'
        )
        
        parser.add_argument(
            '--show-health',
            action='store_true',
            help='Show system health status'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Testing Error Handling System')
        )
        self.stdout.write('=' * 50)
        
        scenario = options['scenario']
        
        if scenario in ['booking', 'all']:
            self.test_booking_error()
        
        if scenario in ['payment', 'all']:
            self.test_payment_error()
        
        if scenario in ['external', 'all']:
            self.test_external_service_error()
        
        if options['show_health']:
            self.show_system_health()
        
        self.stdout.write(
            self.style.SUCCESS('\n✅ Error handling system test completed!')
        )
    
    def test_booking_error(self):
        """Test booking-related error handling."""
        self.stdout.write('\n🎫 Testing Booking Error Scenario...')
        
        try:
            # Simulate a seat unavailable error
            unavailable_seats = ['A1', 'A2']
            suggested_seats = ['B1', 'B2']
            
            raise SeatUnavailableError(unavailable_seats, suggested_seats)
            
        except SeatUnavailableError as e:
            # Record the error
            error_monitor.record_error(
                e.code,
                {
                    'showtime_id': 123,
                    'customer_id': 'test_customer',
                    'requested_seats': unavailable_seats,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            self.stdout.write(f'   📝 Recorded error: {e.code}')
            self.stdout.write(f'   💬 Message: {e.message}')
            
            # Attempt recovery
            recovery_success = recovery_manager.attempt_recovery(e.code, {
                'unavailable_seats': unavailable_seats,
                'suggested_alternatives': suggested_seats
            })
            
            if recovery_success:
                self.stdout.write('   ✅ Recovery successful')
            else:
                self.stdout.write('   ⚠️  Recovery not available for this error type')
    
    def test_payment_error(self):
        """Test payment-related error handling."""
        self.stdout.write('\n💳 Testing Payment Error Scenario...')
        
        try:
            # Simulate a payment processing error
            payment_intent_id = 'pi_test_123456'
            reason = 'Card declined - insufficient funds'
            
            raise PaymentProcessingError(payment_intent_id, reason)
            
        except PaymentProcessingError as e:
            # Record the error
            error_monitor.record_error(
                e.code,
                {
                    'payment_intent_id': payment_intent_id,
                    'customer_id': 'test_customer',
                    'amount': 75.50,
                    'currency': 'USD',
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            self.stdout.write(f'   📝 Recorded error: {e.code}')
            self.stdout.write(f'   💬 Message: {e.message}')
            
            # Attempt recovery
            recovery_success = recovery_manager.attempt_recovery(e.code, {
                'payment_intent_id': payment_intent_id,
                'retry_count': 1
            })
            
            if recovery_success:
                self.stdout.write('   ✅ Recovery successful')
            else:
                self.stdout.write('   ⚠️  Recovery attempted but failed')
    
    def test_external_service_error(self):
        """Test external service error handling."""
        self.stdout.write('\n🌐 Testing External Service Error Scenario...')
        
        try:
            # Simulate an external service error
            service_name = 'stripe_api'
            reason = 'Connection timeout after 30 seconds'
            
            raise ExternalServiceError(service_name, reason, is_transient=True)
            
        except ExternalServiceError as e:
            # Record the error
            error_monitor.record_error(
                e.code,
                {
                    'service_name': service_name,
                    'endpoint': '/v1/payment_intents',
                    'timeout_seconds': 30,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            self.stdout.write(f'   📝 Recorded error: {e.code}')
            self.stdout.write(f'   💬 Message: {e.message}')
            self.stdout.write(f'   🔄 Transient: {e.details["is_transient"]}')
            
            # Attempt recovery
            recovery_success = recovery_manager.attempt_recovery(e.code, {
                'service_name': service_name,
                'is_transient': True
            })
            
            if recovery_success:
                self.stdout.write('   ✅ Recovery successful')
            else:
                self.stdout.write('   ⚠️  Recovery handled by circuit breaker')
    
    def show_system_health(self):
        """Show current system health status."""
        self.stdout.write('\n🏥 System Health Status...')
        
        try:
            health_status = get_system_health_status()
            
            # Overall status
            status = health_status['overall_status']
            if status == 'healthy':
                status_style = self.style.SUCCESS
                status_icon = '✅'
            elif status == 'warning':
                status_style = self.style.WARNING
                status_icon = '⚠️'
            else:
                status_style = self.style.ERROR
                status_icon = '❌'
            
            self.stdout.write(f'   {status_icon} Overall Status: {status_style(status.upper())}')
            
            # Error summary
            error_summary = health_status.get('error_summary', {})
            total_errors = error_summary.get('total_error_types', 0)
            self.stdout.write(f'   📊 Total Error Types: {total_errors}')
            
            if total_errors > 0:
                self.stdout.write('   📋 Recent Errors:')
                error_breakdown = error_summary.get('error_breakdown', {})
                for error_type, details in list(error_breakdown.items())[:5]:  # Show top 5
                    count = details.get('count', 0)
                    last_occurrence = details.get('last_occurrence')
                    if last_occurrence:
                        last_occurrence = last_occurrence.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        last_occurrence = 'Unknown'
                    
                    self.stdout.write(f'      • {error_type}: {count} occurrences (last: {last_occurrence})')
            
            # Component health
            component_health = health_status.get('component_health', {})
            if component_health:
                self.stdout.write('   🔧 Component Health:')
                for component, health in component_health.items():
                    is_healthy = health.get('healthy', False)
                    icon = '✅' if is_healthy else '❌'
                    response_time = health.get('response_time_ms')
                    if response_time:
                        self.stdout.write(f'      {icon} {component}: {response_time:.1f}ms')
                    else:
                        error_msg = health.get('error', 'Unknown error')
                        self.stdout.write(f'      {icon} {component}: {error_msg}')
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'   ❌ Failed to get system health: {e}')
            )