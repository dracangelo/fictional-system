from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta
from decimal import Decimal

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


class AdminModelsTest(TestCase):
    """Test admin models"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )
        self.admin_user.profile.role = 'admin'
        self.admin_user.profile.save()
        
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='testpass123'
        )
    
    def test_audit_log_creation(self):
        """Test audit log creation"""
        log = AuditLog.log_action(
            user=self.admin_user,
            action_type='create',
            description='Created test object',
            severity='medium'
        )
        
        self.assertEqual(log.user, self.admin_user)
        self.assertEqual(log.action_type, 'create')
        self.assertEqual(log.severity, 'medium')
        self.assertTrue(log.is_successful)
    
    def test_content_moderation_queue(self):
        """Test content moderation queue"""
        # Create an event for moderation
        event = Event.objects.create(
            owner=self.regular_user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2)
        )
        
        # Add to moderation queue
        moderation_item = ContentModerationQueue.objects.create(
            content_object=event,
            content_category='event',
            content_title=event.title,
            content_description=event.description,
            submitted_by=self.regular_user
        )
        
        self.assertEqual(moderation_item.status, 'pending')
        self.assertEqual(moderation_item.content_object, event)
        
        # Test approval
        moderation_item.approve(self.admin_user, 'Looks good')
        self.assertEqual(moderation_item.status, 'approved')
        self.assertEqual(moderation_item.moderator, self.admin_user)
    
    def test_system_health_metric(self):
        """Test system health metric recording"""
        metric = SystemHealthMetric.record_metric(
            metric_type='cpu_usage',
            metric_name='CPU Usage',
            value=75.5,
            unit='%',
            warning_threshold=70,
            critical_threshold=90
        )
        
        self.assertEqual(metric.status, 'warning')  # Should be warning since 75.5 > 70
        self.assertEqual(metric.value, 75.5)
    
    def test_user_action_tracking(self):
        """Test user action tracking"""
        action = UserAction.objects.create(
            user=self.regular_user,
            action_category='booking',
            action_name='create_booking',
            endpoint='/api/bookings/',
            method='POST',
            response_status=201
        )
        
        self.assertEqual(action.user, self.regular_user)
        self.assertEqual(action.action_category, 'booking')


class AdminServicesTest(TestCase):
    """Test admin services"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )
        self.admin_user.profile.role = 'admin'
        self.admin_user.profile.save()
        
        # Create test data
        self.event_owner = User.objects.create_user(
            username='event_owner',
            email='owner@test.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        
        # Create test event and booking
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
        
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            customer_email=self.customer.email
        )
    
    def test_admin_analytics_service(self):
        """Test admin analytics service"""
        # Test system overview
        overview = AdminAnalyticsService.get_system_overview()
        
        self.assertIn('users', overview)
        self.assertIn('content', overview)
        self.assertIn('bookings', overview)
        self.assertIn('revenue', overview)
        
        # Check that we have the expected data
        self.assertEqual(overview['users']['total'], 3)  # admin, event_owner, customer
        self.assertEqual(overview['content']['total_events'], 1)
        self.assertEqual(overview['bookings']['total'], 1)
        
        # Test user analytics
        user_analytics = AdminAnalyticsService.get_user_analytics()
        self.assertIn('role_distribution', user_analytics)
        self.assertIn('registration_trends', user_analytics)
        
        # Test booking analytics
        booking_analytics = AdminAnalyticsService.get_booking_analytics()
        self.assertIn('booking_trends', booking_analytics)
        self.assertIn('status_distribution', booking_analytics)
    
    def test_user_management_service(self):
        """Test user management service"""
        # Test user list
        result = UserManagementService.get_user_list()
        self.assertEqual(result['total_count'], 3)
        self.assertEqual(len(result['users']), 3)
        
        # Test filtering by role
        result = UserManagementService.get_user_list({'role': 'admin'})
        self.assertEqual(result['total_count'], 1)
        
        # Test user status update
        result = UserManagementService.update_user_status(
            self.customer.id, False, self.admin_user
        )
        self.assertTrue(result['success'])
        
        # Verify user is deactivated
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)
        
        # Test role update
        result = UserManagementService.update_user_role(
            self.customer.id, 'event_owner', self.admin_user
        )
        self.assertTrue(result['success'])
        
        # Verify role changed
        self.customer.profile.refresh_from_db()
        self.assertEqual(self.customer.profile.role, 'event_owner')
    
    def test_content_moderation_service(self):
        """Test content moderation service"""
        # Add event to moderation queue
        moderation_item = ContentModerationService.add_to_moderation_queue(
            self.event, 'event', self.event_owner
        )
        
        self.assertEqual(moderation_item.content_object, self.event)
        self.assertEqual(moderation_item.status, 'pending')
        
        # Test moderation queue retrieval
        result = ContentModerationService.get_moderation_queue()
        self.assertEqual(result['total_count'], 1)
        
        # Test moderation stats
        stats = ContentModerationService.get_moderation_stats()
        self.assertEqual(stats['total_pending'], 1)
    
    def test_system_health_service(self):
        """Test system health service"""
        # Collect metrics
        metrics = SystemHealthService.collect_system_metrics()
        self.assertGreater(len(metrics), 0)
        
        # Test health summary
        summary = SystemHealthService.get_health_summary()
        self.assertIn('overall_status', summary)
        self.assertIn('metrics', summary)


