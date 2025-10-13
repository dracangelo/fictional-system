"""
Comprehensive tests for the booking engine with concurrency control
"""
import threading
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Booking, Ticket
from .services import BookingService, SeatUnavailableError, TicketUnavailableError
from events.models import Event, TicketType, Discount
from theaters.models import Theater, Movie, Showtime
from users.models import UserProfile


class BookingEngineTestCase(TestCase):
    """Test cases for booking engine functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.customer = User.objects.create_user(
            username='customer@test.com',
            email='customer@test.com',
            password='testpass123'
        )
        self.customer.profile.role = 'customer'
        self.customer.profile.save()
        
        self.event_owner = User.objects.create_user(
            username='eventowner@test.com',
            email='eventowner@test.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.theater_owner = User.objects.create_user(
            username='theaterowner@test.com',
            email='theaterowner@test.com',
            password='testpass123'
        )
        self.theater_owner.profile.role = 'theater_owner'
        self.theater_owner.profile.save()
        
        # Create event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A test concert event',
            venue='Test Venue',
            address='123 Test St',
            category='concert',
            start_datetime=timezone.now() + timezone.timedelta(days=30),
            end_datetime=timezone.now() + timezone.timedelta(days=30, hours=3),
            status='published'
        )
        
        # Create ticket types
        self.vip_ticket_type = TicketType.objects.create(
            event=self.event,
            name='VIP',
            description='VIP tickets with premium access',
            price=Decimal('100.00'),
            quantity_available=10
        )
        
        self.general_ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            description='General admission tickets',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        # Create theater and movie
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Theater',
            address='456 Theater Ave',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=2,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 10,
                        'seats_per_row': 15,
                        'vip_rows': ['A', 'B'],
                        'disabled_seats': ['A1', 'A2'],
                        'pricing': {
                            'regular': 12.00,
                            'vip': 18.00
                        }
                    },
                    {
                        'screen_number': 2,
                        'rows': 8,
                        'seats_per_row': 12,
                        'pricing': {
                            'regular': 10.00
                        }
                    }
                ]
            }
        )
        
        self.movie = Movie.objects.create(
            title='Test Movie',
            description='A test movie',
            genre='action',
            duration=120,
            rating='PG-13',
            director='Test Director',
            release_date=timezone.now().date()
        )
        
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timezone.timedelta(days=7),
            base_price=Decimal('12.00'),
            total_seats=148,  # 10 rows * 15 seats - 2 disabled
            available_seats=148,
            seat_pricing={
                'vip': {'rows': ['A', 'B'], 'price': 18.00},
                'regular': {'price': 12.00}
            }
        )
    
    def test_event_booking_creation(self):
        """Test basic event booking creation"""
        ticket_selections = [
            {'ticket_type_id': self.vip_ticket_type.id, 'quantity': 2},
            {'ticket_type_id': self.general_ticket_type.id, 'quantity': 3}
        ]
        
        booking = BookingService.create_event_booking_with_concurrency_control(
            customer=self.customer,
            event=self.event,
            ticket_selections=ticket_selections,
            customer_phone='555-1234'
        )
        
        self.assertIsNotNone(booking)
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.event, self.event)
        self.assertEqual(booking.booking_type, 'event')
        self.assertEqual(booking.booking_status, 'pending')
        self.assertEqual(booking.payment_status, 'pending')
        self.assertEqual(booking.ticket_count, 5)
        self.assertTrue(booking.booking_reference)
        
        # Check ticket type quantities were updated
        self.vip_ticket_type.refresh_from_db()
        self.general_ticket_type.refresh_from_db()
        self.assertEqual(self.vip_ticket_type.quantity_sold, 2)
        self.assertEqual(self.general_ticket_type.quantity_sold, 3)
    
    def test_movie_booking_creation(self):
        """Test basic movie booking creation"""
        seat_numbers = ['C5', 'C6', 'D5', 'D6']
        
        booking = BookingService.create_movie_booking_with_concurrency_control(
            customer=self.customer,
            showtime=self.showtime,
            seat_numbers=seat_numbers,
            customer_phone='555-1234'
        )
        
        self.assertIsNotNone(booking)
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.showtime, self.showtime)
        self.assertEqual(booking.booking_type, 'movie')
        self.assertEqual(booking.booking_status, 'pending')
        self.assertEqual(booking.payment_status, 'pending')
        self.assertEqual(booking.ticket_count, 4)
        self.assertTrue(booking.booking_reference)
        
        # Check showtime was updated
        self.showtime.refresh_from_db()
        self.assertEqual(self.showtime.available_seats, 144)  # 148 - 4
        self.assertEqual(set(self.showtime.booked_seats), set(seat_numbers))
    
    def test_seat_unavailable_error(self):
        """Test that SeatUnavailableError is raised for already booked seats"""
        seat_numbers = ['C5', 'C6']
        
        # First booking
        BookingService.create_movie_booking_with_concurrency_control(
            customer=self.customer,
            showtime=self.showtime,
            seat_numbers=seat_numbers
        )
        
        # Second booking with overlapping seats should fail
        with self.assertRaises(SeatUnavailableError):
            BookingService.create_movie_booking_with_concurrency_control(
                customer=self.customer,
                showtime=self.showtime,
                seat_numbers=['C5', 'C7']  # C5 is already booked
            )
    
    def test_ticket_unavailable_error(self):
        """Test that TicketUnavailableError is raised when not enough tickets available"""
        # Try to book more VIP tickets than available
        ticket_selections = [
            {'ticket_type_id': self.vip_ticket_type.id, 'quantity': 15}  # Only 10 available
        ]
        
        with self.assertRaises(TicketUnavailableError):
            BookingService.create_event_booking_with_concurrency_control(
                customer=self.customer,
                event=self.event,
                ticket_selections=ticket_selections
            )
    
    def test_booking_status_management(self):
        """Test booking status transitions"""
        booking = BookingService.create_event_booking_with_concurrency_control(
            customer=self.customer,
            event=self.event,
            ticket_selections=[{'ticket_type_id': self.general_ticket_type.id, 'quantity': 1}]
        )
        
        # Test valid status transitions
        self.assertTrue(BookingService.update_booking_status(booking, 'confirmed'))
        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, 'confirmed')
        
        self.assertTrue(BookingService.update_booking_status(booking, 'completed'))
        booking.refresh_from_db()
        self.assertEqual(booking.booking_status, 'completed')
        
        # Test invalid status transition
        with self.assertRaises(ValidationError):
            BookingService.update_booking_status(booking, 'pending')
    
    def test_payment_status_management(self):
        """Test payment status updates and auto-booking status changes"""
        booking = BookingService.create_event_booking_with_concurrency_control(
            customer=self.customer,
            event=self.event,
            ticket_selections=[{'ticket_type_id': self.general_ticket_type.id, 'quantity': 1}]
        )
        
        # Test payment completion auto-confirms booking
        BookingService.update_payment_status(
            booking, 'completed', 'txn_123', 'credit_card'
        )
        booking.refresh_from_db()
        self.assertEqual(booking.payment_status, 'completed')
        self.assertEqual(booking.booking_status, 'confirmed')
        self.assertEqual(booking.payment_transaction_id, 'txn_123')
        self.assertEqual(booking.payment_method, 'credit_card')
    
    def test_booking_reference_lookup(self):
        """Test booking lookup by reference"""
        booking = BookingService.create_event_booking_with_concurrency_control(
            customer=self.customer,
            event=self.event,
            ticket_selections=[{'ticket_type_id': self.general_ticket_type.id, 'quantity': 1}]
        )
        
        found_booking = BookingService.get_booking_by_reference(booking.booking_reference)
        self.assertEqual(found_booking, booking)
        
        not_found = BookingService.get_booking_by_reference('INVALID123')
        self.assertIsNone(not_found)
    
    def test_seat_availability_check(self):
        """Test seat availability checking without locking"""
        seat_numbers = ['C5', 'C6']
        
        # Initially all seats should be available
        available, unavailable = BookingService.check_seat_availability(
            self.showtime, seat_numbers
        )
        self.assertTrue(available)
        self.assertEqual(unavailable, [])
        
        # Book some seats
        BookingService.create_movie_booking_with_concurrency_control(
            customer=self.customer,
            showtime=self.showtime,
            seat_numbers=seat_numbers
        )
        
        # Check availability again (refresh showtime from database)
        self.showtime.refresh_from_db()
        available, unavailable = BookingService.check_seat_availability(
            self.showtime, ['C5', 'C7']
        )
        self.assertFalse(available)
        self.assertEqual(unavailable, ['C5'])
    
    def test_ticket_availability_check(self):
        """Test ticket availability checking without locking"""
        ticket_selections = [
            {'ticket_type_id': self.vip_ticket_type.id, 'quantity': 5}
        ]
        
        # Initially should be available
        available, unavailable = BookingService.check_ticket_availability(
            self.event, ticket_selections
        )
        self.assertTrue(available)
        self.assertEqual(unavailable, [])
        
        # Book some tickets
        BookingService.create_event_booking_with_concurrency_control(
            customer=self.customer,
            event=self.event,
            ticket_selections=[{'ticket_type_id': self.vip_ticket_type.id, 'quantity': 8}]
        )
        
        # Check availability for more than remaining
        available, unavailable = BookingService.check_ticket_availability(
            self.event, [{'ticket_type_id': self.vip_ticket_type.id, 'quantity': 5}]
        )
        self.assertFalse(available)
        self.assertEqual(len(unavailable), 1)
        self.assertIn('VIP', unavailable[0])
    
    def test_invalid_seat_numbers(self):
        """Test validation of seat numbers against theater configuration"""
        invalid_seats = ['Z99', 'A1']  # Z99 doesn't exist, A1 is disabled
        
        with self.assertRaises(ValidationError) as context:
            BookingService.create_movie_booking_with_concurrency_control(
                customer=self.customer,
                showtime=self.showtime,
                seat_numbers=invalid_seats
            )
        
        self.assertIn('Invalid seat numbers', str(context.exception))
    
    def test_booking_cancellation(self):
        """Test booking cancellation and resource restoration"""
        # Create event booking
        event_booking = BookingService.create_event_booking_with_concurrency_control(
            customer=self.customer,
            event=self.event,
            ticket_selections=[{'ticket_type_id': self.vip_ticket_type.id, 'quantity': 2}]
        )
        
        # Create movie booking
        movie_booking = BookingService.create_movie_booking_with_concurrency_control(
            customer=self.customer,
            showtime=self.showtime,
            seat_numbers=['C5', 'C6']
        )
        
        # Cancel event booking
        self.assertTrue(BookingService.cancel_booking(event_booking))
        event_booking.refresh_from_db()
        self.assertEqual(event_booking.booking_status, 'cancelled')
        
        # Check ticket type quantities were restored
        self.vip_ticket_type.refresh_from_db()
        self.assertEqual(self.vip_ticket_type.quantity_sold, 0)
        
        # Cancel movie booking
        self.assertTrue(BookingService.cancel_booking(movie_booking))
        movie_booking.refresh_from_db()
        self.assertEqual(movie_booking.booking_status, 'cancelled')
        
        # Check showtime seats were restored
        self.showtime.refresh_from_db()
        self.assertEqual(self.showtime.available_seats, 148)
        self.assertEqual(self.showtime.booked_seats, [])


class ConcurrencyTestCase(TransactionTestCase):
    """Test cases for concurrent booking scenarios"""
    
    def setUp(self):
        """Set up test data for concurrency tests"""
        # Create users
        self.customer1 = User.objects.create_user(
            username='customer1@test.com',
            email='customer1@test.com',
            password='testpass123'
        )
        self.customer1.profile.role = 'customer'
        self.customer1.profile.save()
        
        self.customer2 = User.objects.create_user(
            username='customer2@test.com',
            email='customer2@test.com',
            password='testpass123'
        )
        self.customer2.profile.role = 'customer'
        self.customer2.profile.save()
        
        self.theater_owner = User.objects.create_user(
            username='theaterowner@test.com',
            email='theaterowner@test.com',
            password='testpass123'
        )
        self.theater_owner.profile.role = 'theater_owner'
        self.theater_owner.profile.save()
        
        # Create theater and movie
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Concurrency Test Theater',
            address='789 Concurrent Ave',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=1,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 5,
                        'seats_per_row': 10,
                        'pricing': {'regular': 10.00}
                    }
                ]
            }
        )
        
        self.movie = Movie.objects.create(
            title='Concurrency Test Movie',
            description='A test movie for concurrency',
            genre='action',
            duration=90,
            rating='PG',
            director='Test Director',
            release_date=timezone.now().date()
        )
        
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timezone.timedelta(days=1),
            base_price=Decimal('10.00'),
            total_seats=50,
            available_seats=50
        )
    
    def test_concurrent_seat_booking(self):
        """Test concurrent booking of the same seats"""
        results = []
        exceptions = []
        
        def book_seats(customer, seat_numbers, result_list, exception_list):
            try:
                booking = BookingService.create_movie_booking_with_concurrency_control(
                    customer=customer,
                    showtime=self.showtime,
                    seat_numbers=seat_numbers
                )
                result_list.append(booking)
            except Exception as e:
                exception_list.append(e)
        
        # Two threads trying to book the same seats
        seat_numbers = ['A1', 'A2']
        
        thread1 = threading.Thread(
            target=book_seats,
            args=(self.customer1, seat_numbers, results, exceptions)
        )
        thread2 = threading.Thread(
            target=book_seats,
            args=(self.customer2, seat_numbers, results, exceptions)
        )
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Only one booking should succeed
        self.assertEqual(len(results), 1)
        self.assertEqual(len(exceptions), 1)
        self.assertIsInstance(exceptions[0], SeatUnavailableError)
        
        # Check showtime state
        self.showtime.refresh_from_db()
        self.assertEqual(self.showtime.available_seats, 48)  # 50 - 2
        self.assertEqual(set(self.showtime.booked_seats), set(seat_numbers))
    
    def test_concurrent_different_seats(self):
        """Test concurrent booking of different seats should both succeed"""
        results = []
        exceptions = []
        
        def book_seats(customer, seat_numbers, result_list, exception_list):
            try:
                booking = BookingService.create_movie_booking_with_concurrency_control(
                    customer=customer,
                    showtime=self.showtime,
                    seat_numbers=seat_numbers
                )
                result_list.append(booking)
            except Exception as e:
                exception_list.append(e)
        
        thread1 = threading.Thread(
            target=book_seats,
            args=(self.customer1, ['A1', 'A2'], results, exceptions)
        )
        thread2 = threading.Thread(
            target=book_seats,
            args=(self.customer2, ['B1', 'B2'], results, exceptions)
        )
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Both bookings should succeed
        self.assertEqual(len(results), 2)
        self.assertEqual(len(exceptions), 0)
        
        # Check showtime state
        self.showtime.refresh_from_db()
        self.assertEqual(self.showtime.available_seats, 46)  # 50 - 4
        self.assertEqual(set(self.showtime.booked_seats), {'A1', 'A2', 'B1', 'B2'})
    
    def test_retry_mechanism(self):
        """Test the retry mechanism with backoff"""
        # Mock a function that fails twice then succeeds
        call_count = 0
        
        def mock_booking_func(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise SeatUnavailableError("Simulated race condition")
            return "success"
        
        with patch('time.sleep'):  # Speed up the test
            result = BookingService.retry_booking_with_backoff(
                mock_booking_func,
                max_retries=3
            )
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 3)
    
    def test_retry_mechanism_exhausted(self):
        """Test retry mechanism when all attempts fail"""
        def always_fail(*args, **kwargs):
            raise SeatUnavailableError("Always fails")
        
        with patch('time.sleep'):  # Speed up the test
            with self.assertRaises(SeatUnavailableError):
                BookingService.retry_booking_with_backoff(
                    always_fail,
                    max_retries=2
                )


class BookingValidationTestCase(TestCase):
    """Test cases for booking validation"""
    
    def setUp(self):
        """Set up test data"""
        self.customer = User.objects.create_user(
            username='customer@test.com',
            email='customer@test.com',
            password='testpass123'
        )
        self.customer.profile.role = 'customer'
        self.customer.profile.save()
        
        self.event_owner = User.objects.create_user(
            username='eventowner@test.com',
            email='eventowner@test.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
    
    def test_past_event_booking_validation(self):
        """Test that bookings cannot be created for past events"""
        past_event = Event.objects.create(
            owner=self.event_owner,
            title='Past Event',
            description='An event in the past',
            venue='Past Venue',
            address='123 Past St',
            category='concert',
            start_datetime=timezone.now() - timezone.timedelta(days=1),
            end_datetime=timezone.now() - timezone.timedelta(hours=1),
            status='published'
        )
        
        ticket_type = TicketType.objects.create(
            event=past_event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        with self.assertRaises(ValidationError) as context:
            BookingService.create_event_booking_with_concurrency_control(
                customer=self.customer,
                event=past_event,
                ticket_selections=[{'ticket_type_id': ticket_type.id, 'quantity': 1}]
            )
        
        self.assertIn('past events', str(context.exception))
    
    def test_unpublished_event_booking_validation(self):
        """Test that bookings cannot be created for unpublished events"""
        draft_event = Event.objects.create(
            owner=self.event_owner,
            title='Draft Event',
            description='A draft event',
            venue='Draft Venue',
            address='123 Draft St',
            category='concert',
            start_datetime=timezone.now() + timezone.timedelta(days=30),
            end_datetime=timezone.now() + timezone.timedelta(days=30, hours=3),
            status='draft'  # Not published
        )
        
        ticket_type = TicketType.objects.create(
            event=draft_event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        with self.assertRaises(ValidationError) as context:
            BookingService.create_event_booking_with_concurrency_control(
                customer=self.customer,
                event=draft_event,
                ticket_selections=[{'ticket_type_id': ticket_type.id, 'quantity': 1}]
            )
        
        self.assertIn('not available for booking', str(context.exception))