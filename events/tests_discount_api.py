from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import timedelta

from .models import Event, TicketType, Discount
from users.models import UserProfile


class DiscountAPITest(TestCase):
    """Test cases for discount-related API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='owner@test.com',
            password='testpass123'
        )
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        
        # Create user profiles
        self.owner_profile, _ = UserProfile.objects.get_or_create(
            user=self.event_owner,
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
        
        # Create test event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3),
            status='published'
        )
        
        # Create ticket types
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
        
        # Create test discount
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
            name='SAVE30',
            description='Save 30% with promo code',
            discount_type='percentage',
            discount_value=Decimal('30.00'),
            category='promo_code',
            promo_code='SAVE30',
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=10)
        )
    
    def test_create_discount_as_event_owner(self):
        """Test creating a discount as event owner"""
        self.client.force_authenticate(user=self.event_owner)
        
        url = reverse('events:event-discounts', kwargs={'pk': self.event.id})
        data = {
            'name': 'Student Discount',
            'description': 'Discount for students',
            'discount_type': 'percentage',
            'discount_value': '15.00',
            'category': 'student',
            'valid_from': timezone.now().isoformat(),
            'valid_until': (timezone.now() + timedelta(days=5)).isoformat()
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Student Discount')
        self.assertEqual(response.data['discount_value'], '15.00')
    
    def test_create_discount_unauthorized(self):
        """Test creating a discount without authentication"""
        url = reverse('events:event-discounts', kwargs={'pk': self.event.id})
        data = {
            'name': 'Unauthorized Discount',
            'discount_type': 'percentage',
            'discount_value': '10.00',
            'category': 'early_bird',
            'valid_from': timezone.now().isoformat(),
            'valid_until': (timezone.now() + timedelta(days=5)).isoformat()
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_validate_promo_code_valid(self):
        """Test validating a valid promo code"""
        url = reverse('events:event-validate-promo-code', kwargs={'pk': self.event.id})
        data = {'promo_code': 'SAVE30'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['discount']['id'], self.promo_discount.id)
    
    def test_validate_promo_code_invalid(self):
        """Test validating an invalid promo code"""
        url = reverse('events:event-validate-promo-code', kwargs={'pk': self.event.id})
        data = {'promo_code': 'INVALID'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        self.assertIsNone(response.data['discount'])
    
    def test_calculate_price_without_promo(self):
        """Test price calculation without promo code"""
        url = reverse('events:event-calculate-price', kwargs={'pk': self.event.id})
        data = {
            'ticket_selections': [
                {'ticket_type_id': self.general_ticket.id, 'quantity': 2}
            ]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should apply early bird discount automatically
        self.assertEqual(response.data['subtotal'], 100.0)  # 50 * 2
        self.assertEqual(response.data['discount_amount'], 20.0)  # 20% of 100
        self.assertEqual(response.data['total_quantity'], 2)
        self.assertIsNotNone(response.data['discount_applied'])
    
    def test_calculate_price_with_promo(self):
        """Test price calculation with promo code"""
        url = reverse('events:event-calculate-price', kwargs={'pk': self.event.id})
        data = {
            'ticket_selections': [
                {'ticket_type_id': self.general_ticket.id, 'quantity': 2}
            ],
            'promo_code': 'SAVE30'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should apply promo code discount (better than early bird)
        self.assertEqual(response.data['subtotal'], 100.0)  # 50 * 2
        self.assertEqual(response.data['discount_amount'], 30.0)  # 30% of 100
        self.assertEqual(response.data['total_quantity'], 2)
        self.assertEqual(response.data['discount_applied']['id'], self.promo_discount.id)
    
    def test_discount_analytics_as_owner(self):
        """Test getting discount analytics as event owner"""
        self.client.force_authenticate(user=self.event_owner)
        
        url = reverse('events:event-discount-analytics', kwargs={'pk': self.event.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_discounts'], 2)
        self.assertEqual(response.data['active_discounts'], 2)
        self.assertIn('Early Bird', response.data['discount_usage'])
        self.assertIn('SAVE30', response.data['discount_usage'])
    
    def test_discount_analytics_unauthorized(self):
        """Test getting discount analytics without proper authorization"""
        self.client.force_authenticate(user=self.customer)
        
        url = reverse('events:event-discount-analytics', kwargs={'pk': self.event.id})
        response = self.client.get(url)
        
        # Should be forbidden for non-owners
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_event_discounts(self):
        """Test listing discounts for an event"""
        url = reverse('events:event-discounts', kwargs={'pk': self.event.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Check that both discounts are returned
        discount_names = [d['name'] for d in response.data]
        self.assertIn('Early Bird', discount_names)
        self.assertIn('SAVE30', discount_names)
    
    def test_calculate_price_invalid_ticket_type(self):
        """Test price calculation with invalid ticket type"""
        url = reverse('events:event-calculate-price', kwargs={'pk': self.event.id})
        data = {
            'ticket_selections': [
                {'ticket_type_id': 99999, 'quantity': 1}  # Non-existent ticket type
            ]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_calculate_price_mixed_ticket_types(self):
        """Test price calculation with multiple ticket types"""
        url = reverse('events:event-calculate-price', kwargs={'pk': self.event.id})
        data = {
            'ticket_selections': [
                {'ticket_type_id': self.general_ticket.id, 'quantity': 2},
                {'ticket_type_id': self.vip_ticket.id, 'quantity': 1}
            ]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Subtotal: (50 * 2) + (100 * 1) = 200
        # Discount: 20% of 200 = 40
        self.assertEqual(response.data['subtotal'], 200.0)
        self.assertEqual(response.data['discount_amount'], 40.0)
        self.assertEqual(response.data['total_quantity'], 3)
        
        # Check ticket details
        self.assertEqual(len(response.data['ticket_details']), 2)
        ticket_details = {td['ticket_type']: td for td in response.data['ticket_details']}
        self.assertEqual(ticket_details['General']['quantity'], 2)
        self.assertEqual(ticket_details['VIP']['quantity'], 1)