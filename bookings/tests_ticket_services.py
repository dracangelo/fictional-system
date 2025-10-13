"""
Test cases for ticket generation and validation services
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, date
import json
import base64

from .models import Booking, Ticket
from .ticket_services import (
    TicketNumberGenerator, 
    QRCodeGenerator, 
    TicketPDFGenerator,
    TicketValidationService,
    TicketStatusManager
)
from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime


class TicketNumberGeneratorTest(TestCase):
    """Test cases for ticket number generation"""
    
    def setUp(self):
        """Set up test data"""
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
        
        # Create event
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
    
    def test_standard_ticket_number_generation(self):
        """Test standard ticket number generation"""
        ticket_number = TicketNumberGenerator.generate_standard_ticket_number()
        
        # Should start with TKT-
        self.assertTrue(ticket_number.startswith('TKT-'))
        
        # Should contain today's date
        today_str = timezone.now().strftime('%Y%m%d')
        self.assertIn(today_str, ticket_number)
        
        # Should be unique
        ticket_number2 = TicketNumberGenerator.generate_standard_ticket_number()
        self.assertNotEqual(ticket_number, ticket_number2)
    
    def test_sequential_ticket_number_generation(self):
        """Test sequential ticket number generation"""
        # Create ticket type and booking first to test sequential numbering
        ticket_type = TicketType.objects.create(
            event=self.event,
            name='General Admission',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        # Test event-based sequential numbering
        ticket_number1 = TicketNumberGenerator.generate_sequential_ticket_number(event_id=self.event.id)
        
        # Create a ticket to increment the count
        Ticket.objects.create(
            booking=booking,
            ticket_type=ticket_type,
            ticket_number=ticket_number1,
            price=Decimal('50.00'),
            qr_code_data='test'
        )
        
        ticket_number2 = TicketNumberGenerator.generate_sequential_ticket_number(event_id=self.event.id)
        
        self.assertTrue(ticket_number1.startswith(f'EVT{self.event.id:06d}'))
        self.assertTrue(ticket_number2.startswith(f'EVT{self.event.id:06d}'))
        self.assertNotEqual(ticket_number1, ticket_number2)
        
        # Test general sequential numbering
        general_number = TicketNumberGenerator.generate_sequential_ticket_number()
        self.assertTrue(general_number.startswith('TKT-'))
    
    def test_secure_ticket_number_generation(self):
        """Test secure ticket number generation"""
        ticket_number = TicketNumberGenerator.generate_secure_ticket_number()
        
        # Should start with SEC-
        self.assertTrue(ticket_number.startswith('SEC-'))
        
        # Should have proper format SEC-XXXX-XXXX-XXXX
        parts = ticket_number.split('-')
        self.assertEqual(len(parts), 4)
        self.assertEqual(parts[0], 'SEC')
        self.assertEqual(len(parts[1]), 4)
        self.assertEqual(len(parts[2]), 4)
        self.assertEqual(len(parts[3]), 4)
        
        # Should be unique
        ticket_number2 = TicketNumberGenerator.generate_secure_ticket_number()
        self.assertNotEqual(ticket_number, ticket_number2)


class QRCodeGeneratorTest(TestCase):
    """Test cases for QR code generation and validation"""
    
    def setUp(self):
        """Set up test data"""
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
        
        # Create event
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
        
        # Create booking and ticket
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
    
    def test_qr_code_data_generation(self):
        """Test QR code data generation"""
        qr_data = QRCodeGenerator.generate_qr_code_data(self.ticket, include_signature=True)
        
        # Should contain ticket number and booking reference
        self.assertIn(self.ticket.ticket_number, qr_data)
        self.assertIn(self.booking.booking_reference, qr_data)
        self.assertIn(str(self.customer.id), qr_data)
        
        # Should have signature when requested
        parts = qr_data.split('|')
        self.assertEqual(len(parts), 4)  # ticket_number|booking_ref|customer_id|signature
        self.assertTrue(len(parts[3]) > 0)  # Signature should exist
    
    def test_qr_code_data_without_signature(self):
        """Test QR code data generation without signature"""
        qr_data = QRCodeGenerator.generate_qr_code_data(self.ticket, include_signature=False)
        
        parts = qr_data.split('|')
        self.assertEqual(len(parts), 4)
        self.assertEqual(parts[3], '')  # No signature
    
    def test_qr_code_image_generation(self):
        """Test QR code image generation"""
        qr_data = "TEST-DATA-123"
        qr_image = QRCodeGenerator.generate_qr_code_image(qr_data)
        
        # Should be base64 encoded
        self.assertTrue(len(qr_image) > 0)
        
        # Should be valid base64
        try:
            decoded = base64.b64decode(qr_image)
            self.assertTrue(len(decoded) > 0)
        except Exception:
            self.fail("QR code image is not valid base64")
    
    def test_qr_code_validation_success(self):
        """Test successful QR code validation"""
        qr_data = QRCodeGenerator.generate_qr_code_data(self.ticket, include_signature=True)
        
        is_valid, message = QRCodeGenerator.validate_qr_code_data(qr_data, self.ticket)
        
        self.assertTrue(is_valid)
        self.assertEqual(message, "Valid QR code")
    
    def test_qr_code_validation_failure(self):
        """Test QR code validation failures"""
        # Test invalid format
        is_valid, message = QRCodeGenerator.validate_qr_code_data("invalid", self.ticket)
        self.assertFalse(is_valid)
        self.assertIn("Invalid QR code format", message)
        
        # Test ticket number mismatch
        wrong_data = f"WRONG-TICKET|{self.booking.booking_reference}|{self.customer.id}|sig"
        is_valid, message = QRCodeGenerator.validate_qr_code_data(wrong_data, self.ticket)
        self.assertFalse(is_valid)
        self.assertIn("Ticket number mismatch", message)
        
        # Test booking reference mismatch
        wrong_data = f"{self.ticket.ticket_number}|WRONG-BOOKING|{self.customer.id}|sig"
        is_valid, message = QRCodeGenerator.validate_qr_code_data(wrong_data, self.ticket)
        self.assertFalse(is_valid)
        self.assertIn("Booking reference mismatch", message)


class TicketPDFGeneratorTest(TestCase):
    """Test cases for PDF generation"""
    
    def setUp(self):
        """Set up test data"""
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='eventowner@example.com',
            password='testpass123'
        )
        
        # Create event
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
        
        # Create booking and ticket
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
    
    def test_single_ticket_pdf_generation(self):
        """Test PDF generation for a single ticket"""
        pdf_bytes = TicketPDFGenerator.generate_ticket_pdf(self.ticket)
        
        # Should return bytes
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 0)
        
        # Should start with PDF header
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))
    
    def test_booking_pdf_generation(self):
        """Test PDF generation for entire booking"""
        # Create additional ticket
        ticket2 = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
        
        pdf_bytes = TicketPDFGenerator.generate_booking_pdf(self.booking)
        
        # Should return bytes
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 0)
        
        # Should start with PDF header
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))
    
    def test_ticket_model_pdf_method(self):
        """Test PDF generation through ticket model method"""
        pdf_bytes = self.ticket.generate_pdf()
        
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 0)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))
    
    def test_booking_model_pdf_method(self):
        """Test PDF generation through booking model method"""
        pdf_bytes = self.booking.generate_tickets_pdf()
        
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 0)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))


class TicketValidationServiceTest(TestCase):
    """Test cases for ticket validation service"""
    
    def setUp(self):
        """Set up test data"""
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
        
        # Create event starting soon
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A great test concert',
            venue='Test Arena',
            address='123 Test St, Test City',
            category='concert',
            start_datetime=timezone.now() + timedelta(minutes=15),  # Starting soon
            end_datetime=timezone.now() + timedelta(minutes=15, hours=3)
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General Admission',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        # Create booking and ticket
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
    
    def test_successful_ticket_validation(self):
        """Test successful ticket validation"""
        is_valid, message, ticket = TicketValidationService.validate_ticket_for_entry(
            self.ticket.ticket_number, "Scanner1"
        )
        
        self.assertTrue(is_valid)
        self.assertEqual(message, "Ticket validated successfully")
        self.assertEqual(ticket, self.ticket)
        
        # Ticket should now be marked as used
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'used')
        self.assertIsNotNone(self.ticket.used_at)
        self.assertEqual(self.ticket.used_by, 'Scanner1')
    
    def test_ticket_validation_with_qr_code(self):
        """Test ticket validation using QR code data"""
        # Use the ticket's existing QR code data
        qr_data = self.ticket.qr_code_data
        
        is_valid, message, ticket = TicketValidationService.validate_ticket_for_entry(
            qr_data, "Scanner2"
        )
        
        self.assertTrue(is_valid)
        self.assertEqual(message, "Ticket validated successfully")
        self.assertEqual(ticket, self.ticket)
    
    def test_ticket_validation_not_found(self):
        """Test validation of non-existent ticket"""
        is_valid, message, ticket = TicketValidationService.validate_ticket_for_entry(
            "NONEXISTENT-TICKET", "Scanner1"
        )
        
        self.assertFalse(is_valid)
        self.assertEqual(message, "Ticket not found")
        self.assertIsNone(ticket)
    
    def test_ticket_validation_already_used(self):
        """Test validation of already used ticket"""
        # Mark ticket as used first
        self.ticket.mark_as_used("Scanner1")
        
        is_valid, message, ticket = TicketValidationService.validate_ticket_for_entry(
            self.ticket.ticket_number, "Scanner2"
        )
        
        self.assertFalse(is_valid)
        self.assertIn("used", message)
        self.assertEqual(ticket, self.ticket)
    
    def test_get_ticket_info(self):
        """Test getting ticket information"""
        found, info, ticket = TicketValidationService.get_ticket_info(self.ticket.ticket_number)
        
        self.assertTrue(found)
        self.assertEqual(info['ticket_number'], self.ticket.ticket_number)
        self.assertEqual(info['booking_reference'], self.booking.booking_reference)
        self.assertEqual(info['type'], 'event')
        self.assertEqual(info['title'], self.event.title)
        self.assertEqual(ticket, self.ticket)
    
    def test_get_ticket_info_not_found(self):
        """Test getting info for non-existent ticket"""
        found, info, ticket = TicketValidationService.get_ticket_info("NONEXISTENT")
        
        self.assertFalse(found)
        self.assertEqual(info, {})
        self.assertIsNone(ticket)


class TicketStatusManagerTest(TestCase):
    """Test cases for ticket status management"""
    
    def setUp(self):
        """Set up test data"""
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
        
        # Create event
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
        
        # Create booking and ticket
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
    
    def test_valid_status_change(self):
        """Test valid status transitions"""
        # Valid -> Used
        success, message = TicketStatusManager.change_ticket_status(
            self.ticket, 'used', 'Scanned at entry', 'Scanner1'
        )
        
        self.assertTrue(success)
        self.assertIn('used', message)
        
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'used')
        self.assertIsNotNone(self.ticket.used_at)
        self.assertEqual(self.ticket.used_by, 'Scanner1')
    
    def test_invalid_status_change(self):
        """Test invalid status transitions"""
        # Mark as used first
        self.ticket.status = 'used'
        self.ticket.save()
        
        # Try to change from used to valid (not allowed)
        success, message = TicketStatusManager.change_ticket_status(
            self.ticket, 'valid', 'Trying to revert', 'Admin'
        )
        
        self.assertFalse(success)
        self.assertIn('Cannot change status', message)
    
    def test_invalid_status_value(self):
        """Test changing to invalid status"""
        success, message = TicketStatusManager.change_ticket_status(
            self.ticket, 'invalid_status', 'Test', 'Admin'
        )
        
        self.assertFalse(success)
        self.assertIn('Invalid status', message)
    
    def test_expire_old_tickets(self):
        """Test automatic expiration of old tickets"""
        # Create past event
        past_event = Event.objects.create(
            owner=self.event_owner,
            title='Past Concert',
            description='A past concert',
            venue='Past Arena',
            address='123 Past St, Past City',
            category='concert',
            start_datetime=timezone.now() - timedelta(days=2),
            end_datetime=timezone.now() - timedelta(days=2, hours=-3)  # Ended 2 days ago
        )
        
        past_ticket_type = TicketType.objects.create(
            event=past_event,
            name='General Admission',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        past_booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=past_event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        past_ticket = Ticket.objects.create(
            booking=past_booking,
            ticket_type=past_ticket_type,
            price=Decimal('50.00')
        )
        
        # Should be valid initially
        self.assertEqual(past_ticket.status, 'valid')
        
        # Run expiration
        expired_count = TicketStatusManager.expire_old_tickets()
        
        # Should have expired 1 ticket
        self.assertEqual(expired_count, 1)
        
        past_ticket.refresh_from_db()
        self.assertEqual(past_ticket.status, 'expired')
    
    def test_bulk_cancel_tickets(self):
        """Test bulk cancellation of tickets in a booking"""
        # Create additional tickets
        ticket2 = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
        
        ticket3 = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
        
        # Cancel all tickets
        cancelled_count = TicketStatusManager.bulk_cancel_tickets(
            self.booking, "Booking cancelled by customer"
        )
        
        self.assertEqual(cancelled_count, 3)
        
        # All tickets should be cancelled
        for ticket in [self.ticket, ticket2, ticket3]:
            ticket.refresh_from_db()
            self.assertEqual(ticket.status, 'cancelled')
    
    def test_ticket_model_status_change_method(self):
        """Test status change through ticket model method"""
        success, message = self.ticket.change_status('cancelled', 'Test cancellation', 'Admin')
        
        self.assertTrue(success)
        self.assertIn('cancelled', message)
        
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'cancelled')


class TicketModelEnhancementsTest(TestCase):
    """Test cases for enhanced ticket model methods"""
    
    def setUp(self):
        """Set up test data"""
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
        
        # Create event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A great test concert',
            venue='Test Arena',
            address='123 Test St, Test City',
            category='concert',
            start_datetime=timezone.now() + timedelta(minutes=15),
            end_datetime=timezone.now() + timedelta(minutes=15, hours=3)
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General Admission',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        # Create booking and ticket
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('50.00'),
            total_amount=Decimal('50.00'),
            customer_email='customer@example.com'
        )
        
        self.ticket = Ticket.objects.create(
            booking=self.booking,
            ticket_type=self.ticket_type,
            price=Decimal('50.00')
        )
    
    def test_enhanced_qr_code_generation(self):
        """Test enhanced QR code generation with signature"""
        # QR code should be generated automatically
        self.assertIsNotNone(self.ticket.qr_code_data)
        self.assertIsNotNone(self.ticket.qr_code_image)
        
        # Should contain signature
        parts = self.ticket.qr_code_data.split('|')
        self.assertEqual(len(parts), 4)
        self.assertTrue(len(parts[3]) > 0)  # Signature should exist
    
    def test_ticket_validation_method(self):
        """Test ticket validation through model method"""
        is_valid, message = self.ticket.validate_for_entry("Scanner1")
        
        self.assertTrue(is_valid)
        self.assertEqual(message, "Ticket validated successfully")
        
        # Should be marked as used
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'used')
    
    def test_get_detailed_info_method(self):
        """Test getting detailed info through model method"""
        info = self.ticket.get_detailed_info()
        
        self.assertEqual(info['ticket_number'], self.ticket.ticket_number)
        self.assertEqual(info['type'], 'event')
        self.assertEqual(info['title'], self.event.title)
        self.assertTrue(info['is_valid_for_entry'])