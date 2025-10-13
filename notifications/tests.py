from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.core import mail
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from celery import current_app
from celery.result import EagerResult

from users.models import UserProfile
from bookings.models import Booking
from events.models import Event
from .models import NotificationTemplate, NotificationPreference, NotificationLog
from .services import NotificationService
from .tasks import (
    send_notification_task,
    send_booking_confirmation_task,
    send_booking_reminders,
    send_bulk_notification_task
)


class NotificationServiceTest(TestCase):
    """Test notification service functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user_profile = self.user.profile
        self.user_profile.role = 'customer'
        self.user_profile.phone_number = '+1234567890'
        self.user_profile.save()
        
        # Create notification templates
        self.email_template = NotificationTemplate.objects.create(
            name='Test Email Template',
            notification_type='booking_confirmation',
            channel='email',
            subject='Test Subject - {{ booking_reference }}',
            template_content='Hello {{ user_name }}, your booking {{ booking_reference }} is confirmed.',
            is_active=True
        )
        
        self.sms_template = NotificationTemplate.objects.create(
            name='Test SMS Template',
            notification_type='booking_confirmation',
            channel='sms',
            subject='',
            template_content='Booking {{ booking_reference }} confirmed for {{ user_name }}.',
            is_active=True
        )
    
    def test_send_email_notification(self):
        """Test sending email notification"""
        service = NotificationService()
        context_data = {
            'user_name': 'Test User',
            'booking_reference': 'TEST-123'
        }
        
        result = service.send_notification(
            user=self.user,
            notification_type='booking_confirmation',
            context_data=context_data,
            channels=['email']
        )
        
        self.assertTrue(result['email'])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('TEST-123', mail.outbox[0].subject)
        self.assertIn('Test User', mail.outbox[0].body)
        
        # Check notification log
        log = NotificationLog.objects.filter(user=self.user, channel='email').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'sent')
    
    @patch('notifications.services.Client')
    @override_settings(TWILIO_ACCOUNT_SID='test_sid', TWILIO_AUTH_TOKEN='test_token', TWILIO_PHONE_NUMBER='+1234567890')
    def test_send_sms_notification(self, mock_twilio_client):
        """Test sending SMS notification"""
        # Mock Twilio client
        mock_client_instance = MagicMock()
        mock_twilio_client.return_value = mock_client_instance
        mock_message = MagicMock()
        mock_message.sid = 'test_message_sid'
        mock_client_instance.messages.create.return_value = mock_message
        
        # Create a new service instance to pick up the settings
        service = NotificationService()
        context_data = {
            'user_name': 'Test User',
            'booking_reference': 'TEST-123'
        }
        
        result = service.send_notification(
            user=self.user,
            notification_type='booking_confirmation',
            context_data=context_data,
            channels=['sms']
        )
        
        self.assertTrue(result['sms'])
        mock_client_instance.messages.create.assert_called_once()
        
        # Check notification log
        log = NotificationLog.objects.filter(user=self.user, channel='sms').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'sent')
    
    def test_user_preferences_respected(self):
        """Test that user preferences are respected"""
        # Disable email notifications
        preferences = NotificationPreference.objects.create(
            user=self.user,
            email_enabled=False,
            booking_confirmation_email=False
        )
        
        service = NotificationService()
        context_data = {
            'user_name': 'Test User',
            'booking_reference': 'TEST-123'
        }
        
        result = service.send_notification(
            user=self.user,
            notification_type='booking_confirmation',
            context_data=context_data
        )
        
        # Should not send email due to preferences
        self.assertNotIn('email', result)
        self.assertEqual(len(mail.outbox), 0)
    
    def test_missing_template_handling(self):
        """Test handling of missing notification templates"""
        service = NotificationService()
        context_data = {
            'user_name': 'Test User',
            'booking_reference': 'TEST-123'
        }
        
        result = service.send_notification(
            user=self.user,
            notification_type='nonexistent_type',
            context_data=context_data,
            channels=['email']
        )
        
        self.assertFalse(result['email'])
        self.assertEqual(len(mail.outbox), 0)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class NotificationTaskTest(TestCase):
    """Test Celery notification tasks"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user_profile = self.user.profile
        self.user_profile.role = 'customer'
        self.user_profile.phone_number = '+1234567890'
        self.user_profile.save()
        
        # Create notification template
        self.email_template = NotificationTemplate.objects.create(
            name='Test Email Template',
            notification_type='booking_confirmation',
            channel='email',
            subject='Test Subject - {{ booking_reference }}',
            template_content='Hello {{ user_name }}, your booking {{ booking_reference }} is confirmed.',
            is_active=True
        )
    
    def test_send_notification_task(self):
        """Test send_notification_task"""
        context_data = {
            'user_name': 'Test User',
            'booking_reference': 'TEST-123'
        }
        
        result = send_notification_task.delay(
            user_id=self.user.id,
            notification_type='booking_confirmation',
            context_data=context_data,
            channels=['email']
        )
        
        self.assertIsInstance(result, EagerResult)
        self.assertTrue(result.successful())
        self.assertEqual(len(mail.outbox), 1)
    
    def test_send_booking_confirmation_task(self):
        """Test send_booking_confirmation_task"""
        # Create a booking
        from django.utils import timezone
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=30)
        event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=future_date,
            end_datetime=future_date + timedelta(hours=3),
            status='published'
        )
        
        booking = Booking.objects.create(
            customer=self.user,
            booking_type='event',
            event=event,
            booking_reference='TEST-123',
            subtotal=50.00,
            discount_amount=0.00,
            fees=2.50,
            total_amount=52.50,
            payment_status='completed',
            booking_status='confirmed'
        )
        
        context_data = {
            'user_name': 'Test User',
            'booking_reference': 'TEST-123',
            'event_title': 'Test Event'
        }
        
        result = send_booking_confirmation_task.delay(
            user_id=self.user.id,
            booking_id=booking.id,
            context_data=context_data
        )
        
        self.assertIsInstance(result, EagerResult)
        self.assertTrue(result.successful())
        self.assertEqual(len(mail.outbox), 1)
    
    def test_send_bulk_notification_task(self):
        """Test send_bulk_notification_task"""
        # Create additional users
        user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        
        context_data = {
            'message': 'System maintenance scheduled',
            'scheduled_time': '2024-12-25 02:00:00'
        }
        
        # Create system maintenance template
        NotificationTemplate.objects.create(
            name='System Maintenance Email',
            notification_type='system_maintenance',
            channel='email',
            subject='System Maintenance',
            template_content='{{ message }} at {{ scheduled_time }}',
            is_active=True
        )
        
        result = send_bulk_notification_task.delay(
            user_ids=[self.user.id, user2.id],
            notification_type='system_maintenance',
            context_data=context_data,
            channels=['email']
        )
        
        self.assertIsInstance(result, EagerResult)
        self.assertTrue(result.successful())


