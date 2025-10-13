"""
End-to-end test scenarios for complete user workflows.
Tests realistic user journeys from start to finish.
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
from unittest.mock import patch, Mock

from tests.factories import (
    UserFactory, EventFactory, TicketTypeFactory, DiscountFactory,
    TheaterFactory, MovieFactory, ShowtimeFactory, create_test_user_with_role
)

from bookings.models import Booking, Ticket


class CustomerEventBookingJourneyTest(APITestCase):
    """Test complete customer event booking journey"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_complete_customer_event_booking_journey(self):
        """Test end-to-end customer event booking experience"""
        
        # Step 1: Customer registration
        registration_data = {
            'username': 'customer123',
            'email': 'customer@example.com',
            'password': 'securepass123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '+1234567890'
        }
        
        response = self.client.post(reverse('auth:register'), registration_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        customer_id = response.data['user']['id']
        access_token = response.data['token']['access']
        
        # Step 2: Browse events
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Create event to browse
        event_owner = create_test_user_with_role('event_owner')
        event = EventFactory(
            owner=event_owner,
            title='Test Concert',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=10)
        )
        
        # Add ticket types
        general_ticket = TicketTypeFactory(
            event=event,
            name='General',
            price=Decimal('25.00'),
            quantity_available=100
        )
        
        # Step 3: Browse events
        response = self.client.get(reverse('events:event-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        
        # Step 4: Create booking
        booking_data = {
            'booking_type': 'event',
            'event': event.id,
            'tickets': [
                {
                    'ticket_type': general_ticket.id,
                    'quantity': 2
                }
            ],
            'customer_phone': '+1234567890'
        }
        
        response = self.client.post(reverse('bookings:booking-list'), booking_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        booking_id = response.data['id']
        
        # Verify booking details
        self.assertEqual(response.data['customer'], customer_id)
        self.assertEqual(response.data['event'], event.id)
        self.assertEqual(len(response.data['tickets']), 2)
        
        # Step 5: View booking history
        response = self.client.get(reverse('bookings:booking-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], booking_id)


class TheaterOwnerWorkflowTest(APITestCase):
    """Test complete theater owner workflow"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_theater_owner_complete_workflow(self):
        """Test end-to-end theater owner experience"""
        
        # Step 1: Theater owner registration
        registration_data = {
            'username': 'theaterowner',
            'email': 'owner@theater.com',
            'password': 'securepass123',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'role': 'theater_owner'
        }
        
        response = self.client.post(reverse('auth:register'), registration_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        access_token = response.data['token']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Step 2: Create theater
        theater_data = {
            'name': 'Grand Cinema',
            'address': '123 Movie Street',
            'city': 'Los Angeles',
            'state': 'CA',
            'zip_code': '90210',
            'screens': 1,
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
        
        response = self.client.post(reverse('theaters:theater-list'), theater_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        theater_id = response.data['id']
        
        # Step 3: Add movie
        movie_data = {
            'title': 'Action Hero',
            'description': 'Explosive action movie',
            'genre': 'action',
            'duration': 120,
            'rating': 'PG-13',
            'director': 'Action Director',
            'release_date': '2024-01-15'
        }
        
        response = self.client.post(reverse('theaters:movie-list'), movie_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        movie_id = response.data['id']
        
        # Step 4: Schedule showtime
        showtime_data = {
            'theater': theater_id,
            'movie': movie_id,
            'screen_number': 1,
            'start_time': (timezone.now() + timedelta(days=7, hours=19)).isoformat(),
            'base_price': '12.00',
            'total_seats': 300
        }
        
        response = self.client.post(reverse('theaters:showtime-list'), showtime_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify theater was created successfully
        self.assertEqual(response.data['theater'], theater_id)
        self.assertEqual(response.data['movie'], movie_id)