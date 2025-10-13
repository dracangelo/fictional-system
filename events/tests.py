from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from .models import Event, TicketType, Discount


class EventModelTest(TestCase):
    """Test cases for Event model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='eventowner',
            email='owner@example.com',
            password='testpass123'
        )
        
        self.future_datetime = timezone.now() + timedelta(days=30)
        self.end_datetime = self.future_datetime + timedelta(hours=3)
        
        self.event_data = {
            'owner': self.user,
            'title': 'Test Concert',
            'description': 'A great test concert',
            'venue': 'Test Arena',
            'address': '123 Test St, Test City',
            'category': 'concert',
            'start_datetime': self.future_datetime,
            'end_datetime': self.end_datetime,
        }
    
    def test_event_creation(self):
        """Test basic event creation"""
        event = Event.objects.create(**self.event_data)
        
        self.assertEqual(event.title, 'Test Concert')
        self.assertEqual(event.owner, self.user)
        self.assertEqual(event.status, 'draft')  # Default status
        self.assertTrue(event.is_active)  # Default active
        self.assertEqual(event.media, [])  # Default empty list
    
    def test_event_str_representation(self):
        """Test string representation of event"""
        event = Event.objects.create(**self.event_data)
        expected_str = f"Test Concert - {self.future_datetime.strftime('%Y-%m-%d')}"
        self.assertEqual(str(event), expected_str)
    
    def test_event_validation_end_before_start(self):
        """Test validation when end datetime is before start datetime"""
        invalid_data = self.event_data.copy()
        invalid_data['end_datetime'] = self.future_datetime - timedelta(hours=1)
        
        with self.assertRaises(ValidationError):
            Event.objects.create(**invalid_data)
    
    def test_event_validation_past_datetime(self):
        """Test validation when event is scheduled in the past"""
        invalid_data = self.event_data.copy()
        invalid_data['start_datetime'] = timezone.now() - timedelta(days=1)
        invalid_data['end_datetime'] = timezone.now() - timedelta(hours=1)
        
        with self.assertRaises(ValidationError):
            Event.objects.create(**invalid_data)
    
    def test_event_properties(self):
        """Test event property methods"""
        event = Event.objects.create(**self.event_data)
        
        # Test upcoming event
        self.assertTrue(event.is_upcoming)
        self.assertFalse(event.is_ongoing)
        self.assertFalse(event.is_past)
        
        # For testing ongoing event, we'll modify the existing event
        # since we can't create events in the past due to validation
        original_start = event.start_datetime
        original_end = event.end_datetime
        
        # Temporarily disable validation to test ongoing state
        event.start_datetime = timezone.now() - timedelta(hours=1)
        event.end_datetime = timezone.now() + timedelta(hours=1)
        # Save without calling full_clean to bypass validation
        super(Event, event).save()
        
        self.assertFalse(event.is_upcoming)
        self.assertTrue(event.is_ongoing)
        self.assertFalse(event.is_past)
        
        # Test past event
        event.start_datetime = timezone.now() - timedelta(hours=3)
        event.end_datetime = timezone.now() - timedelta(hours=1)
        super(Event, event).save()
        
        self.assertFalse(event.is_upcoming)
        self.assertFalse(event.is_ongoing)
        self.assertTrue(event.is_past)
    
    def test_event_media_field(self):
        """Test media field functionality"""
        event_data = self.event_data.copy()
        event_data['media'] = ['http://example.com/image1.jpg', 'http://example.com/video1.mp4']
        
        event = Event.objects.create(**event_data)
        self.assertEqual(len(event.media), 2)
        self.assertIn('http://example.com/image1.jpg', event.media)


class TicketTypeModelTest(TestCase):
    """Test cases for TicketType model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='eventowner',
            email='owner@example.com',
            password='testpass123'
        )
        
        self.event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3)
        )
        
        self.ticket_type_data = {
            'event': self.event,
            'name': 'General Admission',
            'description': 'Standard ticket',
            'price': Decimal('50.00'),
            'quantity_available': 100,
        }
    
    def test_ticket_type_creation(self):
        """Test basic ticket type creation"""
        ticket_type = TicketType.objects.create(**self.ticket_type_data)
        
        self.assertEqual(ticket_type.name, 'General Admission')
        self.assertEqual(ticket_type.price, Decimal('50.00'))
        self.assertEqual(ticket_type.quantity_available, 100)
        self.assertEqual(ticket_type.quantity_sold, 0)  # Default
        self.assertTrue(ticket_type.is_active)  # Default
    
    def test_ticket_type_str_representation(self):
        """Test string representation of ticket type"""
        ticket_type = TicketType.objects.create(**self.ticket_type_data)
        expected_str = f"Test Event - General Admission ($50.00)"
        self.assertEqual(str(ticket_type), expected_str)
    
    def test_ticket_type_validation_sold_exceeds_available(self):
        """Test validation when quantity sold exceeds available"""
        invalid_data = self.ticket_type_data.copy()
        invalid_data['quantity_sold'] = 150  # More than available (100)
        
        with self.assertRaises(ValidationError):
            TicketType.objects.create(**invalid_data)
    
    def test_ticket_type_properties(self):
        """Test ticket type property methods"""
        ticket_type = TicketType.objects.create(**self.ticket_type_data)
        
        # Test initial state
        self.assertEqual(ticket_type.tickets_remaining, 100)
        self.assertFalse(ticket_type.is_sold_out)
        self.assertTrue(ticket_type.is_on_sale)
        
        # Test after some sales
        ticket_type.quantity_sold = 50
        ticket_type.save()
        self.assertEqual(ticket_type.tickets_remaining, 50)
        self.assertFalse(ticket_type.is_sold_out)
        
        # Test sold out
        ticket_type.quantity_sold = 100
        ticket_type.save()
        self.assertEqual(ticket_type.tickets_remaining, 0)
        self.assertTrue(ticket_type.is_sold_out)
        self.assertFalse(ticket_type.is_on_sale)  # Sold out, so not on sale
    
    def test_ticket_type_unique_constraint(self):
        """Test unique constraint on event and name"""
        TicketType.objects.create(**self.ticket_type_data)
        
        # Try to create another ticket type with same name for same event
        with self.assertRaises(Exception):  # IntegrityError
            TicketType.objects.create(**self.ticket_type_data)
    
    def test_ticket_type_sale_datetime_validation(self):
        """Test sale datetime validation"""
        ticket_data = self.ticket_type_data.copy()
        ticket_data['sale_start_datetime'] = timezone.now() + timedelta(days=1)
        ticket_data['sale_end_datetime'] = timezone.now() + timedelta(hours=1)  # Before start
        
        with self.assertRaises(ValidationError):
            TicketType.objects.create(**ticket_data)