class AdminAPITest(APITestCase):
    """Test admin API endpoints"""
    
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
    
    def test_admin_analytics_endpoint(self):
        """Test admin analytics endpoint"""
        # Test without authentication
        url = reverse('users:admin:analytics')
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
        
        # Check response structure
        self.assertIn('analytics_type', response.data)
        self.assertIn('data', response.data)
        
        # Test different analytics types
        response = self.client.get(url, {'type': 'users'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['analytics_type'], 'users')
    
    def test_admin_user_management_endpoint(self):
        """Test admin user management endpoint"""
        url = reverse('users:admin:user_list')
        
        # Test with admin user
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response structure
        self.assertIn('users', response.data)
        self.assertIn('pagination', response.data)
        
        # Test user status update
        url = reverse('users:admin:user_detail', kwargs={'user_id': self.regular_user.id})
        data = {
            'action': 'update_status',
            'is_active': False
        }
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user was deactivated
        self.regular_user.refresh_from_db()
        self.assertFalse(self.regular_user.is_active)
    
    def test_admin_audit_logs_endpoint(self):
        """Test admin audit logs endpoint"""
        # Create some audit logs
        AuditLog.log_action(
            user=self.admin_user,
            action_type='create',
            description='Test action'
        )
        
        url = reverse('users:admin:audit_logs')
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response structure
        self.assertIn('logs', response.data)
        self.assertIn('pagination', response.data)
        self.assertGreater(len(response.data['logs']), 0)
    
    def test_admin_system_health_endpoint(self):
        """Test admin system health endpoint"""
        url = reverse('users:admin:system_health')
        self.client.force_authenticate(user=self.admin_user)
        
        # Test GET request
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('health_summary', response.data)
        
        # Test POST request (trigger metrics collection)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('metrics_collected', response.data)
    
    def test_admin_dashboard_summary_endpoint(self):
        """Test admin dashboard summary endpoint"""
        url = reverse('users:admin:dashboard_summary')
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response structure
        self.assertIn('overview', response.data)
        self.assertIn('moderation', response.data)
        self.assertIn('system_health', response.data)
        self.assertIn('alerts', response.data)


class AdminPermissionsTest(TestCase):
    """Test admin permissions"""
    
    def setUp(self):
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
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
    
    def test_is_admin_user_permission(self):
        """Test IsAdminUser permission"""
        from .permissions import IsAdminUser
        
        permission = IsAdminUser()
        
        # Mock request objects
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        # Test with admin user
        request = MockRequest(self.admin_user)
        self.assertTrue(permission.has_permission(request, None))
        
        # Test with event owner
        request = MockRequest(self.event_owner)
        self.assertFalse(permission.has_permission(request, None))
        
        # Test with customer
        request = MockRequest(self.customer)
        self.assertFalse(permission.has_permission(request, None))
    
    def test_role_based_permissions(self):
        """Test role-based permissions are properly assigned"""
        # Check admin permissions
        self.assertTrue(self.admin_user.has_perm('users.can_view_system_analytics'))
        self.assertTrue(self.admin_user.has_perm('users.can_manage_all_users'))
        self.assertTrue(self.admin_user.has_perm('users.can_moderate_content'))
        
        # Check event owner permissions
        self.assertTrue(self.event_owner.has_perm('users.can_create_event'))
        self.assertTrue(self.event_owner.has_perm('users.can_manage_own_events'))
        self.assertFalse(self.event_owner.has_perm('users.can_view_system_analytics'))
        
        # Check customer permissions
        self.assertTrue(self.customer.has_perm('users.can_create_booking'))
        self.assertFalse(self.customer.has_perm('users.can_create_event'))
        self.assertFalse(self.customer.has_perm('users.can_view_system_analytics'))