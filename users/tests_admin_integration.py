from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.core.management import call_command
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from .models import UserProfile
from .admin_models import AuditLog, ContentModerationQueue, SystemHealthMetric, UserAction
from .admin_services import (
    AdminAnalyticsService,
    UserManagementService,
    ContentModerationService,
    SystemHealthService
)
from events.models import Event, TicketType
from bookings.models import Booking, Ticket
from theaters.models import Theater, Movie, Showtime


class AdminSystemIntegrationTest(TransactionTestCase):
    """Integration tests for the complete admin system"""
    
    def setUp(self):
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )
        self.admin_user.profile.role = 'admin'
        self.admin_user.is_superuser = True
        self.admin_user.profile.save()
        
        self.event_owner = User.objects.create_user(
            username='event_owner',
            email='owner@test.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.theater_owner = User.objects.create_user(
            username='theater_owner',
            email='theater@test.com',
            password='testpass123'
        )
        self.theater_owner.profile.role = 'theater_owner'
        self.theater_owner.profile.save()
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        
        # Create test content
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2),
            status='published'
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Theater',
            address='Test Theater Address',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=3,
            seating_layout={
                'screens': [
                    {'screen_number': 1, 'rows': 10, 'seats_per_row': 20},
                    {'screen_number': 2, 'rows': 8, 'seats_per_row': 15},
                    {'screen_number': 3, 'rows': 12, 'seats_per_row': 25}
                ]
            }
        )
        
        self.movie = Movie.objects.create(
            title='Test Movie',
            genre='action',
            duration=120,
            rating='PG-13',
            description='Test movie description',
            director='Test Director',
            release_date=timezone.now().date()
        )
        
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=2),
            base_price=Decimal('15.00'),
            total_seats=200,
            available_seats=200
        )
        
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            customer_email=self.customer.email
        )
    
    def test_admin_system_setup_command(self):
        """Test the admin system setup management command"""
        out = StringIO()
        
        # Test setup without creating superuser
        call_command('setup_admin_system', stdout=out)
        output = out.getvalue()
        
        self.assertIn('Setting up role-based permissions', output)
        self.assertIn('Admin system setup completed successfully', output)
        
        # Verify audit log was created
        setup_log = AuditLog.objects.filter(
            action_description__contains='Admin system setup completed'
        ).first()
        self.assertIsNotNone(setup_log)
    
    def test_system_metrics_collection_command(self):
        """Test the system metrics collection management command"""
        out = StringIO()
        
        # Test metrics collection
        call_command('collect_system_metrics', '--verbose', stdout=out)
        output = out.getvalue()
        
        self.assertIn('Collecting system health metrics', output)
        self.assertIn('Overall system status', output)
        
        # Verify metrics were created
        metrics_count = SystemHealthMetric.objects.count()
        self.assertGreater(metrics_count, 0)
    
    def test_complete_admin_workflow(self):
        """Test complete admin workflow from analytics to moderation"""
        # 1. Test analytics generation
        overview = AdminAnalyticsService.get_system_overview()
        self.assertIn('users', overview)
        self.assertIn('bookings', overview)
        self.assertEqual(overview['users']['total'], 4)  # admin, event_owner, theater_owner, customer
        
        # 2. Test user management
        result = UserManagementService.get_user_list()
        self.assertEqual(result['total_count'], 4)
        
        # Update user status
        result = UserManagementService.update_user_status(
            self.customer.id, False, self.admin_user
        )
        self.assertTrue(result['success'])
        
        # 3. Test content moderation
        moderation_item = ContentModerationService.add_to_moderation_queue(
            self.event, 'event', self.event_owner
        )
        self.assertEqual(moderation_item.status, 'pending')
        
        # Approve content
        moderation_item.approve(self.admin_user, 'Content looks good')
        self.assertEqual(moderation_item.status, 'approved')
        
        # 4. Test system health monitoring
        metrics = SystemHealthService.collect_system_metrics()
        self.assertGreater(len(metrics), 0)
        
        health_summary = SystemHealthService.get_health_summary()
        self.assertIn('overall_status', health_summary)
        
        # 5. Verify audit logs were created
        audit_logs = AuditLog.objects.filter(user=self.admin_user)
        self.assertGreater(audit_logs.count(), 0)
    
    def test_user_action_tracking(self):
        """Test user action tracking functionality"""
        # Create some user actions
        UserAction.objects.create(
            user=self.customer,
            action_category='booking',
            action_name='create_booking',
            endpoint='/api/bookings/',
            method='POST',
            response_status=201
        )
        
        UserAction.objects.create(
            user=self.event_owner,
            action_category='content',
            action_name='create_event',
            endpoint='/api/events/',
            method='POST',
            response_status=201
        )
        
        # Test user activity retrieval
        activity = UserManagementService.get_user_activity(self.customer.id, 30)
        self.assertIsNotNone(activity)
        self.assertEqual(activity['user'], self.customer)
        self.assertGreater(activity['actions'].count(), 0)
    
    def test_audit_logging_comprehensive(self):
        """Test comprehensive audit logging"""
        # Test different types of audit logs
        test_cases = [
            {
                'action_type': 'create',
                'description': 'Created test object',
                'severity': 'low'
            },
            {
                'action_type': 'update',
                'description': 'Updated test object',
                'severity': 'medium'
            },
            {
                'action_type': 'delete',
                'description': 'Deleted test object',
                'severity': 'high'
            },
            {
                'action_type': 'login',
                'description': 'User logged in',
                'severity': 'low'
            },
            {
                'action_type': 'permission_change',
                'description': 'Changed user permissions',
                'severity': 'high'
            }
        ]
        
        for case in test_cases:
            log = AuditLog.log_action(
                user=self.admin_user,
                action_type=case['action_type'],
                description=case['description'],
                severity=case['severity']
            )
            
            self.assertEqual(log.action_type, case['action_type'])
            self.assertEqual(log.severity, case['severity'])
            self.assertTrue(log.is_successful)
        
        # Verify all logs were created
        logs_count = AuditLog.objects.filter(user=self.admin_user).count()
        self.assertEqual(logs_count, len(test_cases))
    
    def test_content_moderation_workflow(self):
        """Test complete content moderation workflow"""
        # Add multiple items to moderation queue
        items = []
        
        # Add event
        event_item = ContentModerationService.add_to_moderation_queue(
            self.event, 'event', self.event_owner, priority='high'
        )
        items.append(event_item)
        
        # Add movie
        movie_item = ContentModerationService.add_to_moderation_queue(
            self.movie, 'movie', self.theater_owner, priority='medium'
        )
        items.append(movie_item)
        
        # Test moderation queue retrieval
        queue_result = ContentModerationService.get_moderation_queue()
        self.assertEqual(queue_result['total_count'], 2)
        
        # Test filtering by status
        pending_result = ContentModerationService.get_moderation_queue(status='pending')
        self.assertEqual(pending_result['total_count'], 2)
        
        # Test filtering by priority
        high_priority_result = ContentModerationService.get_moderation_queue(priority='high')
        self.assertEqual(high_priority_result['total_count'], 1)
        
        # Test moderation actions
        event_item.approve(self.admin_user, 'Event approved')
        movie_item.reject(self.admin_user, 'Movie needs revision')
        
        # Verify status changes
        event_item.refresh_from_db()
        movie_item.refresh_from_db()
        
        self.assertEqual(event_item.status, 'approved')
        self.assertEqual(movie_item.status, 'rejected')
        
        # Test moderation stats
        stats = ContentModerationService.get_moderation_stats()
        self.assertEqual(stats['total_pending'], 0)
    
    def test_system_health_monitoring_comprehensive(self):
        """Test comprehensive system health monitoring"""
        # Collect initial metrics
        initial_metrics = SystemHealthService.collect_system_metrics()
        self.assertGreater(len(initial_metrics), 0)
        
        # Test different metric types
        metric_types = ['database', 'cpu_usage', 'memory_usage', 'error_rate', 'active_users']
        
        for metric_type in metric_types:
            # Check if metric was created
            metric = SystemHealthMetric.objects.filter(metric_type=metric_type).first()
            if metric:  # Some metrics might not be available in test environment
                self.assertIsNotNone(metric.value)
                self.assertIn(metric.status, ['healthy', 'warning', 'critical'])
        
        # Test health summary
        health_summary = SystemHealthService.get_health_summary()
        self.assertIn('overall_status', health_summary)
        self.assertIn('metrics', health_summary)
        self.assertIn('critical_count', health_summary)
        self.assertIn('warning_count', health_summary)
        
        # Test metric status determination
        critical_metric = SystemHealthMetric.record_metric(
            'test_metric', 'Test Critical Metric', 95.0, '%',
            warning_threshold=70.0, critical_threshold=90.0
        )
        self.assertEqual(critical_metric.status, 'critical')
        
        warning_metric = SystemHealthMetric.record_metric(
            'test_metric', 'Test Warning Metric', 75.0, '%',
            warning_threshold=70.0, critical_threshold=90.0
        )
        self.assertEqual(warning_metric.status, 'warning')
        
        healthy_metric = SystemHealthMetric.record_metric(
            'test_metric', 'Test Healthy Metric', 50.0, '%',
            warning_threshold=70.0, critical_threshold=90.0
        )
        self.assertEqual(healthy_metric.status, 'healthy')