class DiscountModelTest(TestCase):
    """Test cases for Discount model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='eventowner',
            email='owner@example.com',
            password='testpass123'
        )
        
        self.event = Event.objects.create(
            owner=self.user,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='Test Address',
            start_datetime=timezone.now() + timedelta(days=30),
            end_datetime=timezone.now() + timedelta(days=30, hours=3)
        )
        
        self.discount_data = {
            'event': self.event,
            'name': 'Early Bird Discount',
            'description': '20% off for early bookings',
            'discount_type': 'percentage',
            'discount_value': Decimal('20.00'),
            'category': 'early_bird',
            'valid_from': timezone.now(),
            'valid_until': timezone.now() + timedelta(days=15),
        }
    
    def test_discount_creation(self):
        """Test basic discount creation"""
        discount = Discount.objects.create(**self.discount_data)
        
        self.assertEqual(discount.name, 'Early Bird Discount')
        self.assertEqual(discount.discount_type, 'percentage')
        self.assertEqual(discount.discount_value, Decimal('20.00'))
        self.assertEqual(discount.current_uses, 0)  # Default
        self.assertTrue(discount.is_active)  # Default
    
    def test_discount_str_representation(self):
        """Test string representation of discount"""
        discount = Discount.objects.create(**self.discount_data)
        expected_str = f"Test Event - Early Bird Discount"
        self.assertEqual(str(discount), expected_str)
    
    def test_discount_validation_invalid_dates(self):
        """Test validation when valid_until is before valid_from"""
        invalid_data = self.discount_data.copy()
        invalid_data['valid_until'] = timezone.now() - timedelta(days=1)
        
        with self.assertRaises(ValidationError):
            Discount.objects.create(**invalid_data)
    
    def test_discount_validation_percentage_over_100(self):
        """Test validation when percentage discount exceeds 100%"""
        invalid_data = self.discount_data.copy()
        invalid_data['discount_value'] = Decimal('150.00')
        
        with self.assertRaises(ValidationError):
            Discount.objects.create(**invalid_data)
    
    def test_discount_validation_promo_code_required(self):
        """Test validation when promo code category requires promo code"""
        invalid_data = self.discount_data.copy()
        invalid_data['category'] = 'promo_code'
        # promo_code field is not set
        
        with self.assertRaises(ValidationError):
            Discount.objects.create(**invalid_data)
    
    def test_discount_is_valid_property(self):
        """Test is_valid property"""
        discount = Discount.objects.create(**self.discount_data)
        
        # Should be valid initially
        self.assertTrue(discount.is_valid)
        
        # Test expired discount - need to update both dates to maintain valid range
        past_date = timezone.now() - timedelta(days=2)
        expired_date = timezone.now() - timedelta(days=1)
        discount.valid_from = past_date
        discount.valid_until = expired_date
        discount.save()
        self.assertFalse(discount.is_valid)
        
        # Test usage limit reached
        discount.valid_from = timezone.now()
        discount.valid_until = timezone.now() + timedelta(days=15)
        discount.max_uses = 5
        discount.current_uses = 5
        discount.save()
        self.assertFalse(discount.is_valid)
    
    def test_discount_promo_code_functionality(self):
        """Test promo code discount functionality"""
        promo_data = self.discount_data.copy()
        promo_data['category'] = 'promo_code'
        promo_data['promo_code'] = 'SAVE20'
        
        discount = Discount.objects.create(**promo_data)
        self.assertEqual(discount.promo_code, 'SAVE20')
        self.assertTrue(discount.is_valid)
    
    def test_discount_unique_promo_code_per_event(self):
        """Test unique constraint on event and promo code"""
        promo_data = self.discount_data.copy()
        promo_data['category'] = 'promo_code'
        promo_data['promo_code'] = 'SAVE20'
        
        Discount.objects.create(**promo_data)
        
        # Try to create another discount with same promo code for same event
        with self.assertRaises(Exception):  # IntegrityError
            Discount.objects.create(**promo_data)


# API Tests
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


class EventAPITest(APITestCase):
    """Test Event API endpoints"""
    
    def setUp(self):
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='testpass123'
        )
        self.admin_user.profile.role = 'admin'
        self.admin_user.profile.save()
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='owner@example.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123'
        )
        self.customer.profile.role = 'customer'
        self.customer.profile.save()
        
        # Create test event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='123 Test St',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            status='published'
        )
        
        # Create ticket types
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.client = APIClient()
    
    def get_jwt_token(self, user):
        """Get JWT token for user"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_event_list_public(self):
        """Test public event list access"""
        url = reverse('events:event-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_event_detail_public(self):
        """Test public event detail access"""
        url = reverse('events:event-detail', kwargs={'pk': self.event.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Event')
    
    def test_event_create_permission(self):
        """Test event creation permissions"""
        url = reverse('events:event-list')
        event_data = {
            'title': 'New Event',
            'description': 'New Description',
            'venue': 'New Venue',
            'address': '456 New St',
            'category': 'theater',
            'start_datetime': (timezone.now() + timedelta(days=14)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=14, hours=2)).isoformat(),
        }
        
        # Test without authentication
        response = self.client.post(url, event_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test with customer (should fail)
        token = self.get_jwt_token(self.customer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(url, event_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with event owner (should succeed)
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(url, event_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Event')
    
    def test_event_update_permission(self):
        """Test event update permissions"""
        url = reverse('events:event-detail', kwargs={'pk': self.event.pk})
        update_data = {'title': 'Updated Event'}
        
        # Test with customer (should fail)
        token = self.get_jwt_token(self.customer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with event owner (should succeed)
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Event')
    
    def test_event_search_filtering(self):
        """Test event search and filtering"""
        # Create additional events for testing
        Event.objects.create(
            owner=self.event_owner,
            title='Rock Concert',
            description='Amazing rock music',
            venue='Rock Arena',
            address='789 Rock St',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=10),
            end_datetime=timezone.now() + timedelta(days=10, hours=3),
            status='published'
        )
        
        Event.objects.create(
            owner=self.event_owner,
            title='Theater Play',
            description='Classic theater performance',
            venue='Theater Hall',
            address='321 Theater Ave',
            category='theater',
            start_datetime=timezone.now() + timedelta(days=15),
            end_datetime=timezone.now() + timedelta(days=15, hours=2),
            status='published'
        )
        
        url = reverse('events:event-list')
        
        # Test search
        response = self.client.get(url, {'search': 'rock'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIn('Rock Concert', response.data['results'][0]['title'])
        
        # Test category filter
        response = self.client.get(url, {'category': 'theater'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['category'], 'theater')
        
        # Test location filter
        response = self.client.get(url, {'location': 'Arena'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_event_status_update(self):
        """Test event status update"""
        url = reverse('events:event-update-status', kwargs={'pk': self.event.pk})
        
        # Test with event owner
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Update to cancelled
        response = self.client.patch(url, {
            'status': 'cancelled',
            'reason': 'Venue unavailable'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['event']['status'], 'cancelled')
        
        # Try invalid status transition (cancelled to published)
        response = self.client.patch(url, {
            'status': 'published'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_event_analytics(self):
        """Test event analytics endpoint"""
        url = reverse('events:event-analytics', kwargs={'pk': self.event.pk})
        
        # Test with event owner
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('event_id', response.data)
        self.assertIn('total_bookings', response.data)
        self.assertIn('total_revenue', response.data)
        self.assertEqual(response.data['event_id'], self.event.id)
    
    def test_ticket_type_management(self):
        """Test ticket type management within event context"""
        url = reverse('events:event-ticket-types', kwargs={'pk': self.event.pk})
        
        # Test GET ticket types
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Test POST new ticket type (requires authentication)
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        ticket_data = {
            'name': 'VIP',
            'price': '100.00',
            'quantity_available': 50,
            'description': 'VIP access with premium seating'
        }
        
        response = self.client.post(url, ticket_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'VIP')
    
    def test_discount_management(self):
        """Test discount management within event context"""
        url = reverse('events:event-discounts', kwargs={'pk': self.event.pk})
        
        # Test with event owner
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Test GET discounts
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test POST new discount
        discount_data = {
            'name': 'Early Bird',
            'description': '20% off for early bookings',
            'discount_type': 'percentage',
            'discount_value': '20.00',
            'category': 'early_bird',
            'valid_from': timezone.now().isoformat(),
            'valid_until': (timezone.now() + timedelta(days=30)).isoformat(),
        }
        
        response = self.client.post(url, discount_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Early Bird')


class TicketTypeAPITest(APITestCase):
    """Test TicketType API endpoints"""
    
    def setUp(self):
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='owner@example.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='123 Test St',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
        )
        
        self.ticket_type = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100
        )
        
        self.client = APIClient()
    
    def get_jwt_token(self, user):
        """Get JWT token for user"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_ticket_type_crud(self):
        """Test ticket type CRUD operations"""
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Test list
        url = reverse('events:tickettype-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test detail
        url = reverse('events:tickettype-detail', kwargs={'pk': self.ticket_type.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test update
        update_data = {'price': '60.00'}
        response = self.client.patch(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['price'], '60.00')


class DiscountAPITest(APITestCase):
    """Test Discount API endpoints"""
    
    def setUp(self):
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='owner@example.com',
            password='testpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='Test Description',
            venue='Test Venue',
            address='123 Test St',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
        )
        
        self.discount = Discount.objects.create(
            event=self.event,
            name='Test Discount',
            discount_type='percentage',
            discount_value=Decimal('10.00'),
            category='early_bird',
            valid_from=timezone.now(),
            valid_until=timezone.now() + timedelta(days=30)
        )
        
        self.client = APIClient()
    
    def get_jwt_token(self, user):
        """Get JWT token for user"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_discount_crud(self):
        """Test discount CRUD operations"""
        token = self.get_jwt_token(self.event_owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Test list
        url = reverse('events:discount-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test detail
        url = reverse('events:discount-detail', kwargs={'pk': self.discount.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test update
        update_data = {'discount_value': '15.00'}
        response = self.client.patch(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['discount_value'], '15.00')