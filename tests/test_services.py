"""
Comprehensive unit tests for all service classes in the movie booking application.
Tests business logic, error handling, and service integrations.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, Mock, MagicMock
import stripe

from tests.factories import (
    UserFactory, EventFactory, TicketTypeFactory, DiscountFactory,
    TheaterFactory, MovieFactory, ShowtimeFactory, BookingFactory,
    TicketFactory, create_test_user_with_role, create_complete_event_setup
)

from bookings.booking_service import BookingService
from bookings.payment_service import PaymentService
from bookings.analytics_service import AnalyticsService
from events.services import DiscountService


class BookingServiceTest(TestCase):
    """Test BookingService functionality"""
    
    def setUp(self):
        self.customer = create_test_user_with_role('customer')
        self.event_setup = create_complete_event_setup()
        self.event = self.event_setup['event']
        self.ticket_types = self.event_setup['ticket_types']
    
    def test_create_event_booking_success(self):
        """Test successful event booking creation"""
        booking_data = {
            'customer': self.customer,
            'booking_type': 'event',
            'event': self.event,
            'tickets': [
                {'ticket_type': self.ticket_types[0], 'quantity': 2}
            ]
        }
        
        booking = BookingService.create_booking(booking_data)
        
        self.assertIsNotNone(booking)
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.event, self.event)
        self.assertEqual(booking.booking_type, 'event')
        self.assertTrue(booking.booking_reference)


class PaymentServiceTest(TestCase):
    """Test PaymentService functionality"""
    
    def setUp(self):
        self.booking = BookingFactory(
            total_amount=Decimal('50.00'),
            payment_status='pending'
        )
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_create):
        """Test successful payment intent creation"""
        mock_create.return_value = Mock(
            id='pi_test123',
            client_secret='pi_test123_secret',
            status='requires_payment_method'
        )
        
        payment_data = {
            'amount': self.booking.total_amount,
            'currency': 'usd',
            'booking_id': self.booking.id
        }
        
        result = PaymentService.create_payment_intent(payment_data)
        
        self.assertEqual(result['id'], 'pi_test123')
        self.assertEqual(result['client_secret'], 'pi_test123_secret')
        mock_create.assert_called_once()


class AnalyticsServiceTest(TestCase):
    """Test AnalyticsService functionality"""
    
    def setUp(self):
        self.owner = create_test_user_with_role('event_owner')
        self.event = EventFactory(owner=self.owner)
        
        # Create some bookings for analytics
        for i in range(5):
            booking = BookingFactory(
                event=self.event,
                total_amount=Decimal('25.00'),
                booking_status='confirmed',
                payment_status='completed'
            )
            TicketFactory(booking=booking, price=Decimal('25.00'))
    
    def test_get_event_analytics(self):
        """Test event analytics generation"""
        analytics = AnalyticsService.get_event_analytics(self.event.id)
        
        self.assertIn('total_bookings', analytics)
        self.assertIn('total_revenue', analytics)
        self.assertIn('tickets_sold', analytics)
        
        self.assertEqual(analytics['total_bookings'], 5)
        self.assertEqual(analytics['total_revenue'], Decimal('125.00'))


class DiscountServiceTest(TestCase):
    """Test DiscountService functionality"""
    
    def setUp(self):
        self.event = EventFactory()
        self.discount = DiscountFactory(
            event=self.event,
            discount_type='percentage',
            discount_value=Decimal('20.0'),
            category='promo_code',
            promo_code='SAVE20',
            max_uses=10,
            current_uses=0
        )
    
    def test_validate_discount_code_success(self):
        """Test successful discount code validation"""
        result = DiscountService.validate_discount_code('SAVE20', self.event.id)
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['discount'], self.discount)
    
    def test_apply_discount_percentage(self):
        """Test percentage discount application"""
        original_amount = Decimal('100.00')
        
        discount_amount = DiscountService.apply_discount(
            self.discount, original_amount
        )
        
        self.assertEqual(discount_amount, Decimal('20.00'))