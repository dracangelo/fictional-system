from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, date
from .models import Booking, Ticket
from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime


class BookingModelTest(TestCase):
    """Test cases for Booking model"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123'
        )
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='eventowner@example.com',
            password='testpass123'
        )
        
        self.theater_owner = User.objects.create_user(
            username='theaterowner',
            email='theaterowner@example.com',
            password='testpass123'
        )
        
        # Create event for event bookings
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A great test concert',
            venue='Test Arena',
            address='123 Test St, Test City',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3)
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General Admission',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        # Create theater and showtime for movie bookings
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Cinema',
            address='123 Movie St',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=1,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 10,
                        'seats_per_row': 15
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
            release_date=date.today()
        )
        
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timedelta(days=1),
            base_price=Decimal('12.00'),
            total_seats=150
        )
        
        # Event booking data
        self.event_booking_data = {
            'customer': self.customer,
            'booking_type': 'event',
            'event': self.event,
            'subtotal': Decimal('100.00'),
            'discount_amount': Decimal('10.00'),
            'fees': Decimal('5.00'),
            'total_amount': Decimal('95.00'),
            'customer_email': 'customer@example.com',
        }
        
        # Movie booking data
        self.movie_booking_data = {
            'customer': self.customer,
            'booking_type': 'movie',
            'showtime': self.showtime,
            'subtotal': Decimal('24.00'),
            'discount_amount': Decimal('0.00'),
            'fees': Decimal('2.00'),
            'total_amount': Decimal('26.00'),
            'customer_email': 'customer@example.com',
        }
    
    def test_event_booking_creation(self):
        """Test basic event booking creation"""
        booking = Booking.objects.create(**self.event_booking_data)
        
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.booking_type, 'event')
        self.assertEqual(booking.event, self.event)
        self.assertIsNone(booking.showtime)
        self.assertEqual(booking.total_amount, Decimal('95.00'))
        self.assertEqual(booking.payment_status, 'pending')  # Default
        self.assertEqual(booking.booking_status, 'pending')  # Default
        self.assertIsNotNone(booking.booking_reference)
    
    def test_movie_booking_creation(self):
        """Test basic movie booking creation"""
        booking = Booking.objects.create(**self.movie_booking_data)
        
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.booking_type, 'movie')
        self.assertEqual(booking.showtime, self.showtime)
        self.assertIsNone(booking.event)
        self.assertEqual(booking.total_amount, Decimal('26.00'))
    
    def test_booking_str_representation(self):
        """Test string representation of booking"""
        booking = Booking.objects.create(**self.event_booking_data)
        expected_str = f"Booking {booking.booking_reference} - customer"
        self.assertEqual(str(booking), expected_str)
    
    def test_booking_reference_generation(self):
        """Test booking reference generation"""
        booking1 = Booking.objects.create(**self.event_booking_data)
        booking2 = Booking.objects.create(**self.movie_booking_data)
        
        # References should be unique
        self.assertNotEqual(booking1.booking_reference, booking2.booking_reference)
        
        # References should be 8 characters long
        self.assertEqual(len(booking1.booking_reference), 8)
        self.assertEqual(len(booking2.booking_reference), 8)
    
    def test_booking_validation_event_type_mismatch(self):
        """Test validation when booking type doesn't match associated object"""
        # Event booking without event
        invalid_data = self.event_booking_data.copy()
        del invalid_data['event']
        
        with self.assertRaises(ValidationError):
            Booking.objects.create(**invalid_data)
        
        # Movie booking without showtime
        invalid_data = self.movie_booking_data.copy()
        del invalid_data['showtime']
        
        with self.assertRaises(ValidationError):
            Booking.objects.create(**invalid_data)
    
    def test_booking_validation_total_calculation(self):
        """Test validation of total amount calculation"""
        invalid_data = self.event_booking_data.copy()
        invalid_data['total_amount'] = Decimal('999.99')  # Incorrect total
        
        with self.assertRaises(ValidationError):
            Booking.objects.create(**invalid_data)
    
    def test_booking_properties(self):
        """Test booking property methods"""
        # Test event booking properties
        event_booking = Booking.objects.create(**self.event_booking_data)
        
        self.assertEqual(event_booking.ticket_count, 0)  # No tickets yet
        self.assertTrue(event_booking.is_refundable)  # Future event, pending payment
        self.assertEqual(event_booking.event_or_showtime_title, 'Test Concert')
        self.assertEqual(event_booking.event_or_showtime_datetime, self.event.start_datetime)
        
        # Test movie booking properties
        movie_booking = Booking.objects.create(**self.movie_booking_data)
        
        self.assertEqual(movie_booking.event_or_showtime_title, 'Test Movie')
        self.assertEqual(movie_booking.event_or_showtime_datetime, self.showtime.start_time)
    
    def test_booking_refundable_conditions(self):
        """Test is_refundable property under different conditions"""
        booking = Booking.objects.create(**self.event_booking_data)
        
        # Initially refundable (pending payment, future event)
        self.assertTrue(booking.is_refundable)
        
        # Not refundable if cancelled
        booking.booking_status = 'cancelled'
        booking.save()
        self.assertFalse(booking.is_refundable)
        
        # Reset status
        booking.booking_status = 'confirmed'
        booking.payment_status = 'completed'
        booking.save()
        self.assertTrue(booking.is_refundable)
        
        # Not refundable if payment failed
        booking.payment_status = 'failed'
        booking.save()
        self.assertFalse(booking.is_refundable)
    
    def test_customer_email_auto_population(self):
        """Test automatic customer email population"""
        booking_data = self.event_booking_data.copy()
        del booking_data['customer_email']  # Remove email
        
        booking = Booking.objects.create(**booking_data)
        self.assertEqual(booking.customer_email, self.customer.email)


