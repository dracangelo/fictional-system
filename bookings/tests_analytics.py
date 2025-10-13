from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock

from .analytics_service import AnalyticsService
from .report_generator import ReportGenerator
from .models import Booking, Ticket, CustomerReview, WaitlistEntry
from events.models import Event, TicketType, Discount
from theaters.models import Theater, Movie, Showtime
from users.models import UserProfile


class AnalyticsServiceTest(TestCase):
    """Test cases for AnalyticsService"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user,
            role='admin'
        )
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='eventowner@test.com',
            password='testpass123'
        )
        self.event_owner_profile = UserProfile.objects.create(
            user=self.event_owner,
            role='event_owner'
        )
        
        self.theater_owner = User.objects.create_user(
            username='theaterowner',
            email='theaterowner@test.com',
            password='testpass123'
        )
        self.theater_owner_profile = UserProfile.objects.create(
            user=self.theater_owner,
            role='theater_owner'
        )
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        self.customer_profile = UserProfile.objects.create(
            user=self.customer,
            role='customer'
        )
        
        # Create event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Concert',
            description='A test concert event',
            venue='Test Venue',
            address='123 Test St',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            status='published'
        )
        
        # Create ticket types
        self.ticket_type_general = TicketType.objects.create(
            event=self.event,
            name='General',
            price=Decimal('50.00'),
            quantity_available=100,
            quantity_sold=30
        )
        
        self.ticket_type_vip = TicketType.objects.create(
            event=self.event,
            name='VIP',
            price=Decimal('100.00'),
            quantity_available=50,
            quantity_sold=20
        )
        
        # Create theater
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
                        'seats_per_row': 20,
                        'vip_rows': [1, 2],
                    },
                    {
                        'screen_number': 2,
                        'rows': 8,
                        'seats_per_row': 15,
                        'vip_rows': [1],
                    }
                ]
            }
        )
        
        # Create movie
        self.movie = Movie.objects.create(
            title='Test Movie',
            description='A test movie',
            genre='action',
            duration=120,
            director='Test Director',
            release_date=timezone.now().date()
        )
        
        # Create showtime
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=2),
            base_price=Decimal('15.00'),
            total_seats=200,
            available_seats=180
        )
        
        # Create bookings
        self.event_booking = Booking.objects.create(
            customer=self.customer,
            booking_type='event',
            event=self.event,
            booking_reference='EVT123456',
            subtotal=Decimal('150.00'),
            fees=Decimal('4.50'),
            total_amount=Decimal('154.50'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        self.movie_booking = Booking.objects.create(
            customer=self.customer,
            booking_type='movie',
            showtime=self.showtime,
            booking_reference='MOV123456',
            subtotal=Decimal('30.00'),
            fees=Decimal('0.90'),
            total_amount=Decimal('30.90'),
            payment_status='completed',
            booking_status='confirmed',
            customer_email=self.customer.email
        )
        
        # Create tickets
        self.event_ticket1 = Ticket.objects.create(
            booking=self.event_booking,
            ticket_type=self.ticket_type_general,
            price=Decimal('50.00'),
            ticket_number='TKT-EVT-001'
        )
        
        self.event_ticket2 = Ticket.objects.create(
            booking=self.event_booking,
            ticket_type=self.ticket_type_vip,
            price=Decimal('100.00'),
            ticket_number='TKT-EVT-002'
        )
        
        self.movie_ticket1 = Ticket.objects.create(
            booking=self.movie_booking,
            seat_number='A1',
            price=Decimal('15.00'),
            ticket_number='TKT-MOV-001'
        )
        
        self.movie_ticket2 = Ticket.objects.create(
            booking=self.movie_booking,
            seat_number='A2',
            price=Decimal('15.00'),
            ticket_number='TKT-MOV-002'
        )
    
    def test_get_system_analytics(self):
        """Test system analytics generation"""
        analytics = AnalyticsService.get_system_analytics()
        
        # Check structure
        self.assertIn('period', analytics)
        self.assertIn('overview', analytics)
        self.assertIn('users', analytics)
        self.assertIn('breakdowns', analytics)
        
        # Check overview data
        overview = analytics['overview']
        self.assertEqual(overview['total_bookings'], 2)
        self.assertEqual(overview['total_tickets_sold'], 4)
        self.assertEqual(overview['total_revenue'], 180.0)  # 150 + 30
        
        # Check user data
        users = analytics['users']
        self.assertEqual(users['total_users'], 4)
        self.assertEqual(users['active_customers'], 1)
    
    def test_get_event_analytics(self):
        """Test event analytics generation"""
        analytics = AnalyticsService.get_event_analytics(self.event.id)
        
        # Check structure
        self.assertIn('event', analytics)
        self.assertIn('bookings', analytics)
        self.assertIn('tickets', analytics)
        self.assertIn('revenue', analytics)
        self.assertIn('ticket_types', analytics)
        
        # Check event data
        event_data = analytics['event']
        self.assertEqual(event_data['id'], self.event.id)
        self.assertEqual(event_data['title'], self.event.title)
        
        # Check booking data
        bookings = analytics['bookings']
        self.assertEqual(bookings['total'], 1)
        self.assertEqual(bookings['confirmed'], 1)
        
        # Check ticket types
        ticket_types = analytics['ticket_types']
        self.assertEqual(len(ticket_types), 2)
        
        # Find general ticket type
        general_type = next(tt for tt in ticket_types if tt['name'] == 'General')
        self.assertEqual(general_type['sold'], 30)
        self.assertEqual(general_type['revenue'], 50.0)  # Only from our test booking
    
    def test_get_event_analytics_permission_check(self):
        """Test event analytics permission checking"""
        # Should raise PermissionError for wrong owner
        with self.assertRaises(PermissionError):
            AnalyticsService.get_event_analytics(self.event.id, self.theater_owner.id)
        
        # Should work for correct owner
        analytics = AnalyticsService.get_event_analytics(self.event.id, self.event_owner.id)
        self.assertIn('event', analytics)
    
    def test_get_theater_analytics(self):
        """Test theater analytics generation"""
        analytics = AnalyticsService.get_theater_analytics(self.theater.id)
        
        # Check structure
        self.assertIn('theater', analytics)
        self.assertIn('showtimes', analytics)
        self.assertIn('bookings', analytics)
        self.assertIn('revenue', analytics)
        self.assertIn('screen_performance', analytics)
        
        # Check theater data
        theater_data = analytics['theater']
        self.assertEqual(theater_data['id'], self.theater.id)
        self.assertEqual(theater_data['name'], self.theater.name)
        self.assertEqual(theater_data['screens'], 2)
        
        # Check showtimes
        showtimes = analytics['showtimes']
        self.assertEqual(showtimes['total'], 1)
        
        # Check screen performance
        screen_performance = analytics['screen_performance']
        self.assertEqual(len(screen_performance), 2)  # 2 screens
    
    def test_get_theater_analytics_permission_check(self):
        """Test theater analytics permission checking"""
        # Should raise PermissionError for wrong owner
        with self.assertRaises(PermissionError):
            AnalyticsService.get_theater_analytics(self.theater.id, self.event_owner.id)
        
        # Should work for correct owner
        analytics = AnalyticsService.get_theater_analytics(self.theater.id, self.theater_owner.id)
        self.assertIn('theater', analytics)
    
    def test_get_trend_analysis(self):
        """Test trend analysis generation"""
        # Test event trend analysis
        trends = AnalyticsService.get_trend_analysis('event', self.event.id, 30)
        
        self.assertIn('period', trends)
        self.assertIn('trends', trends)
        
        period = trends['period']
        self.assertEqual(period['days'], 30)
        
        trend_data = trends['trends']
        self.assertIn('daily_data', trend_data)
        self.assertIn('growth_rate', trend_data)
        
        # Test theater trend analysis
        trends = AnalyticsService.get_trend_analysis('theater', self.theater.id, 30)
        self.assertIn('trends', trends)
    
    def test_get_trend_analysis_invalid_entity_type(self):
        """Test trend analysis with invalid entity type"""
        with self.assertRaises(ValueError):
            AnalyticsService.get_trend_analysis('invalid', 1, 30)
    
    def test_get_recommendation_insights(self):
        """Test recommendation insights generation"""
        insights = AnalyticsService.get_recommendation_insights()
        
        self.assertIn('popular_events', insights)
        self.assertIn('trending_movies', insights)
        self.assertIn('optimal_pricing', insights)
        self.assertIn('peak_times', insights)
        
        # Check popular events
        popular_events = insights['popular_events']
        self.assertIsInstance(popular_events, list)
        
        # Check trending movies
        trending_movies = insights['trending_movies']
        self.assertIsInstance(trending_movies, list)


class ReportGeneratorTest(TestCase):
    """Test cases for ReportGenerator"""
    
    def setUp(self):
        """Set up test data"""
        self.sample_system_data = {
            'period': {
                'date_from': '2024-01-01T00:00:00Z',
                'date_to': '2024-01-31T23:59:59Z',
            },
            'overview': {
                'total_bookings': 100,
                'total_tickets_sold': 250,
                'total_revenue': 5000.0,
                'total_discount_amount': 500.0,
                'total_fees': 150.0,
                'net_revenue': 4850.0,
                'avg_booking_value': 50.0,
                'avg_tickets_per_booking': 2.5,
            },
            'users': {
                'total_users': 1000,
                'new_users': 50,
                'active_customers': 75,
            },
            'breakdowns': {
                'booking_status': {'confirmed': 80, 'cancelled': 20},
                'payment_status': {'completed': 85, 'pending': 15},
                'booking_type': {'event': 60, 'movie': 40},
            }
        }
        
        self.sample_event_data = {
            'event': {
                'id': 1,
                'title': 'Test Event',
                'start_datetime': '2024-02-01T19:00:00Z',
                'status': 'published',
                'venue': 'Test Venue',
            },
            'ticket_types': [
                {
                    'name': 'General',
                    'price': 50.0,
                    'available': 100,
                    'sold': 80,
                    'remaining': 20,
                    'revenue': 4000.0,
                    'sell_through_rate': 80.0,
                },
                {
                    'name': 'VIP',
                    'price': 100.0,
                    'available': 50,
                    'sold': 30,
                    'remaining': 20,
                    'revenue': 3000.0,
                    'sell_through_rate': 60.0,
                }
            ],
            'daily_sales': [
                {'date': '2024-01-15', 'tickets_sold': 10, 'revenue': 500.0},
                {'date': '2024-01-16', 'tickets_sold': 15, 'revenue': 750.0},
            ]
        }
        
        self.sample_theater_data = {
            'theater': {
                'id': 1,
                'name': 'Test Theater',
                'screens': 2,
                'total_seats': 400,
                'city': 'Test City',
            },
            'screen_performance': [
                {
                    'screen_number': 1,
                    'showtimes': 10,
                    'bookings': 50,
                    'occupancy_rate': 75.0,
                    'revenue': 2000.0,
                },
                {
                    'screen_number': 2,
                    'showtimes': 8,
                    'bookings': 40,
                    'occupancy_rate': 65.0,
                    'revenue': 1500.0,
                }
            ],
            'popular_movies': [
                {
                    'booking__showtime__movie__title': 'Popular Movie 1',
                    'tickets_sold': 100,
                    'revenue': 1500.0,
                    'showtimes': 5,
                },
                {
                    'booking__showtime__movie__title': 'Popular Movie 2',
                    'tickets_sold': 80,
                    'revenue': 1200.0,
                    'showtimes': 4,
                }
            ]
        }
    
    def test_generate_csv_system_report(self):
        """Test CSV generation for system report"""
        csv_output = ReportGenerator.generate_csv_report(self.sample_system_data, 'system')
        
        csv_content = csv_output.getvalue()
        
        # Check that report contains expected content
        self.assertIn('System Analytics Report', csv_content)
        self.assertIn('Overview', csv_content)
        self.assertIn('User Metrics', csv_content)
        self.assertIn('Total Bookings,100', csv_content)
        self.assertIn('Total Revenue,5000.0', csv_content)
    
    def test_generate_csv_event_report(self):
        """Test CSV generation for event report"""
        csv_output = ReportGenerator.generate_csv_report(self.sample_event_data, 'event')
        
        csv_content = csv_output.getvalue()
        
        # Check that report contains expected content
        self.assertIn('Event Analytics Report', csv_content)
        self.assertIn('Event:,Test Event', csv_content)
        self.assertIn('Ticket Types Performance', csv_content)
        self.assertIn('General,50.0,100,80', csv_content)
        self.assertIn('Daily Sales', csv_content)
    
    def test_generate_csv_theater_report(self):
        """Test CSV generation for theater report"""
        csv_output = ReportGenerator.generate_csv_report(self.sample_theater_data, 'theater')
        
        csv_content = csv_output.getvalue()
        
        # Check that report contains expected content
        self.assertIn('Theater Analytics Report', csv_content)
        self.assertIn('Theater:,Test Theater', csv_content)
        self.assertIn('Screen Performance', csv_content)
        self.assertIn('Screen 1,10,50', csv_content)
        self.assertIn('Popular Movies', csv_content)
    
    @patch('bookings.report_generator.REPORTLAB_AVAILABLE', True)
    def test_generate_pdf_report_when_available(self):
        """Test PDF generation when ReportLab is available"""
        with patch('bookings.report_generator.SimpleDocTemplate') as mock_doc:
            mock_doc_instance = MagicMock()
            mock_doc.return_value = mock_doc_instance
            
            pdf_output = ReportGenerator.generate_pdf_report(self.sample_system_data, 'system')
            
            # Check that SimpleDocTemplate was called
            mock_doc.assert_called_once()
            mock_doc_instance.build.assert_called_once()
    
    @patch('bookings.report_generator.REPORTLAB_AVAILABLE', False)
    def test_generate_pdf_report_when_not_available(self):
        """Test PDF generation when ReportLab is not available"""
        with self.assertRaises(ImportError):
            ReportGenerator.generate_pdf_report(self.sample_system_data, 'system')


class AnalyticsAPITest(APITestCase):
    """Test cases for Analytics API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123'
        )
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user,
            role='admin'
        )
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='eventowner@test.com',
            password='testpass123'
        )
        self.event_owner_profile = UserProfile.objects.create(
            user=self.event_owner,
            role='event_owner'
        )
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        self.customer_profile = UserProfile.objects.create(
            user=self.customer,
            role='customer'
        )
        
        # Create event
        self.event = Event.objects.create(
            owner=self.event_owner,
            title='Test Event',
            description='Test event description',
            venue='Test Venue',
            address='123 Test St',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            status='published'
        )
    
    def test_system_analytics_admin_access(self):
        """Test system analytics endpoint with admin access"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/bookings/analytics/system/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('overview', response.data)
        self.assertIn('users', response.data)
    
    def test_system_analytics_non_admin_access(self):
        """Test system analytics endpoint with non-admin access"""
        self.client.force_authenticate(user=self.customer)
        
        response = self.client.get('/api/bookings/analytics/system/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_event_analytics_owner_access(self):
        """Test event analytics endpoint with owner access"""
        self.client.force_authenticate(user=self.event_owner)
        
        response = self.client.get(f'/api/bookings/analytics/events/{self.event.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('event', response.data)
        self.assertEqual(response.data['event']['id'], self.event.id)
    
    def test_event_analytics_admin_access(self):
        """Test event analytics endpoint with admin access"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(f'/api/bookings/analytics/events/{self.event.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('event', response.data)
    
    def test_event_analytics_unauthorized_access(self):
        """Test event analytics endpoint with unauthorized access"""
        self.client.force_authenticate(user=self.customer)
        
        response = self.client.get(f'/api/bookings/analytics/events/{self.event.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_trend_analysis_endpoint(self):
        """Test trend analysis endpoint"""
        self.client.force_authenticate(user=self.event_owner)
        
        response = self.client.get(f'/api/bookings/analytics/trends/event/{self.event.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('trends', response.data)
        self.assertIn('period', response.data)
    
    def test_trend_analysis_invalid_entity_type(self):
        """Test trend analysis with invalid entity type"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/bookings/analytics/trends/invalid/1/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_recommendation_insights_endpoint(self):
        """Test recommendation insights endpoint"""
        self.client.force_authenticate(user=self.customer)
        
        response = self.client.get('/api/bookings/analytics/insights/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('popular_events', response.data)
        self.assertIn('trending_movies', response.data)
    
    def test_export_report_csv(self):
        """Test CSV report export"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/bookings/analytics/reports/system/?format=csv')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
    
    def test_export_report_unauthorized(self):
        """Test report export with unauthorized access"""
        self.client.force_authenticate(user=self.customer)
        
        response = self.client.get('/api/bookings/analytics/reports/system/?format=csv')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_system_analytics_date_filtering(self):
        """Test system analytics with date filtering"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(
            '/api/bookings/analytics/system/?date_from=2024-01-01&date_to=2024-01-31'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('period', response.data)
    
    def test_system_analytics_invalid_date_format(self):
        """Test system analytics with invalid date format"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(
            '/api/bookings/analytics/system/?date_from=invalid-date'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid date format', response.data['error'])