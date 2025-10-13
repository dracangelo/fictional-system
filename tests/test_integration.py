"""
Integration tests for API endpoints and complete workflows.
Tests end-to-end functionality and API behavior.
"""

import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import json

from tests.factories import (
    UserFactory, EventFactory, TicketTypeFactory, DiscountFactory,
    TheaterFactory, MovieFactory, ShowtimeFactory, BookingFactory,
    TicketFactory, create_test_user_with_role, create_complete_event_setup,
    create_complete_theater_setup
)

from users.models import UserProfile
from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking, Ticket


class AuthenticationAPITest(APITestCase):
    """Test authentication API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        url = reverse('auth:register')
        response = self.client.post(url, self.user_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('token', response.data)
        
        # Verify user was created
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(hasattr(user, 'profile'))
    
    def test_user_login(self):
        """Test user login endpoint"""
        # Create user first
        user = UserFactory(username='testuser', email='test@example.com')
        user.set_password('testpass123')
        user.save()
        
        url = reverse('auth:login')
        login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
    
    def test_user_profile_access(self):
        """Test authenticated user profile access"""
        user = create_test_user_with_role('customer')
        self.client.force_authenticate(user=user)
        
        url = reverse('auth:profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], user.username)
        self.assertEqual(response.data['profile']['role'], 'customer')


class EventAPITest(APITestCase):
    """Test Event API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.event_owner = create_test_user_with_role('event_owner')
        self.customer = create_test_user_with_role('customer')
        self.event = EventFactory(owner=self.event_owner)
    
    def test_list_events_public(self):
        """Test public event listing"""
        url = reverse('events:event-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_create_event_authorized(self):
        """Test event creation by authorized user"""
        self.client.force_authenticate(user=self.event_owner)
        
        event_data = {
            'title': 'New Concert',
            'description': 'Amazing concert event',
            'venue': 'Concert Hall',
            'address': '123 Music St',
            'category': 'concert',
            'start_datetime': (timezone.now() + timedelta(days=30)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=30, hours=3)).isoformat()
        }
        
        url = reverse('events:event-list')
        response = self.client.post(url, event_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Concert')
        self.assertEqual(response.data['owner'], self.event_owner.id)
    
    def test_create_event_unauthorized(self):
        """Test event creation by unauthorized user"""
        self.client.force_authenticate(user=self.customer)
        
        event_data = {
            'title': 'Unauthorized Event',
            'description': 'Should not be created',
            'venue': 'Some Venue',
            'address': '123 Street',
            'category': 'concert',
            'start_datetime': (timezone.now() + timedelta(days=30)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=30, hours=3)).isoformat()
        }
        
        url = reverse('events:event-list')
        response = self.client.post(url, event_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_event_search_and_filtering(self):
        """Test event search and filtering functionality"""
        # Create events with different categories
        EventFactory(title='Rock Concert', category='concert')
        EventFactory(title='Comedy Show', category='comedy')
        
        url = reverse('events:event-list')
        
        # Test category filtering
        response = self.client.get(url, {'category': 'concert'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test search by title
        response = self.client.get(url, {'search': 'Rock'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_event_ticket_types_management(self):
        """Test ticket type management for events"""
        self.client.force_authenticate(user=self.event_owner)
        
        ticket_type_data = {
            'name': 'VIP',
            'description': 'VIP access with perks',
            'price': '75.00',
            'quantity_available': 50
        }
        
        url = reverse('events:event-ticket-types', kwargs={'pk': self.event.id})
        response = self.client.post(url, ticket_type_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'VIP')
        self.assertEqual(response.data['event'], self.event.id)


class TheaterAPITest(APITestCase):
    """Test Theater API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.theater_owner = create_test_user_with_role('theater_owner')
        self.customer = create_test_user_with_role('customer')
        self.theater = TheaterFactory(owner=self.theater_owner)
    
    def test_list_theaters_public(self):
        """Test public theater listing"""
        url = reverse('theaters:theater-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_create_theater_authorized(self):
        """Test theater creation by authorized user"""
        self.client.force_authenticate(user=self.theater_owner)
        
        theater_data = {
            'name': 'New Cinema',
            'address': '456 Movie Ave',
            'city': 'Los Angeles',
            'state': 'CA',
            'zip_code': '90210',
            'screens': 5,
            'seating_layout': {
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 15,
                        'seats_per_row': 20
                    }
                ]
            }
        }
        
        url = reverse('theaters:theater-list')
        response = self.client.post(url, theater_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Cinema')
        self.assertEqual(response.data['owner'], self.theater_owner.id)
    
    def test_movie_management(self):
        """Test movie creation and management"""
        self.client.force_authenticate(user=self.theater_owner)
        
        movie_data = {
            'title': 'New Action Movie',
            'description': 'Exciting action film',
            'genre': 'action',
            'duration': 120,
            'rating': 'PG-13',
            'director': 'Famous Director',
            'release_date': '2024-01-15'
        }
        
        url = reverse('theaters:movie-list')
        response = self.client.post(url, movie_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Action Movie')
    
    def test_showtime_scheduling(self):
        """Test showtime scheduling"""
        self.client.force_authenticate(user=self.theater_owner)
        
        movie = MovieFactory()
        showtime_data = {
            'theater': self.theater.id,
            'movie': movie.id,
            'screen_number': 1,
            'start_time': (timezone.now() + timedelta(days=7, hours=19)).isoformat(),
            'base_price': '12.00',
            'total_seats': 300
        }
        
        url = reverse('theaters:showtime-list')
        response = self.client.post(url, showtime_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['theater'], self.theater.id)
        self.assertEqual(response.data['movie'], movie.id)


class BookingAPITest(APITestCase):
    """Test Booking API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.customer = create_test_user_with_role('customer')
        self.event_setup = create_complete_event_setup()
        self.event = self.event_setup['event']
        self.ticket_types = self.event_setup['ticket_types']
    
    def test_create_event_booking(self):
        """Test event booking creation"""
        self.client.force_authenticate(user=self.customer)
        
        booking_data = {
            'booking_type': 'event',
            'event': self.event.id,
            'tickets': [
                {
                    'ticket_type': self.ticket_types[0].id,
                    'quantity': 2
                }
            ],
            'customer_phone': '+1234567890'
        }
        
        url = reverse('bookings:booking-list')
        response = self.client.post(url, booking_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['customer'], self.customer.id)
        self.assertEqual(response.data['event'], self.event.id)
        self.assertTrue(response.data['booking_reference'])
    
    def test_create_movie_booking(self):
        """Test movie booking creation"""
        self.client.force_authenticate(user=self.customer)
        
        theater_setup = create_complete_theater_setup()
        showtime = theater_setup['showtimes'][0]
        
        booking_data = {
            'booking_type': 'movie',
            'showtime': showtime.id,
            'seats': ['A1', 'A2'],
            'customer_phone': '+1234567890'
        }
        
        url = reverse('bookings:booking-list')
        response = self.client.post(url, booking_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['showtime'], showtime.id)
        self.assertEqual(len(response.data['tickets']), 2)
    
    def test_booking_with_discount(self):
        """Test booking creation with discount code"""
        self.client.force_authenticate(user=self.customer)
        
        discount = self.event_setup['discounts'][0]
        
        booking_data = {
            'booking_type': 'event',
            'event': self.event.id,
            'tickets': [
                {
                    'ticket_type': self.ticket_types[0].id,
                    'quantity': 1
                }
            ],
            'discount_code': discount.promo_code,
            'customer_phone': '+1234567890'
        }
        
        url = reverse('bookings:booking-list')
        response = self.client.post(url, booking_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreater(response.data['discount_amount'], 0)
        self.assertEqual(response.data['applied_discount'], discount.id)
    
    def test_list_user_bookings(self):
        """Test listing user's bookings"""
        self.client.force_authenticate(user=self.customer)
        
        # Create some bookings
        BookingFactory(customer=self.customer)
        BookingFactory(customer=self.customer)
        
        url = reverse('bookings:booking-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Verify all bookings belong to the authenticated user
        for booking in response.data['results']:
            self.assertEqual(booking['customer'], self.customer.id)
    
    def test_cancel_booking(self):
        """Test booking cancellation"""
        self.client.force_authenticate(user=self.customer)
        
        booking = BookingFactory(
            customer=self.customer,
            booking_status='confirmed',
            payment_status='completed'
        )
        
        url = reverse('bookings:booking-cancel', kwargs={'pk': booking.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, 'cancelled')


class PaymentIntegrationTest(APITestCase):
    """Test payment integration workflows"""
    
    def setUp(self):
        self.client = APIClient()
        self.customer = create_test_user_with_role('customer')
        self.booking = BookingFactory(
            customer=self.customer,
            total_amount=Decimal('50.00'),
            payment_status='pending'
        )
    
    def test_create_payment_intent(self):
        """Test payment intent creation"""
        self.client.force_authenticate(user=self.customer)
        
        url = reverse('payments:create-intent')
        payment_data = {
            'booking_id': self.booking.id,
            'payment_method_id': 'pm_card_visa'
        }
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(
                id='pi_test123',
                client_secret='pi_test123_secret'
            )
            
            response = self.client.post(url, payment_data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('client_secret', response.data)
    
    def test_payment_webhook_processing(self):
        """Test Stripe webhook processing"""
        webhook_data = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount_received': 5000,
                    'status': 'succeeded',
                    'metadata': {
                        'booking_id': str(self.booking.id)
                    }
                }
            }
        }
        
        url = reverse('payments:webhook')
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_data
            
            response = self.client.post(
                url,
                json.dumps(webhook_data),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)


class AdminAPITest(APITestCase):
    """Test admin API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = create_test_user_with_role('admin')
        self.customer = create_test_user_with_role('customer')
    
    def test_admin_analytics_access(self):
        """Test admin analytics access"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin:analytics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_events', response.data)
        self.assertIn('total_bookings', response.data)
    
    def test_admin_analytics_unauthorized(self):
        """Test admin analytics access by non-admin"""
        self.client.force_authenticate(user=self.customer)
        
        url = reverse('admin:analytics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_user_management(self):
        """Test user management operations"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin:users')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)  # admin + customer


class EndToEndWorkflowTest(APITestCase):
    """Test complete end-to-end workflows"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_complete_event_booking_workflow(self):
        """Test complete event booking workflow from creation to completion"""
        # 1. Create event owner and event
        event_owner = create_test_user_with_role('event_owner')
        self.client.force_authenticate(user=event_owner)
        
        event_data = {
            'title': 'Test Concert',
            'description': 'Amazing test concert',
            'venue': 'Test Venue',
            'address': '123 Test St',
            'category': 'concert',
            'start_datetime': (timezone.now() + timedelta(days=30)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=30, hours=3)).isoformat()
        }
        
        response = self.client.post(reverse('events:event-list'), event_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event_id = response.data['id']
        
        # 2. Add ticket types
        ticket_type_data = {
            'name': 'General',
            'price': '25.00',
            'quantity_available': 100
        }
        
        response = self.client.post(
            reverse('events:event-ticket-types', kwargs={'pk': event_id}),
            ticket_type_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket_type_id = response.data['id']
        
        # 3. Create customer and make booking
        customer = create_test_user_with_role('customer')
        self.client.force_authenticate(user=customer)
        
        booking_data = {
            'booking_type': 'event',
            'event': event_id,
            'tickets': [
                {
                    'ticket_type': ticket_type_id,
                    'quantity': 2
                }
            ],
            'customer_phone': '+1234567890'
        }
        
        response = self.client.post(reverse('bookings:booking-list'), booking_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking_id = response.data['id']
        
        # 4. Verify booking was created correctly
        response = self.client.get(reverse('bookings:booking-detail', kwargs={'pk': booking_id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['event'], event_id)
        self.assertEqual(len(response.data['tickets']), 2)
        
        # 5. Verify tickets were generated
        for ticket in response.data['tickets']:
            self.assertTrue(ticket['ticket_number'])
            self.assertTrue(ticket['qr_code_data'])
            self.assertEqual(ticket['status'], 'valid')
    
    def test_complete_movie_booking_workflow(self):
        """Test complete movie booking workflow"""
        # 1. Create theater owner and theater
        theater_owner = create_test_user_with_role('theater_owner')
        self.client.force_authenticate(user=theater_owner)
        
        theater_data = {
            'name': 'Test Cinema',
            'address': '456 Cinema Ave',
            'city': 'Test City',
            'state': 'TS',
            'zip_code': '12345',
            'screens': 1,
            'seating_layout': {
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 10,
                        'seats_per_row': 15
                    }
                ]
            }
        }
        
        response = self.client.post(reverse('theaters:theater-list'), theater_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        theater_id = response.data['id']
        
        # 2. Create movie
        movie_data = {
            'title': 'Test Movie',
            'description': 'Great test movie',
            'genre': 'action',
            'duration': 120,
            'rating': 'PG-13',
            'director': 'Test Director',
            'release_date': '2024-01-01'
        }
        
        response = self.client.post(reverse('theaters:movie-list'), movie_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        movie_id = response.data['id']
        
        # 3. Create showtime
        showtime_data = {
            'theater': theater_id,
            'movie': movie_id,
            'screen_number': 1,
            'start_time': (timezone.now() + timedelta(days=7, hours=19)).isoformat(),
            'base_price': '12.00',
            'total_seats': 150
        }
        
        response = self.client.post(reverse('theaters:showtime-list'), showtime_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        showtime_id = response.data['id']
        
        # 4. Create customer and book tickets
        customer = create_test_user_with_role('customer')
        self.client.force_authenticate(user=customer)
        
        booking_data = {
            'booking_type': 'movie',
            'showtime': showtime_id,
            'seats': ['A1', 'A2'],
            'customer_phone': '+1234567890'
        }
        
        response = self.client.post(reverse('bookings:booking-list'), booking_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 5. Verify booking and seat assignment
        booking_id = response.data['id']
        self.assertEqual(len(response.data['tickets']), 2)
        
        # Check that seats were assigned
        seats = [ticket['seat_number'] for ticket in response.data['tickets']]
        self.assertIn('A1', seats)
        self.assertIn('A2', seats)