class NotificationAPITest(APITestCase):
    """Test notification API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user_profile = self.user.profile
        self.user_profile.role = 'customer'
        self.user_profile.phone_number = '+1234567890'
        self.user_profile.save()
        
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True
        )
        self.admin_profile = self.admin_user.profile
        self.admin_profile.role = 'admin'
        self.admin_profile.save()
    
    def test_get_notification_preferences(self):
        """Test getting notification preferences"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:preferences')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['email_enabled'])
        self.assertTrue(response.data['sms_enabled'])
    
    def test_update_notification_preferences(self):
        """Test updating notification preferences"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:preferences')
        
        data = {
            'email_enabled': False,
            'booking_reminder_sms': False
        }
        
        response = self.client.put(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['email_enabled'])
        self.assertFalse(response.data['booking_reminder_sms'])
    
    def test_opt_out_all_notifications(self):
        """Test opting out of all notifications"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:opt_out_all')
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check preferences were updated
        preferences = NotificationPreference.objects.get(user=self.user)
        self.assertFalse(preferences.email_enabled)
        self.assertFalse(preferences.sms_enabled)
    
    def test_opt_in_essential_notifications(self):
        """Test opting in to essential notifications only"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:opt_in_essential')
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check preferences were updated
        preferences = NotificationPreference.objects.get(user=self.user)
        self.assertTrue(preferences.email_enabled)
        self.assertTrue(preferences.booking_confirmation_email)
        self.assertFalse(preferences.booking_reminder_email)
    
    def test_notification_logs_list(self):
        """Test listing notification logs"""
        # Create a notification log
        NotificationLog.objects.create(
            user=self.user,
            notification_type='booking_confirmation',
            channel='email',
            recipient='test@example.com',
            subject='Test',
            content='Test content',
            status='sent'
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:logs')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_send_test_notification(self):
        """Test sending test notification"""
        # Create template
        NotificationTemplate.objects.create(
            name='Test Template',
            notification_type='booking_confirmation',
            channel='email',
            subject='Test Subject',
            template_content='Test content for {{ user_name }}',
            is_active=True
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:test')
        
        data = {
            'notification_type': 'booking_confirmation',
            'channel': 'email',
            'context_data': {'user_name': 'Test User'}
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Test email notification sent', response.data['message'])
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_send_bulk_notification_admin_only(self):
        """Test that bulk notifications require admin permissions"""
        # Test as regular user (should fail)
        self.client.force_authenticate(user=self.user)
        url = reverse('notifications:send_bulk')
        
        data = {
            'user_ids': [self.user.id],
            'notification_type': 'system_maintenance',
            'context_data': {'message': 'Test maintenance'}
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test as admin user (should succeed)
        NotificationTemplate.objects.create(
            name='System Maintenance Template',
            notification_type='system_maintenance',
            channel='email',
            subject='Maintenance',
            template_content='{{ message }}',
            is_active=True
        )
        
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class NotificationModelTest(TestCase):
    """Test notification models"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_notification_template_creation(self):
        """Test creating notification template"""
        template = NotificationTemplate.objects.create(
            name='Test Template',
            notification_type='booking_confirmation',
            channel='email',
            subject='Test Subject',
            template_content='Test content',
            is_active=True
        )
        
        self.assertEqual(str(template), 'Test Template - email')
        self.assertTrue(template.is_active)
    
    def test_notification_preference_creation(self):
        """Test creating notification preferences"""
        preferences = NotificationPreference.objects.create(
            user=self.user,
            email_enabled=True,
            sms_enabled=False
        )
        
        self.assertEqual(str(preferences), f'Notification preferences for {self.user.username}')
        self.assertTrue(preferences.email_enabled)
        self.assertFalse(preferences.sms_enabled)
    
    def test_notification_log_creation(self):
        """Test creating notification log"""
        log = NotificationLog.objects.create(
            user=self.user,
            notification_type='booking_confirmation',
            channel='email',
            recipient='test@example.com',
            subject='Test Subject',
            content='Test content',
            status='sent'
        )
        
        self.assertIn('booking_confirmation', str(log))
        self.assertIn('test@example.com', str(log))
        self.assertEqual(log.status, 'sent')
    
    def test_unique_template_constraint(self):
        """Test unique constraint on notification templates"""
        NotificationTemplate.objects.create(
            name='Test Template 1',
            notification_type='booking_confirmation',
            channel='email',
            subject='Test Subject 1',
            template_content='Test content 1'
        )
        
        # This should raise an integrity error due to unique constraint
        with self.assertRaises(Exception):
            NotificationTemplate.objects.create(
                name='Test Template 2',
                notification_type='booking_confirmation',
                channel='email',  # Same type and channel
                subject='Test Subject 2',
                template_content='Test content 2'
            )