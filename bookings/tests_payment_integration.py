"""
Tests for payment integration and Stripe webhook processing
"""
import json
import stripe
from decimal import Decimal
from unittest.mock import patch, Mock, MagicMock
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Booking, Ticket
from .payment_service import PaymentService, PaymentProcessingError, RefundError, WebhookService
from .services import BookingService
from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime


class PaymentServiceTest(TestCase):
    """Test PaymentService functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test event and booking
        from django.utils import timezone
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=30)
        self.event = Event.objects.create(
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
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.booking = Booking.objects.create(
            customer=self.user,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            fees=Decimal('1.50'),
            total_amount=Decimal('51.50'),
            customer_email='test@example.com'
        )
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_create):
        """Test successful PaymentIntent creation"""
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_test123'
        mock_payment_intent.client_secret = 'pi_test123_secret'
        mock_payment_intent.status = 'requires_payment_method'
        mock_payment_intent.amount = 5150
        mock_payment_intent.currency = 'usd'
        mock_create.return_value = mock_payment_intent
        
        # Create payment intent
        result = PaymentService.create_payment_intent(self.booking)
        
        # Verify result
        self.assertEqual(result['payment_intent_id'], 'pi_test123')
        self.assertEqual(result['client_secret'], 'pi_test123_secret')
        self.assertEqual(result['status'], 'requires_payment_method')
        self.assertEqual(result['amount'], 5150)
        
        # Verify booking was updated
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_transaction_id, 'pi_test123')
        self.assertEqual(self.booking.payment_status, 'processing')
        
        # Verify Stripe was called correctly
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        self.assertEqual(call_args['amount'], 5150)
        self.assertEqual(call_args['currency'], 'usd')
        self.assertIn('booking_id', call_args['metadata'])
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_stripe_error(self, mock_create):
        """Test PaymentIntent creation with Stripe error"""
        # Mock Stripe error
        mock_create.side_effect = stripe.error.CardError(
            message='Your card was declined.',
            param='card',
            code='card_declined'
        )
        
        # Test error handling
        with self.assertRaises(PaymentProcessingError):
            PaymentService.create_payment_intent(self.booking)
    
    @patch('stripe.PaymentIntent.confirm')
    def test_confirm_payment_intent_success(self, mock_confirm):
        """Test successful PaymentIntent confirmation"""
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_test123'
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.client_secret = 'pi_test123_secret'
        mock_confirm.return_value = mock_payment_intent
        
        # Confirm payment intent
        result = PaymentService.confirm_payment_intent('pi_test123', 'pm_test456')
        
        # Verify result
        self.assertEqual(result['payment_intent_id'], 'pi_test123')
        self.assertEqual(result['status'], 'succeeded')
        self.assertFalse(result['requires_action'])
        
        # Verify Stripe was called correctly
        mock_confirm.assert_called_once_with('pi_test123', payment_method='pm_test456')
    
    @patch('stripe.PaymentIntent.retrieve')
    def test_process_successful_payment(self, mock_retrieve):
        """Test processing successful payment"""
        # Set up booking with payment intent ID
        self.booking.payment_transaction_id = 'pi_test123'
        self.booking.save()
        
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.charges.data = [Mock()]
        mock_payment_intent.charges.data[0].payment_method_details.type = 'card'
        mock_retrieve.return_value = mock_payment_intent
        
        # Process successful payment
        result = PaymentService.process_successful_payment('pi_test123')
        
        # Verify result
        self.assertTrue(result)
        
        # Verify booking was updated
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, 'completed')
        self.assertEqual(self.booking.booking_status, 'confirmed')
        self.assertEqual(self.booking.payment_method, 'card')
    
    def test_process_successful_payment_booking_not_found(self):
        """Test processing successful payment with non-existent booking"""
        with self.assertRaises(PaymentProcessingError):
            PaymentService.process_successful_payment('pi_nonexistent')
    
    @patch('stripe.PaymentIntent.retrieve')
    @patch('bookings.services.BookingService.cancel_booking')
    def test_process_failed_payment(self, mock_cancel, mock_retrieve):
        """Test processing failed payment"""
        # Set up booking with payment intent ID
        self.booking.payment_transaction_id = 'pi_test123'
        self.booking.save()
        
        # Process failed payment
        result = PaymentService.process_failed_payment('pi_test123', 'Card declined')
        
        # Verify result
        self.assertTrue(result)
        
        # Verify booking was updated
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, 'failed')
        self.assertEqual(self.booking.booking_status, 'cancelled')
        
        # Verify cancel_booking was called
        mock_cancel.assert_called_once()
    
    @patch('stripe.PaymentIntent.retrieve')
    @patch('stripe.Refund.create')
    def test_create_refund_success(self, mock_refund_create, mock_retrieve):
        """Test successful refund creation"""
        # Set up booking with completed payment
        self.booking.payment_transaction_id = 'pi_test123'
        self.booking.payment_status = 'completed'
        self.booking.save()
        
        # Mock Stripe responses
        mock_charge = Mock()
        mock_charge.id = 'ch_test123'
        mock_payment_intent = Mock()
        mock_payment_intent.charges.data = [mock_charge]
        mock_retrieve.return_value = mock_payment_intent
        
        mock_refund = Mock()
        mock_refund.id = 'rf_test123'
        mock_refund.amount = 5150
        mock_refund.currency = 'usd'
        mock_refund.status = 'succeeded'
        mock_refund.reason = 'requested_by_customer'
        mock_refund_create.return_value = mock_refund
        
        # Create refund
        result = PaymentService.create_refund(self.booking)
        
        # Verify result
        self.assertEqual(result['refund_id'], 'rf_test123')
        self.assertEqual(result['amount'], 5150)
        self.assertEqual(result['status'], 'succeeded')
        
        # Verify booking was updated
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, 'refunded')
        
        # Verify Stripe was called correctly
        mock_refund_create.assert_called_once()
        call_args = mock_refund_create.call_args[1]
        self.assertEqual(call_args['charge'], 'ch_test123')
        self.assertEqual(call_args['amount'], 5150)
    
    def test_create_refund_no_payment_transaction(self):
        """Test refund creation with no payment transaction"""
        with self.assertRaises(RefundError):
            PaymentService.create_refund(self.booking)
    
    def test_create_refund_non_completed_payment(self):
        """Test refund creation with non-completed payment"""
        self.booking.payment_transaction_id = 'pi_test123'
        self.booking.payment_status = 'pending'
        self.booking.save()
        
        with self.assertRaises(RefundError):
            PaymentService.create_refund(self.booking)


class WebhookServiceTest(TestCase):
    """Test WebhookService functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test event
        from django.utils import timezone
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=30)
        self.event = Event.objects.create(
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
        
        self.booking = Booking.objects.create(
            customer=self.user,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            fees=Decimal('1.50'),
            total_amount=Decimal('51.50'),
            customer_email='test@example.com',
            payment_transaction_id='pi_test123'
        )
    
    @patch('stripe.Webhook.construct_event')
    def test_verify_webhook_signature_success(self, mock_construct):
        """Test successful webhook signature verification"""
        mock_construct.return_value = {'type': 'payment_intent.succeeded'}
        
        result = WebhookService.verify_webhook_signature(b'payload', 'signature')
        
        self.assertTrue(result)
        mock_construct.assert_called_once()
    
    @patch('stripe.Webhook.construct_event')
    def test_verify_webhook_signature_invalid(self, mock_construct):
        """Test webhook signature verification with invalid signature"""
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            'Invalid signature', 'signature'
        )
        
        result = WebhookService.verify_webhook_signature(b'payload', 'signature')
        
        self.assertFalse(result)
    
    @patch('bookings.payment_service.PaymentService.process_successful_payment')
    def test_process_payment_succeeded_webhook(self, mock_process):
        """Test processing payment_intent.succeeded webhook"""
        mock_process.return_value = True
        
        event_data = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'status': 'succeeded'
                }
            }
        }
        
        result = WebhookService.process_webhook_event(event_data)
        
        self.assertTrue(result)
        mock_process.assert_called_once_with('pi_test123')
    
    @patch('bookings.payment_service.PaymentService.process_failed_payment')
    def test_process_payment_failed_webhook(self, mock_process):
        """Test processing payment_intent.payment_failed webhook"""
        mock_process.return_value = True
        
        event_data = {
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'last_payment_error': {
                        'message': 'Your card was declined.'
                    }
                }
            }
        }
        
        result = WebhookService.process_webhook_event(event_data)
        
        self.assertTrue(result)
        mock_process.assert_called_once_with('pi_test123', 'Your card was declined.')
    
    def test_process_unhandled_webhook_event(self):
        """Test processing unhandled webhook event type"""
        event_data = {
            'type': 'customer.created',
            'data': {
                'object': {
                    'id': 'cus_test123'
                }
            }
        }
        
        result = WebhookService.process_webhook_event(event_data)
        
        # Should return True for unhandled events (no error)
        self.assertTrue(result)