class AdminAPIIntegrationTest(APITestCase):
    """Integration tests for admin API endpoints"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )
        self.admin_user.profile.role = 'admin'
        self.admin_user.is_superuser = True
        self.admin_user.profile.save()
        
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='testpass123'
        )
        
        self.client = APIClient()
    
    def test_admin_dashboard_complete_workflow(self):
        """Test complete admin dashboard workflow"""
        self.client.force_authenticate(user=self.admin_user)
        
        # 1. Get dashboard summary
        url = reverse('users:admin:dashboard_summary')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        dashboard_data = response.data
        self.assertIn('overview', dashboard_data)
        self.assertIn('moderation', dashboard_data)
        self.assertIn('system_health', dashboard_data)
        self.assertIn('alerts', dashboard_data)
        
        # 2. Get detailed analytics
        analytics_url = reverse('users:admin:analytics')
        
        # Test different analytics types
        analytics_types = ['overview', 'users', 'bookings', 'content', 'performance']
        
        for analytics_type in analytics_types:
            response = self.client.get(analytics_url, {'type': analytics_type})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['analytics_type'], analytics_type)
            self.assertIn('data', response.data)
        
        # 3. Test user management
        users_url = reverse('users:admin:user_list')
        response = self.client.get(users_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('users', response.data)
        self.assertIn('pagination', response.data)
        
        # 4. Test system health
        health_url = reverse('users:admin:system_health')
        response = self.client.get(health_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('health_summary', response.data)
        
        # Trigger metrics collection
        response = self.client.post(health_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('metrics_collected', response.data)
        
        # 5. Test audit logs
        audit_url = reverse('users:admin:audit_logs')
        response = self.client.get(audit_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('logs', response.data)
    
    def test_admin_permissions_enforcement(self):
        """Test that admin permissions are properly enforced"""
        admin_endpoints = [
            'users:admin:analytics',
            'users:admin:dashboard_summary',
            'users:admin:user_list',
            'users:admin:audit_logs',
            'users:admin:system_health',
            'users:admin:moderation_queue',
        ]
        
        for endpoint_name in admin_endpoints:
            url = reverse(endpoint_name)
            
            # Test without authentication
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            
            # Test with regular user
            self.client.force_authenticate(user=self.regular_user)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            
            # Test with admin user
            self.client.force_authenticate(user=self.admin_user)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Clear authentication for next iteration
            self.client.force_authenticate(user=None)
    
    def test_admin_error_handling(self):
        """Test admin API error handling"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Test invalid analytics type
        analytics_url = reverse('users:admin:analytics')
        response = self.client.get(analytics_url, {'type': 'invalid_type'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        
        # Test invalid user ID for user management
        user_detail_url = reverse('users:admin:user_detail', kwargs={'user_id': 99999})
        response = self.client.patch(user_detail_url, {
            'action': 'update_status',
            'is_active': False
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid moderation item ID
        moderation_url = reverse('users:admin:moderation_item', kwargs={'item_id': 99999})
        response = self.client.patch(moderation_url, {
            'action': 'approve',
            'notes': 'Test approval'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)