class TicketModelTest(TestCase):
    """Test cases for Ticket model"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123'
        )
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='eventowner@example.com',
            password='testpass123'
        )
        
        # Create event and ticket type
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A great test concert',
            venue='Test Arena',
            address='123 Test St, Test City',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3)
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General Admission',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        # Create event booking
        self.event_booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        # Create theater, movie, and showtime for movie tickets
        self.theater_owner = User.objects.create_user(
            username='theaterowner',
            email='theaterowner@example.com',
            password='testpass123'
        )
        
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Cinema',
            address='123 Movie St',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=1,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 10,
                        'seats_per_row': 15
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
            release_date=date.today()
        )
        
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timedelta(days=1),
            base_price=Decimal('12.00'),
            total_seats=150
        )
        
        # Create movie booking
        self.movie_booking = Booking.objects.create(
            customer=self.customer,
            booking_type='movie',
            showtime=self.showtime,
            subtotal=Decimal('12.00'),
            total_amount=Decimal('12.00'),
            customer_email='customer@example.com'
        )
        
        # Event ticket data
        self.event_ticket_data = {
            'booking': self.event_booking,
            'ticket_type': self.ticket_type,
            'price': Decimal('50.00'),
        }
        
        # Movie ticket data
        self.movie_ticket_data = {
            'booking': self.movie_booking,
            'seat_number': 'A1',
            'price': Decimal('12.00'),
        }
    
    def test_event_ticket_creation(self):
        """Test basic event ticket creation"""
        ticket = Ticket.objects.create(**self.event_ticket_data)
        
        self.assertEqual(ticket.booking, self.event_booking)
        self.assertEqual(ticket.ticket_type, self.ticket_type)
        self.assertIsNone(ticket.seat_number)  # Not used for event tickets
        self.assertEqual(ticket.price, Decimal('50.00'))
        self.assertEqual(ticket.status, 'valid')  # Default
        self.assertIsNotNone(ticket.ticket_number)
        self.assertIsNotNone(ticket.qr_code_data)
        self.assertIsNotNone(ticket.qr_code_image)
    
    def test_movie_ticket_creation(self):
        """Test basic movie ticket creation"""
        ticket = Ticket.objects.create(**self.movie_ticket_data)
        
        self.assertEqual(ticket.booking, self.movie_booking)
        self.assertEqual(ticket.seat_number, 'A1')
        self.assertIsNone(ticket.ticket_type)  # Not used for movie tickets
        self.assertEqual(ticket.price, Decimal('12.00'))
    
    def test_ticket_str_representation(self):
        """Test string representation of ticket"""
        ticket = Ticket.objects.create(**self.event_ticket_data)
        expected_str = f"Ticket {ticket.ticket_number} - {self.event_booking.booking_reference}"
        self.assertEqual(str(ticket), expected_str)
    
    def test_ticket_number_generation(self):
        """Test ticket number generation"""
        ticket1 = Ticket.objects.create(**self.event_ticket_data)
        ticket2 = Ticket.objects.create(**self.movie_ticket_data)
        
        # Ticket numbers should be unique
        self.assertNotEqual(ticket1.ticket_number, ticket2.ticket_number)
        
        # Ticket numbers should follow format TKT-YYYYMMDD-XXXXXXXX
        self.assertTrue(ticket1.ticket_number.startswith('TKT-'))
        self.assertTrue(ticket2.ticket_number.startswith('TKT-'))
        
        # Should contain today's date
        today_str = timezone.now().strftime('%Y%m%d')
        self.assertIn(today_str, ticket1.ticket_number)
        self.assertIn(today_str, ticket2.ticket_number)
    
    def test_ticket_validation_event_type_mismatch(self):
        """Test validation when ticket fields don't match booking type"""
        # Event ticket with seat number
        invalid_data = self.event_ticket_data.copy()
        invalid_data['seat_number'] = 'A1'
        
        with self.assertRaises(ValidationError):
            Ticket.objects.create(**invalid_data)
        
        # Movie ticket with ticket type
        invalid_data = self.movie_ticket_data.copy()
        invalid_data['ticket_type'] = self.ticket_type
        
        with self.assertRaises(ValidationError):
            Ticket.objects.create(**invalid_data)
    
    def test_qr_code_generation(self):
        """Test QR code generation"""
        ticket = Ticket.objects.create(**self.event_ticket_data)
        
        # QR code data should contain ticket and booking information
        self.assertIn(ticket.ticket_number, ticket.qr_code_data)
        self.assertIn(ticket.booking.booking_reference, ticket.qr_code_data)
        self.assertIn(str(ticket.booking.customer.id), ticket.qr_code_data)
        
        # QR code image should be base64 encoded
        self.assertIsNotNone(ticket.qr_code_image)
        self.assertTrue(len(ticket.qr_code_image) > 0)
    
    def test_ticket_mark_as_used(self):
        """Test marking ticket as used"""
        ticket = Ticket.objects.create(**self.event_ticket_data)
        
        # Initially valid
        self.assertEqual(ticket.status, 'valid')
        self.assertIsNone(ticket.used_at)
        self.assertEqual(ticket.used_by, '')
        
        # Mark as used
        result = ticket.mark_as_used('Scanner 1')
        self.assertTrue(result)
        
        # Refresh from database
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, 'used')
        self.assertIsNotNone(ticket.used_at)
        self.assertEqual(ticket.used_by, 'Scanner 1')
        
        # Try to mark as used again (should fail)
        result = ticket.mark_as_used('Scanner 2')
        self.assertFalse(result)
        self.assertEqual(ticket.used_by, 'Scanner 1')  # Should not change
    
    def test_ticket_validity_for_use(self):
        """Test ticket validity for use"""
        ticket = Ticket.objects.create(**self.event_ticket_data)
        
        # Should be valid for future event
        is_valid, message = ticket.is_valid_for_use()
        self.assertFalse(is_valid)  # Too early (more than 30 minutes before)
        self.assertIn('Too early', message)
        
        # Test with event starting soon
        self.event.start_datetime = timezone.now() + timedelta(minutes=15)
        self.event.save()
        
        is_valid, message = ticket.is_valid_for_use()
        self.assertTrue(is_valid)
        self.assertEqual(message, 'Valid for entry')
        
        # Test with cancelled ticket
        ticket.status = 'cancelled'
        ticket.save()
        
        is_valid, message = ticket.is_valid_for_use()
        self.assertFalse(is_valid)
        self.assertIn('cancelled', message)
    
    def test_ticket_properties(self):
        """Test ticket property methods"""
        event_ticket = Ticket.objects.create(**self.event_ticket_data)
        movie_ticket = Ticket.objects.create(**self.movie_ticket_data)
        
        # Test event ticket properties
        self.assertEqual(event_ticket.event_or_movie_title, 'Test Concert')
        self.assertIn('Test Arena', event_ticket.venue_info)
        
        # Test movie ticket properties
        self.assertEqual(movie_ticket.event_or_movie_title, 'Test Movie')
        self.assertIn('Test Cinema', movie_ticket.venue_info)
        self.assertIn('Screen 1', movie_ticket.venue_info)
