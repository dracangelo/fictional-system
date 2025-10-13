"""
Comprehensive unit tests for all models in the movie booking application.
Tests model validation, properties, methods, and business logic.
"""

import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import json

from tests.factories import (
    UserFactory, UserProfileFactory, EventFactory, TicketTypeFactory,
    DiscountFactory, TheaterFactory, MovieFactory, ShowtimeFactory,
    BookingFactory, TicketFactory, CustomerReviewFactory, WaitlistEntryFactory,
    create_test_user_with_role, create_complete_event_setup
)

from users.models import UserProfile
from events.models import Event, TicketType, Discount
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking, Ticket, CustomerReview, WaitlistEntry


class UserProfileModelTest(TestCase):
    """Test UserProfile model functionality"""
    
    def setUp(self):
        self.user = UserFactory()
        # Profile is created automatically by signal, just get it
        self.profile = self.user.profile
    
    def test_user_profile_creation(self):
        """Test UserProfile is created correctly"""
        self.assertEqual(self.profile.user, self.user)
        self.assertEqual(self.profile.role, 'customer')
        self.assertIsInstance(self.profile.preferences, dict)
        
        # Test updating profile
        self.profile.phone_number = '+1234567890'
        self.profile.save()
        self.assertEqual(self.profile.phone_number, '+1234567890')
    
    def test_user_profile_str_representation(self):
        """Test string representation of UserProfile"""
        expected = f"{self.user.username} - Customer"
        self.assertEqual(str(self.profile), expected)
    
    def test_role_choices(self):
        """Test all role choices are valid"""
        valid_roles = ['admin', 'event_owner', 'theater_owner', 'customer']
        for role in valid_roles:
            profile = UserProfileFactory(role=role)
            self.assertEqual(profile.role, role)


class EventModelTest(TestCase):
    """Test Event model functionality"""
    
    def setUp(self):
        self.owner = create_test_user_with_role('event_owner')
        self.event = EventFactory(owner=self.owner)
    
    def test_event_creation(self):
        """Test Event is created correctly"""
        self.assertEqual(self.event.owner, self.owner)
        self.assertTrue(self.event.title)
        self.assertTrue(self.event.description)
        self.assertTrue(self.event.venue)
        self.assertTrue(self.event.address)
        self.assertIn(self.event.category, [choice[0] for choice in Event.CATEGORY_CHOICES])
        self.assertTrue(self.event.is_active)
    
    def test_event_str_representation(self):
        """Test string representation of Event"""
        expected = f"{self.event.title} - {self.event.start_datetime.strftime('%Y-%m-%d')}"
        self.assertEqual(str(self.event), expected)
    
    def test_event_properties(self):
        """Test Event model properties"""
        # Test upcoming event
        future_event = EventFactory(
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2)
        )
        self.assertTrue(future_event.is_upcoming)
        self.assertFalse(future_event.is_ongoing)
        self.assertFalse(future_event.is_past)


class BookingModelTest(TestCase):
    """Test Booking model functionality"""
    
    def setUp(self):
        self.customer = create_test_user_with_role('customer')
        self.event = EventFactory()
        self.booking = BookingFactory(customer=self.customer, event=self.event)
    
    def test_booking_creation(self):
        """Test Booking is created correctly"""
        self.assertEqual(self.booking.customer, self.customer)
        self.assertEqual(self.booking.booking_type, 'event')
        self.assertEqual(self.booking.event, self.event)
        self.assertTrue(self.booking.booking_reference)
        self.assertGreater(self.booking.total_amount, 0)
        self.assertEqual(self.booking.customer_email, self.customer.email)
    
    def test_booking_str_representation(self):
        """Test string representation of Booking"""
        expected = f"Booking {self.booking.booking_reference} - {self.customer.username}"
        self.assertEqual(str(self.booking), expected)