class PaymentAPITest(APITestCase):
    """Test payment-related API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test event
        from django.utils import timezone
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=30)
        self.event = Event.objects.create(
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
        
        self.booking = Booking.objects.create(
            customer=self.user,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            fees=Decimal('1.50'),
            total_amount=Decimal('51.50'),
            customer_email='test@example.com'
        )
        
        self.client.force_authenticate(user=self.user)
    
    @patch('bookings.services.BookingService.process_booking_payment')
    def test_create_payment_intent_api(self, mock_process):
        """Test create payment intent API endpoint"""
        mock_process.return_value = {
            'success': True,
            'payment_intent_id': 'pi_test123',
            'client_secret': 'pi_test123_secret',
            'status': 'requires_payment_method',
            'requires_action': False
        }
        
        url = reverse('bookings:create_payment_intent', kwargs={'booking_id': self.booking.id})
        data = {
            'payment_method_id': 'pm_test456',
            'confirm_immediately': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['payment_intent_id'], 'pi_test123')
        self.assertEqual(response.data['client_secret'], 'pi_test123_secret')
        
        mock_process.assert_called_once_with(
            booking=self.booking,
            payment_method_id='pm_test456',
            confirm_immediately=False
        )
    
    def test_create_payment_intent_unauthorized(self):
        """Test create payment intent with unauthorized user"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=other_user)
        
        url = reverse('bookings:create_payment_intent', kwargs={'booking_id': self.booking.id})
        
        response = self.client.post(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    @patch('bookings.services.BookingService.confirm_booking_payment')
    def test_confirm_payment_intent_api(self, mock_confirm):
        """Test confirm payment intent API endpoint"""
        mock_confirm.return_value = {
            'success': True,
            'status': 'succeeded',
            'requires_action': False
        }
        
        url = reverse('bookings:confirm_payment_intent', kwargs={'booking_id': self.booking.id})
        data = {'payment_method_id': 'pm_test456'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'succeeded')
        
        mock_confirm.assert_called_once_with(
            booking=self.booking,
            payment_method_id='pm_test456'
        )
    
    @patch('bookings.payment_service.PaymentService.retrieve_payment_intent')
    def test_get_payment_status_api(self, mock_retrieve):
        """Test get payment status API endpoint"""
        self.booking.payment_transaction_id = 'pi_test123'
        self.booking.payment_status = 'completed'
        self.booking.save()
        
        mock_retrieve.return_value = {
            'payment_intent_id': 'pi_test123',
            'status': 'succeeded',
            'amount': 5150,
            'currency': 'usd'
        }
        
        url = reverse('bookings:get_payment_status', kwargs={'booking_id': self.booking.id})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment_status'], 'completed')
        self.assertEqual(response.data['payment_transaction_id'], 'pi_test123')
    
    @patch('bookings.services.BookingService.process_booking_refund')
    def test_request_refund_api(self, mock_refund):
        """Test request refund API endpoint"""
        mock_refund.return_value = {
            'success': True,
            'refund_id': 'rf_test123',
            'amount': 51.50,
            'status': 'succeeded'
        }
        
        url = reverse('bookings:request_refund', kwargs={'booking_id': self.booking.id})
        data = {
            'amount': '25.75',
            'reason': 'requested_by_customer'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['refund_id'], 'rf_test123')
        self.assertEqual(response.data['amount'], 51.50)
        
        mock_refund.assert_called_once_with(
            booking=self.booking,
            refund_amount=Decimal('25.75'),
            reason='requested_by_customer'
        )
    
    @patch('bookings.services.BookingService.retry_booking_payment')
    def test_retry_payment_api(self, mock_retry):
        """Test retry payment API endpoint"""
        self.booking.payment_status = 'failed'
        self.booking.save()
        
        mock_retry.return_value = {
            'success': True,
            'payment_intent_id': 'pi_test456',
            'client_secret': 'pi_test456_secret',
            'status': 'requires_payment_method'
        }
        
        url = reverse('bookings:retry_payment', kwargs={'booking_id': self.booking.id})
        data = {'payment_method_id': 'pm_test789'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment_intent_id'], 'pi_test456')
        
        mock_retry.assert_called_once_with(
            booking=self.booking,
            payment_method_id='pm_test789'
        )
    
    @override_settings(STRIPE_PUBLISHABLE_KEY='pk_test_123')
    def test_get_stripe_config_api(self):
        """Test get Stripe config API endpoint"""
        url = reverse('bookings:get_stripe_config')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['publishable_key'], 'pk_test_123')
        self.assertEqual(response.data['currency'], 'usd')


class WebhookAPITest(APITestCase):
    """Test webhook API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test event
        from django.utils import timezone
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=30)
        self.event = Event.objects.create(
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
        
        self.booking = Booking.objects.create(
            customer=self.user,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            fees=Decimal('1.50'),
            total_amount=Decimal('51.50'),
            customer_email='test@example.com',
            payment_transaction_id='pi_test123'
        )
    
    @patch('bookings.payment_service.WebhookService.verify_webhook_signature')
    @patch('bookings.payment_service.WebhookService.process_webhook_event')
    def test_stripe_webhook_endpoint(self, mock_process, mock_verify):
        """Test Stripe webhook endpoint"""
        mock_verify.return_value = True
        mock_process.return_value = True
        
        url = reverse('bookings:stripe_webhook')
        payload = json.dumps({
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'status': 'succeeded'
                }
            }
        })
        
        response = self.client.post(
            url,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_verify.assert_called_once()
        mock_process.assert_called_once()
    
    @patch('bookings.payment_service.WebhookService.verify_webhook_signature')
    def test_stripe_webhook_invalid_signature(self, mock_verify):
        """Test Stripe webhook with invalid signature"""
        mock_verify.return_value = False
        
        url = reverse('bookings:stripe_webhook')
        payload = json.dumps({'type': 'test'})
        
        response = self.client.post(
            url,
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_stripe_webhook_missing_signature(self):
        """Test Stripe webhook with missing signature"""
        url = reverse('bookings:stripe_webhook')
        payload = json.dumps({'type': 'test'})
        
        response = self.client.post(
            url,
            data=payload,
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_webhook_health_check(self):
        """Test webhook health check endpoint"""
        url = reverse('bookings:webhook_health_check')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['service'], 'stripe_webhooks')


class PaymentIntegrationTest(TestCase):
    """Integration tests for complete payment workflows"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test event
        from django.utils import timezone
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=30)
        self.event = Event.objects.create(
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
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
    
    @patch('stripe.PaymentIntent.create')
    @patch('stripe.PaymentIntent.retrieve')
    def test_complete_booking_payment_workflow(self, mock_retrieve, mock_create):
        """Test complete booking and payment workflow"""
        # Mock Stripe PaymentIntent creation
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_test123'
        mock_payment_intent.client_secret = 'pi_test123_secret'
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.amount = 5150
        mock_payment_intent.currency = 'usd'
        mock_payment_intent.charges.data = [Mock()]
        mock_payment_intent.charges.data[0].payment_method_details.type = 'card'
        mock_create.return_value = mock_payment_intent
        mock_retrieve.return_value = mock_payment_intent
        
        # Create booking
        booking = BookingService.create_event_booking_with_concurrency_control(
            customer=self.user,
            event=self.event,
            ticket_selections=[{
                'ticket_type_id': self.ticket_type.id,
                'quantity': 1
            }]
        )
        
        # Process payment
        payment_result = BookingService.process_booking_payment(
            booking=booking,
            payment_method_id='pm_test456',
            confirm_immediately=True
        )
        
        # Verify payment was processed
        self.assertTrue(payment_result['success'])
        self.assertEqual(payment_result['payment_intent_id'], 'pi_test123')
        
        # Simulate successful payment webhook
        PaymentService.process_successful_payment('pi_test123')
        
        # Verify booking status
        booking.refresh_from_db()
        self.assertEqual(booking.payment_status, 'completed')
        self.assertEqual(booking.booking_status, 'confirmed')
        self.assertEqual(booking.payment_method, 'card')
        
        # Verify tickets were created
        self.assertEqual(booking.tickets.count(), 1)
        ticket = booking.tickets.first()
        self.assertEqual(ticket.status, 'valid')
        self.assertEqual(ticket.price, Decimal('50.00'))
    
    @patch('stripe.PaymentIntent.retrieve')
    @patch('stripe.Refund.create')
    def test_complete_refund_workflow(self, mock_refund_create, mock_retrieve):
        """Test complete refund workflow"""
        # Create booking with completed payment
        booking = Booking.objects.create(
            customer=self.user,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            fees=Decimal('1.50'),
            total_amount=Decimal('51.50'),
            customer_email='test@example.com',
            payment_transaction_id='pi_test123',
            payment_status='completed',
            booking_status='confirmed'
        )
        
        # Mock Stripe responses
        mock_charge = Mock()
        mock_charge.id = 'ch_test123'
        mock_payment_intent = Mock()
        mock_payment_intent.charges.data = [mock_charge]
        mock_retrieve.return_value = mock_payment_intent
        
        mock_refund = Mock()
        mock_refund.id = 'rf_test123'
        mock_refund.amount = 5150
        mock_refund.currency = 'usd'
        mock_refund.status = 'succeeded'
        mock_refund.reason = 'requested_by_customer'
        mock_refund_create.return_value = mock_refund
        
        # Mock the PaymentService.create_refund to update booking status like the real method
        def mock_create_refund_side_effect(booking, amount=None, reason='requested_by_customer'):
            # Simulate the real PaymentService.create_refund behavior
            booking.payment_status = 'refunded'
            booking.save()
            return {
                'refund_id': 'rf_test123',
                'amount': 5150,
                'currency': 'usd',
                'status': 'succeeded',
                'reason': reason,
            }
        
        # Apply the side effect to the PaymentService.create_refund method
        with patch('bookings.services.PaymentService.create_refund', side_effect=mock_create_refund_side_effect):
            # Process refund
            refund_result = BookingService.process_booking_refund(
                booking=booking,
                reason='Customer requested refund'
            )
        
            # Verify refund was processed
            self.assertTrue(refund_result['success'], f"Refund failed: {refund_result}")
            self.assertEqual(refund_result['refund_id'], 'rf_test123')
            
            # Verify booking status
            booking.refresh_from_db()
            self.assertEqual(booking.payment_status, 'refunded')
            self.assertEqual(booking.booking_status, 'cancelled')