from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock

from .models import Booking, Ticket, CustomerReview, WaitlistEntry
from .booking_service import BookingService
from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime
from users.models import UserProfile


class CustomerBookingManagementTestCase(APITestCase):
    """Test case for customer booking management functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123'
        )
        
        self.event_owner = User.objects.create_user(
            username='event_owner',
            email='owner@example.com',
            password='testpass123'
        )
        
        # Create test event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A great concert',
            venue='Test Venue',
            address='123 Test St',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            status='published'
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100,
            quantity_sold=0
        )
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.customer) 
   
    def test_get_booking_history(self):
        """Test retrieving customer booking history"""
        # Create test booking
        booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='TEST001',
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        url = reverse('bookings:customer-bookings-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['booking_reference'], 'TEST001')
    
    def test_filter_bookings_by_type(self):
        """Test filtering bookings by type"""
        # Create event booking
        event_booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='EVENT001',
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        url = reverse('bookings:customer-bookings-list')
        response = self.client.get(url, {'booking_type': 'event'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['booking_type'], 'event')
    
    @patch('bookings.booking_service.PaymentService.process_refund')
    def test_cancel_booking_with_refund(self, mock_refund):
        """Test cancelling a booking with refund"""
        mock_refund.return_value = {'success': True, 'refund_id': 'refund_123'}
        
        # Create booking
        booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='CANCEL001',
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        # Create ticket
        ticket = Ticket.objects.create(
            booking=booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00'),
            qr_code_data='test_qr_data'
        )
        
        url = reverse('bookings:customer-bookings-cancel', kwargs={'pk': booking.id})
        response = self.client.post(url, {
            'reason': 'Changed plans',
            'refund_requested': True
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Booking cancelled successfully', response.data['message'])
        
        # Check booking status updated
        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, 'cancelled')
        
        # Check tickets cancelled
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, 'cancelled')
    
    def test_create_customer_review(self):
        """Test creating a customer review"""
        # Create completed booking
        booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='REVIEW001',
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            booking_status='completed',
            customer_email=self.customer.email
        )
        
        # Make event end in the past
        self.event.end_datetime = timezone.now() - timedelta(hours=1)
        self.event.save()
        
        url = reverse('bookings:reviews-list')
        response = self.client.post(url, {
            'booking_id': booking.id,
            'rating': 5,
            'review_text': 'Great event!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 5)
        self.assertEqual(response.data['review_text'], 'Great event!')
        
        # Check review created in database
        review = CustomerReview.objects.get(booking=booking)
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.reviewer, self.customer)
    
    def test_join_event_waitlist(self):
        """Test joining waitlist for sold-out event"""
        # Make ticket type sold out
        self.ticket_type.quantity_sold = self.ticket_type.quantity_available
        self.ticket_type.save()
        
        url = reverse('bookings:waitlist-join-event-waitlist')
        response = self.client.post(url, {
            'event_id': self.event.id,
            'ticket_type_id': self.ticket_type.id,
            'quantity': 2,
            'max_price_willing_to_pay': '60.00'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['quantity_requested'], 2)
        self.assertEqual(response.data['max_price_willing_to_pay'], '60.00')
        
        # Check waitlist entry created
        waitlist_entry = WaitlistEntry.objects.get(
            customer=self.customer,
            event=self.event
        )
        self.assertEqual(waitlist_entry.quantity_requested, 2)
    
    def test_booking_history_summary(self):
        """Test getting booking history summary"""
        # Create test bookings
        Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='SUMMARY001',
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        url = reverse('bookings:booking_history_summary')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_bookings'], 1)
        self.assertEqual(response.data['confirmed_bookings'], 1)
        self.assertEqual(response.data['total_spent'], 50)
    
    def test_unauthorized_access(self):
        """Test that unauthorized users cannot access booking data"""
        self.client.force_authenticate(user=None)
        
        url = reverse('bookings:customer-bookings-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BookingServiceTestCase(TestCase):
    """Test case for BookingService functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123'
        )
        
        self.event_owner = User.objects.create_user(
            username='event_owner',
            email='owner@example.com',
            password='testpass123'
        )
        
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='A test event',
            venue='Test Venue',
            address='123 Test St',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            status='published'
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100,
            quantity_sold=1
        )
        
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='TEST001',
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00'),
            qr_code_data='test_qr_data'
        )
    
    def test_calculate_refund_amount_full_refund(self):
        """Test calculating full refund amount (48+ hours before event)"""
        refund_amount = BookingService._calculate_refund_amount(self.booking)
        self.assertEqual(refund_amount, Decimal('50.00'))
    
    def test_calculate_refund_amount_partial_refund(self):
        """Test calculating partial refund amount (24-48 hours before event)"""
        # Set event to start in 30 hours
        self.event.start_datetime = timezone.now() + timedelta(hours=30)
        self.event.save()
        
        refund_amount = BookingService._calculate_refund_amount(self.booking)
        self.assertEqual(refund_amount, Decimal('40.00'))  # 80% of 50.00
    
    def test_calculate_refund_amount_no_refund(self):
        """Test calculating no refund (less than 2 hours before event)"""
        # Set event to start in 1 hour
        self.event.start_datetime = timezone.now() + timedelta(hours=1)
        self.event.save()
        
        refund_amount = BookingService._calculate_refund_amount(self.booking)
        self.assertEqual(refund_amount, Decimal('0.00'))
    
    def test_release_event_inventory(self):
        """Test releasing event inventory back to ticket types"""
        original_sold = self.ticket_type.quantity_sold
        
        BookingService._release_inventory(self.booking)
        
        self.ticket_type.refresh_from_db()
        self.assertEqual(self.ticket_type.quantity_sold, original_sold - 1)
    
    @patch('bookings.booking_service.PaymentService.process_refund')
    def test_cancel_booking_success(self, mock_refund):
        """Test successful booking cancellation"""
        mock_refund.return_value = {'success': True, 'refund_id': 'refund_123'}
        
        result = BookingService.cancel_booking(
            booking=self.booking,
            reason='Test cancellation',
            refund_requested=True,
            cancelled_by=self.customer
        )
        
        self.assertTrue(result['success'])
        self.assertIn('cancelled successfully', result['message'])
        
        # Check booking status
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.booking_status, 'cancelled')
        
        # Check ticket status
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'cancelled')
    
    def test_cancel_already_cancelled_booking(self):
        """Test cancelling an already cancelled booking"""
        self.booking.booking_status = 'cancelled'
        self.booking.save()
        
        result = BookingService.cancel_booking(
            booking=self.booking,
            reason='Test cancellation'
        )
        
        self.assertFalse(result['success'])
        self.assertIn('already cancelled', result['message'])
    
    def test_get_booking_analytics(self):
        """Test getting booking analytics for a user"""
        analytics = BookingService.get_booking_analytics(self.customer)
        
        self.assertEqual(analytics['total_bookings'], 1)
        self.assertEqual(analytics['total_spent'], Decimal('50.00'))
        self.assertEqual(analytics['average_booking_value'], Decimal('50.00'))
        self.assertIn('status_breakdown', analytics)
        self.assertIn('type_breakdown', analytics)
        self.assertIn('monthly_trends', analytics)