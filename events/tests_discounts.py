from django.test import TestCase
from django.contrib.auth.models import User, Group
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta

from .models import Event, TicketType, Discount
from .services import DiscountService, BookingPriceCalculator
from bookings.models import Booking
from users.models import UserProfile


class DiscountModelTest(TestCase):
    """Test cases for Discount model"""
    
    def setUp(self):
        # Create test user and event
        self.user = User.objects.create_user(
            username='testowner',
            email='owner@test.com',
            password='testpass123'
        )
        
        # Create user profile with event_owner role
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'role': 'event_owner',
                'phone_number': '+1234567890'
            }
        )
        
        self.event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3),
            status='published'
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
    
    def test_discount_creation(self):
        """Test creating a discount"""
        discount = Discount.objects.create(
            event=self.event,
            name='Early Bird',
            description='Early bird discount',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            valid_from=timezone.now(),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        self.assertEqual(discount.event, self.event)
        self.assertEqual(discount.name, 'Early Bird')
        self.assertEqual(discount.discount_type, 'percentage')
        self.assertEqual(discount.discount_value, Decimal('20.00'))
        self.assertTrue(discount.is_active)
        self.assertEqual(discount.current_uses, 0)
    
    def test_promo_code_discount(self):
        """Test creating a promo code discount"""
        discount = Discount.objects.create(
            event=self.event,
            name='SAVE20',
            description='Save 20% with promo code',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='promo_code',
            promo_code='SAVE20',
            max_uses=100,
            valid_from=timezone.now(),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        self.assertEqual(discount.promo_code, 'SAVE20')
        self.assertEqual(discount.max_uses, 100)
    
    def test_discount_validation(self):
        """Test discount model validation"""
        # Test percentage discount over 100%
        with self.assertRaises(ValidationError):
            discount = Discount(
                event=self.event,
                name='Invalid Discount',
                discount_type='percentage',
                discount_value=Decimal('150.00'),
                category='early_bird',
                valid_from=timezone.now(),
                valid_until=timezone.now() + timedelta(days=10)
            )
            discount.full_clean()
        
        # Test promo code category without promo code
        with self.assertRaises(ValidationError):
            discount = Discount(
                event=self.event,
                name='Invalid Promo',
                discount_type='percentage',
                discount_value=Decimal('20.00'),
                category='promo_code',
                valid_from=timezone.now(),
                valid_until=timezone.now() + timedelta(days=10)
            )
            discount.full_clean()
        
        # Test invalid date range
        with self.assertRaises(ValidationError):
            discount = Discount(
                event=self.event,
                name='Invalid Dates',
                discount_type='percentage',
                discount_value=Decimal('20.00'),
                category='early_bird',
                valid_from=timezone.now() + timedelta(days=10),
                valid_until=timezone.now()
            )
            discount.full_clean()
    
    def test_discount_is_valid_property(self):
        """Test the is_valid property"""
        # Valid discount
        valid_discount = Discount.objects.create(
            event=self.event,
            name='Valid Discount',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        self.assertTrue(valid_discount.is_valid)
        
        # Expired discount
        expired_discount = Discount.objects.create(
            event=self.event,
            name='Expired Discount',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(days=10),
            valid_until=timezone.now() - timedelta(hours=1)
        )
        self.assertFalse(expired_discount.is_valid)
        
        # Inactive discount
        inactive_discount = Discount.objects.create(
            event=self.event,
            name='Inactive Discount',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            is_active=False,
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        self.assertFalse(inactive_discount.is_valid)


class DiscountServiceTest(TestCase):
    """Test cases for DiscountService"""
    
    def setUp(self):
        # Create test user and event
        self.user = User.objects.create_user(
            username='testowner',
            email='owner@test.com',
            password='testpass123'
        )
        
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'role': 'event_owner',
                'phone_number': '+1234567890'
            }
        )
        
        self.event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3),
            status='published'
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.discount = Discount.objects.create(
            event=self.event,
            name='Early Bird',
            description='Early bird discount',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        self.promo_discount = Discount.objects.create(
            event=self.event,
            name='SAVE20',
            description='Save 20% with promo code',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='promo_code',
            promo_code='SAVE20',
            max_uses=100,
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
    
    def test_validate_discount(self):
        """Test discount validation"""
        # Valid discount
        is_valid, message = DiscountService.validate_discount(self.discount)
        self.assertTrue(is_valid)
        self.assertEqual(message, "Discount is valid")
        
        # Inactive discount
        self.discount.is_active = False
        self.discount.save()
        is_valid, message = DiscountService.validate_discount(self.discount)
        self.assertFalse(is_valid)
        self.assertEqual(message, "Discount is not active")
        
        # Reset for next test
        self.discount.is_active = True
        self.discount.save()
        
        # Expired discount
        self.discount.valid_until = timezone.now() - timedelta(hours=1)
        self.discount.save()
        is_valid, message = DiscountService.validate_discount(self.discount)
        self.assertFalse(is_valid)
        self.assertEqual(message, "Discount has expired")
        
        # Reset for next test
        self.discount.valid_until = timezone.now() + timedelta(days=10)
        self.discount.save()
        
        # Usage limit reached
        self.discount.max_uses = 5
        self.discount.current_uses = 5
        self.discount.save()
        is_valid, message = DiscountService.validate_discount(self.discount)
        self.assertFalse(is_valid)
        self.assertEqual(message, "Discount usage limit reached")
    
    def test_validate_promo_code(self):
        """Test promo code validation"""
        # Valid promo code
        discount, message = DiscountService.validate_promo_code(self.event, 'SAVE20')
        self.assertIsNotNone(discount)
        self.assertEqual(discount.promo_code, 'SAVE20')
        self.assertEqual(message, "Promo code is valid")
        
        # Invalid promo code
        discount, message = DiscountService.validate_promo_code(self.event, 'INVALID')
        self.assertIsNone(discount)
        self.assertEqual(message, "Invalid promo code")
        
        # Case insensitive
        discount, message = DiscountService.validate_promo_code(self.event, 'save20')
        self.assertIsNotNone(discount)
        self.assertEqual(message, "Promo code is valid")
    
    def test_get_applicable_discounts(self):
        """Test getting applicable discounts"""
        # Create group discount
        group_discount = Discount.objects.create(
            event=self.event,
            name='Group Discount',
            discount_type='percentage',
            discount_value=Decimal('15.00'),
            category='group',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        # Test with quantity < 5 (should not include group discount)
        applicable = DiscountService.get_applicable_discounts(self.event, quantity=2)
        self.assertIn(self.discount, applicable)
        self.assertNotIn(group_discount, applicable)
        self.assertNotIn(self.promo_discount, applicable)  # Promo codes excluded
        
        # Test with quantity >= 5 (should include group discount)
        applicable = DiscountService.get_applicable_discounts(self.event, quantity=5)
        self.assertIn(self.discount, applicable)
        self.assertIn(group_discount, applicable)
        self.assertNotIn(self.promo_discount, applicable)  # Promo codes excluded
    
    def test_calculate_discount_amount(self):
        """Test discount amount calculation"""
        subtotal = Decimal('100.00')
        
        # Percentage discount
        amount = DiscountService.calculate_discount_amount(self.discount, subtotal)
        self.assertEqual(amount, Decimal('20.00'))  # 20% of 100
        
        # Fixed amount discount
        fixed_discount = Discount.objects.create(
            event=self.event,
            name='Fixed Discount',
            discount_type='fixed_amount',
            discount_value=Decimal('15.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        amount = DiscountService.calculate_discount_amount(fixed_discount, subtotal)
        self.assertEqual(amount, Decimal('15.00'))
        
        # Discount amount should not exceed subtotal
        large_discount = Discount.objects.create(
            event=self.event,
            name='Large Discount',
            discount_type='fixed_amount',
            discount_value=Decimal('150.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        amount = DiscountService.calculate_discount_amount(large_discount, subtotal)
        self.assertEqual(amount, subtotal)  # Should be capped at subtotal
    
    def test_get_best_discount(self):
        """Test getting the best applicable discount"""
        subtotal = Decimal('100.00')
        
        # Create multiple discounts
        better_discount = Discount.objects.create(
            event=self.event,
            name='Better Discount',
            discount_type='percentage',
            discount_value=Decimal('30.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        # Test without promo code
        best_discount, amount = DiscountService.get_best_discount(self.event, subtotal)
        self.assertEqual(best_discount, better_discount)
        self.assertEqual(amount, Decimal('30.00'))
        
        # Test with promo code (should override if better)
        best_discount, amount = DiscountService.get_best_discount(
            self.event, subtotal, promo_code='SAVE20'
        )
        self.assertEqual(best_discount, better_discount)  # Better discount wins
        self.assertEqual(amount, Decimal('30.00'))
        
        # Test with better promo code
        better_promo = Discount.objects.create(
            event=self.event,
            name='SAVE50',
            discount_type='percentage',
            discount_value=Decimal('50.00'),
            category='promo_code',
            promo_code='SAVE50',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        best_discount, amount = DiscountService.get_best_discount(
            self.event, subtotal, promo_code='SAVE50'
        )
        self.assertEqual(best_discount, better_promo)
        self.assertEqual(amount, Decimal('50.00'))
    
    def test_apply_discount(self):
        """Test applying a discount"""
        initial_uses = self.discount.current_uses
        
        # Apply discount
        success = DiscountService.apply_discount(self.discount)
        self.assertTrue(success)
        
        # Check usage count increased
        self.discount.refresh_from_db()
        self.assertEqual(self.discount.current_uses, initial_uses + 1)
        
        # Test applying invalid discount
        self.discount.is_active = False
        self.discount.save()
        
        success = DiscountService.apply_discount(self.discount)
        self.assertFalse(success)


class BookingPriceCalculatorTest(TestCase):
    """Test cases for BookingPriceCalculator"""
    
    def setUp(self):
        # Create test user and event
        self.user = User.objects.create_user(
            username='testowner',
            email='owner@test.com',
            password='testpass123'
        )
        
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'role': 'event_owner',
                'phone_number': '+1234567890'
            }
        )
        
        self.event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3),
            status='published'
        )
        
        self.general_ticket = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.vip_ticket = TicketType.objects.create(
            event=self.event,
            name='VIP',
            price=Decimal('100.00'),
            quantity_available=50
        )
        
        self.discount = Discount.objects.create(
            event=self.event,
            name='Early Bird',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
    
    def test_calculate_booking_price_without_discount(self):
        """Test price calculation without discount"""
        # Make the discount inactive to test without discount
        self.discount.is_active = False
        self.discount.save()
        
        ticket_selections = [
            {'ticket_type_id': self.general_ticket.id, 'quantity': 2},
            {'ticket_type_id': self.vip_ticket.id, 'quantity': 1}
        ]
        
        price_breakdown = BookingPriceCalculator.calculate_booking_price(
            ticket_selections, self.event
        )
        
        expected_subtotal = (50.00 * 2) + (100.00 * 1)  # 200.00
        expected_fee = expected_subtotal * 0.03  # 6.00
        expected_total = expected_subtotal + expected_fee  # 206.00
        
        self.assertEqual(price_breakdown['subtotal'], expected_subtotal)
        self.assertEqual(price_breakdown['discount_amount'], 0.00)
        self.assertEqual(price_breakdown['processing_fee'], expected_fee)
        self.assertEqual(price_breakdown['total'], expected_total)
        self.assertEqual(price_breakdown['total_quantity'], 3)
        self.assertIsNone(price_breakdown['discount_applied'])
    
    def test_calculate_booking_price_with_discount(self):
        """Test price calculation with automatic discount"""
        ticket_selections = [
            {'ticket_type_id': self.general_ticket.id, 'quantity': 2}
        ]
        
        price_breakdown = BookingPriceCalculator.calculate_booking_price(
            ticket_selections, self.event
        )
        
        expected_subtotal = 100.00  # 50.00 * 2
        expected_discount = 20.00   # 20% of 100.00
        expected_fee = expected_subtotal * 0.03  # 3.00
        expected_total = expected_subtotal - expected_discount + expected_fee  # 83.00
        
        self.assertEqual(price_breakdown['subtotal'], expected_subtotal)
        self.assertEqual(price_breakdown['discount_amount'], expected_discount)
        self.assertEqual(price_breakdown['processing_fee'], expected_fee)
        self.assertEqual(price_breakdown['total'], expected_total)
        self.assertIsNotNone(price_breakdown['discount_applied'])
        self.assertEqual(price_breakdown['discount_applied']['id'], self.discount.id)
    
    def test_calculate_booking_price_with_promo_code(self):
        """Test price calculation with promo code"""
        promo_discount = Discount.objects.create(
            event=self.event,
            name='SAVE30',
            discount_type='percentage',
            discount_value=Decimal('30.00'),
            category='promo_code',
            promo_code='SAVE30',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        ticket_selections = [
            {'ticket_type_id': self.general_ticket.id, 'quantity': 2}
        ]
        
        price_breakdown = BookingPriceCalculator.calculate_booking_price(
            ticket_selections, self.event, promo_code='SAVE30'
        )
        
        expected_subtotal = 100.00  # 50.00 * 2
        expected_discount = 30.00   # 30% of 100.00 (better than early bird)
        expected_fee = expected_subtotal * 0.03  # 3.00
        expected_total = expected_subtotal - expected_discount + expected_fee  # 73.00
        
        self.assertEqual(price_breakdown['subtotal'], expected_subtotal)
        self.assertEqual(price_breakdown['discount_amount'], expected_discount)
        self.assertEqual(price_breakdown['processing_fee'], expected_fee)
        self.assertEqual(price_breakdown['total'], expected_total)
        self.assertEqual(price_breakdown['discount_applied']['id'], promo_discount.id)
    
    def test_calculate_booking_price_invalid_ticket_type(self):
        """Test price calculation with invalid ticket type"""
        ticket_selections = [
            {'ticket_type_id': 99999, 'quantity': 1}  # Non-existent ticket type
        ]
        
        with self.assertRaises(ValidationError):
            BookingPriceCalculator.calculate_booking_price(
                ticket_selections, self.event
            )


class DiscountAnalyticsTest(TestCase):
    """Test cases for discount analytics"""
    
    def setUp(self):
        # Create test user and event
        self.user = User.objects.create_user(
            username='testowner',
            email='owner@test.com',
            password='testpass123'
        )
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'role': 'event_owner',
                'phone_number': '+1234567890'
            }
        )
        
        self.customer_profile, _ = UserProfile.objects.get_or_create(
            user=self.customer,
            defaults={
                'role': 'customer',
                'phone_number': '+1234567891'
            }
        )
        
        self.event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3),
            status='published'
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.discount = Discount.objects.create(
            event=self.event,
            name='Early Bird',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            category='early_bird',
            current_uses=5,
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
        
        # Create test booking with discount
        self.booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            subtotal=Decimal('100.00'),
            discount_amount=Decimal('20.00'),
            fees=Decimal('3.00'),
            total_amount=Decimal('83.00'),
            applied_discount=self.discount,
            customer_email='customer@test.com',
            payment_status='completed'
        )
    
    def test_get_discount_analytics(self):
        """Test discount analytics calculation"""
        analytics = DiscountService.get_discount_analytics(self.event)
        
        self.assertEqual(analytics['total_discounts'], 1)
        self.assertEqual(analytics['active_discounts'], 1)
        self.assertEqual(analytics['expired_discounts'], 0)
        self.assertEqual(analytics['total_discount_amount'], Decimal('20.00'))
        self.assertEqual(analytics['bookings_with_discounts'], 1)
        
        # Check discount usage details
        self.assertIn('Early Bird', analytics['discount_usage'])
        usage_data = analytics['discount_usage']['Early Bird']
        self.assertEqual(usage_data['current_uses'], 5)
        self.assertEqual(usage_data['total_discount_amount'], 20.00)
        self.assertEqual(usage_data['bookings_count'], 1)