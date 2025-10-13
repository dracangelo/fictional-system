from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, date
from .models import Theater, Movie, Showtime


class TheaterModelTest(TestCase):
    """Test cases for Theater model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='theaterowner',
            email='owner@example.com',
            password='testpass123'
        )
        
        self.theater_data = {
            'owner': self.user,
            'name': 'Test Cinema',
            'address': '123 Movie St',
            'city': 'Test City',
            'state': 'Test State',
            'zip_code': '12345',
            'phone_number': '555-0123',
            'screens': 3,
        }
        
        self.seating_layout = {
            'screens': [
                {
                    'screen_number': 1,
                    'rows': 10,
                    'seats_per_row': 15,
                    'vip_rows': [1, 2],
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
                },
                {
                    'screen_number': 3,
                    'rows': 12,
                    'seats_per_row': 20,
                    'pricing': {
                        'regular': 15.00,
                        'vip': 22.00
                    }
                }
            ]
        }
    
    def test_theater_creation(self):
        """Test basic theater creation"""
        theater = Theater.objects.create(**self.theater_data)
        
        self.assertEqual(theater.name, 'Test Cinema')
        self.assertEqual(theater.owner, self.user)
        self.assertEqual(theater.screens, 3)
        self.assertTrue(theater.is_active)  # Default
        self.assertEqual(theater.seating_layout, {})  # Default empty dict
        self.assertEqual(theater.amenities, [])  # Default empty list
    
    def test_theater_str_representation(self):
        """Test string representation of theater"""
        theater = Theater.objects.create(**self.theater_data)
        expected_str = f"Test Cinema - Test City"
        self.assertEqual(str(theater), expected_str)
    
    def test_theater_with_seating_layout(self):
        """Test theater creation with seating layout"""
        theater_data = self.theater_data.copy()
        theater_data['seating_layout'] = self.seating_layout
        
        theater = Theater.objects.create(**theater_data)
        self.assertEqual(len(theater.seating_layout['screens']), 3)
        self.assertEqual(theater.seating_layout['screens'][0]['rows'], 10)
    
    def test_theater_seating_layout_validation(self):
        """Test seating layout validation"""
        # Test invalid seating layout - wrong number of screens
        invalid_layout = {
            'screens': [
                {
                    'screen_number': 1,
                    'rows': 10,
                    'seats_per_row': 15
                }
            ]  # Only 1 screen but theater has 3
        }
        
        theater_data = self.theater_data.copy()
        theater_data['seating_layout'] = invalid_layout
        
        with self.assertRaises(ValidationError):
            Theater.objects.create(**theater_data)
    
    def test_theater_seating_layout_missing_fields(self):
        """Test seating layout validation with missing required fields"""
        invalid_layout = {
            'screens': [
                {
                    'screen_number': 1,
                    'rows': 10,
                    # Missing seats_per_row
                }
            ]
        }
        
        theater_data = self.theater_data.copy()
        theater_data['screens'] = 1  # Adjust screen count
        theater_data['seating_layout'] = invalid_layout
        
        with self.assertRaises(ValidationError):
            Theater.objects.create(**theater_data)
    
    def test_get_total_seats(self):
        """Test get_total_seats method"""
        theater_data = self.theater_data.copy()
        theater_data['seating_layout'] = self.seating_layout
        
        theater = Theater.objects.create(**theater_data)
        
        # Test total seats for all screens
        expected_total = (10 * 15) + (8 * 12) + (12 * 20)  # 150 + 96 + 240 = 486
        self.assertEqual(theater.get_total_seats(), expected_total)
        
        # Test total seats for specific screen
        self.assertEqual(theater.get_total_seats(screen_number=1), 150)
        self.assertEqual(theater.get_total_seats(screen_number=2), 96)
        self.assertEqual(theater.get_total_seats(screen_number=3), 240)
    
    def test_get_screen_configuration(self):
        """Test get_screen_configuration method"""
        theater_data = self.theater_data.copy()
        theater_data['seating_layout'] = self.seating_layout
        
        theater = Theater.objects.create(**theater_data)
        
        # Test getting configuration for existing screen
        config = theater.get_screen_configuration(1)
        self.assertIsNotNone(config)
        self.assertEqual(config['rows'], 10)
        self.assertEqual(config['seats_per_row'], 15)
        
        # Test getting configuration for non-existent screen
        config = theater.get_screen_configuration(99)
        self.assertIsNone(config)
    
    def test_theater_amenities(self):
        """Test theater amenities field"""
        theater_data = self.theater_data.copy()
        theater_data['amenities'] = ['IMAX', '3D', 'Dolby Atmos', 'Reclining Seats']
        
        theater = Theater.objects.create(**theater_data)
        self.assertEqual(len(theater.amenities), 4)
        self.assertIn('IMAX', theater.amenities)


class MovieModelTest(TestCase):
    """Test cases for Movie model"""
    
    def setUp(self):
        """Set up test data"""
        self.movie_data = {
            'title': 'Test Movie',
            'description': 'A great test movie',
            'genre': 'action',
            'duration': 120,
            'rating': 'PG-13',
            'director': 'Test Director',
            'producer': 'Test Producer',
            'release_date': date.today(),
            'language': 'English',
        }
    
    def test_movie_creation(self):
        """Test basic movie creation"""
        movie = Movie.objects.create(**self.movie_data)
        
        self.assertEqual(movie.title, 'Test Movie')
        self.assertEqual(movie.genre, 'action')
        self.assertEqual(movie.duration, 120)
        self.assertEqual(movie.rating, 'PG-13')
        self.assertTrue(movie.is_active)  # Default
        self.assertEqual(movie.cast, [])  # Default empty list
    
    def test_movie_str_representation(self):
        """Test string representation of movie"""
        movie = Movie.objects.create(**self.movie_data)
        expected_str = f"Test Movie ({date.today().year})"
        self.assertEqual(str(movie), expected_str)
    
    def test_movie_with_cast(self):
        """Test movie creation with cast information"""
        movie_data = self.movie_data.copy()
        movie_data['cast'] = ['Actor 1', 'Actor 2', 'Actor 3']
        
        movie = Movie.objects.create(**movie_data)
        self.assertEqual(len(movie.cast), 3)
        self.assertIn('Actor 1', movie.cast)
    
    def test_movie_duration_formatted_property(self):
        """Test duration_formatted property"""
        # Test movie with hours and minutes
        movie = Movie.objects.create(**self.movie_data)
        self.assertEqual(movie.duration_formatted, '2h')  # 120 minutes = 2h 0m, but 0m is omitted
        
        # Test movie with only minutes
        movie.duration = 45
        movie.save()
        self.assertEqual(movie.duration_formatted, '45m')
        
        # Test movie with hours and minutes
        movie.duration = 150  # 2h 30m
        movie.save()
        self.assertEqual(movie.duration_formatted, '2h 30m')
    
    def test_movie_media_fields(self):
        """Test movie media fields"""
        movie_data = self.movie_data.copy()
        movie_data['poster_url'] = 'http://example.com/poster.jpg'
        movie_data['trailer_url'] = 'http://example.com/trailer.mp4'
        
        movie = Movie.objects.create(**movie_data)
        self.assertEqual(movie.poster_url, 'http://example.com/poster.jpg')
        self.assertEqual(movie.trailer_url, 'http://example.com/trailer.mp4')


class ShowtimeModelTest(TestCase):
    """Test cases for Showtime model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='theaterowner',
            email='owner@example.com',
            password='testpass123'
        )
        
        # Create theater with seating layout
        self.theater = Theater.objects.create(
            owner=self.user,
            name='Test Cinema',
            address='123 Movie St',
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
                        'pricing': {'regular': 12.00, 'vip': 18.00}
                    },
                    {
                        'screen_number': 2,
                        'rows': 8,
                        'seats_per_row': 12,
                        'pricing': {'regular': 10.00}
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
        
        self.future_start = timezone.now() + timedelta(days=1)
        self.future_end = self.future_start + timedelta(hours=2, minutes=30)
        
        self.showtime_data = {
            'theater': self.theater,
            'movie': self.movie,
            'screen_number': 1,
            'start_time': self.future_start,
            'end_time': self.future_end,
            'base_price': Decimal('12.00'),
            'total_seats': 150,  # 10 rows * 15 seats
        }
    
    def test_showtime_creation(self):
        """Test basic showtime creation"""
        showtime = Showtime.objects.create(**self.showtime_data)
        
        self.assertEqual(showtime.theater, self.theater)
        self.assertEqual(showtime.movie, self.movie)
        self.assertEqual(showtime.screen_number, 1)
        self.assertEqual(showtime.base_price, Decimal('12.00'))
        self.assertEqual(showtime.total_seats, 150)
        self.assertEqual(showtime.available_seats, 150)  # Default to total_seats
        self.assertTrue(showtime.is_active)  # Default
        self.assertEqual(showtime.booked_seats, [])  # Default empty list
    
    def test_showtime_str_representation(self):
        """Test string representation of showtime"""
        showtime = Showtime.objects.create(**self.showtime_data)
        expected_str = f"Test Movie at Test Cinema - {self.future_start.strftime('%Y-%m-%d %H:%M')}"
        self.assertEqual(str(showtime), expected_str)
    
    def test_showtime_validation_end_before_start(self):
        """Test validation when end time is before start time"""
        invalid_data = self.showtime_data.copy()
        invalid_data['end_time'] = self.future_start - timedelta(hours=1)
        
        with self.assertRaises(ValidationError):
            Showtime.objects.create(**invalid_data)
    
    def test_showtime_validation_past_datetime(self):
        """Test validation when showtime is in the past"""
        invalid_data = self.showtime_data.copy()
        invalid_data['start_time'] = timezone.now() - timedelta(hours=1)
        invalid_data['end_time'] = timezone.now() + timedelta(hours=1)
        
        with self.assertRaises(ValidationError):
            Showtime.objects.create(**invalid_data)
    
    def test_showtime_validation_invalid_screen(self):
        """Test validation when screen number doesn't exist in theater"""
        invalid_data = self.showtime_data.copy()
        invalid_data['screen_number'] = 99  # Doesn't exist
        
        with self.assertRaises(ValidationError):
            Showtime.objects.create(**invalid_data)
    
    def test_showtime_auto_end_time(self):
        """Test automatic end time calculation based on movie duration"""
        showtime_data = self.showtime_data.copy()
        del showtime_data['end_time']  # Remove end_time to test auto-calculation
        
        showtime = Showtime.objects.create(**showtime_data)
        
        # Should be start_time + movie duration + 30 minute buffer
        expected_end = self.future_start + timedelta(minutes=120 + 30)
        self.assertEqual(showtime.end_time, expected_end)
    
    def test_showtime_properties(self):
        """Test showtime property methods"""
        showtime = Showtime.objects.create(**self.showtime_data)
        
        # Test initial state
        self.assertEqual(showtime.seats_booked, 0)
        self.assertFalse(showtime.is_sold_out)
        self.assertTrue(showtime.is_upcoming)
        self.assertEqual(showtime.occupancy_percentage, 0.0)
        
        # Test after some bookings
        showtime.available_seats = 100  # 50 seats booked
        showtime.save()
        self.assertEqual(showtime.seats_booked, 50)
        self.assertFalse(showtime.is_sold_out)
        self.assertEqual(showtime.occupancy_percentage, 33.33)
        
        # Test sold out
        showtime.available_seats = 0
        showtime.save()
        self.assertEqual(showtime.seats_booked, 150)
        self.assertTrue(showtime.is_sold_out)
        self.assertEqual(showtime.occupancy_percentage, 100.0)
    
    def test_showtime_scheduling_conflict(self):
        """Test scheduling conflict detection"""
        # Create first showtime
        showtime1 = Showtime.objects.create(**self.showtime_data)
        
        # Try to create overlapping showtime
        conflicting_data = self.showtime_data.copy()
        conflicting_data['start_time'] = self.future_start + timedelta(hours=1)
        conflicting_data['end_time'] = self.future_end + timedelta(hours=1)
        
        with self.assertRaises(ValidationError):
            Showtime.objects.create(**conflicting_data)
    
    def test_showtime_seat_pricing(self):
        """Test seat pricing functionality"""
        showtime_data = self.showtime_data.copy()
        showtime_data['seat_pricing'] = {
            'vip': {
                'rows': ['A', 'B'],
                'price': 18.00
            },
            'regular': {
                'rows': ['C', 'D', 'E'],
                'price': 12.00
            }
        }
        
        showtime = Showtime.objects.create(**showtime_data)
        
        # Test VIP seat pricing
        self.assertEqual(showtime.get_seat_price('A1'), Decimal('18.00'))
        self.assertEqual(showtime.get_seat_price('B5'), Decimal('18.00'))
        
        # Test regular seat pricing
        self.assertEqual(showtime.get_seat_price('C1'), Decimal('12.00'))
        
        # Test seat not in pricing config (should return base price)
        self.assertEqual(showtime.get_seat_price('Z1'), Decimal('12.00'))
    
    def test_showtime_unique_constraint(self):
        """Test unique constraint on theater, screen_number, and start_time"""
        Showtime.objects.create(**self.showtime_data)
        
        # Try to create another showtime with same theater, screen, and start time
        with self.assertRaises(Exception):  # IntegrityError
            Showtime.objects.create(**self.showtime_data)


from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from users.models import UserProfile


class TheaterAPITest(APITestCase):
    """Test cases for Theater API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create theater owner
        self.theater_owner = User.objects.create_user(
            username='theater_owner',
            email='owner@example.com',
            password='testpass123'
        )
        self.owner_profile, _ = UserProfile.objects.get_or_create(
            user=self.theater_owner,
            defaults={'role': 'theater_owner'}
        )
        
        # Create customer
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123'
        )
        self.customer_profile, _ = UserProfile.objects.get_or_create(
            user=self.customer,
            defaults={'role': 'customer'}
        )
        
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Theater',
            address='123 Main St',
            city='Test City',
            state='Test State',
            screens=2,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 10,
                        'seats_per_row': 15
                    },
                    {
                        'screen_number': 2,
                        'rows': 8,
                        'seats_per_row': 12
                    }
                ]
            }
        )
    
    def test_theater_list_public(self):
        """Test public theater list access"""
        url = '/api/theaters/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_theater_create_authentication_required(self):
        """Test theater creation requires authentication"""
        url = '/api/theaters/'
        data = {
            'name': 'New Theater',
            'address': '456 Oak St',
            'city': 'New City',
            'state': 'New State',
            'screens': 1
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_theater_create_by_owner(self):
        """Test theater creation by theater owner"""
        self.client.force_authenticate(user=self.theater_owner)
        
        url = '/api/theaters/'
        data = {
            'name': 'New Theater',
            'address': '456 Oak St',
            'city': 'New City',
            'state': 'New State',
            'screens': 1,
            'seating_layout': {
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 8,
                        'seats_per_row': 12
                    }
                ]
            }
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Theater')
    
    def test_theater_update_by_owner(self):
        """Test theater update by owner"""
        self.client.force_authenticate(user=self.theater_owner)
        
        url = f'/api/theaters/{self.theater.id}/'
        data = {
            'name': 'Updated Theater Name'
        }
        
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Theater Name')
    
    def test_theater_analytics_by_owner(self):
        """Test theater analytics access by owner"""
        self.client.force_authenticate(user=self.theater_owner)
        
        url = f'/api/theaters/{self.theater.id}/analytics/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('theater_id', response.data)
        self.assertIn('total_screens', response.data)
        self.assertIn('total_seats', response.data)
    
    def test_seating_layout_management(self):
        """Test seating layout management"""
        self.client.force_authenticate(user=self.theater_owner)
        
        # Get current layout
        url = f'/api/theaters/{self.theater.id}/seating_layout/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update layout
        new_layout = {
            'screens': [
                {
                    'screen_number': 1,
                    'rows': 12,
                    'seats_per_row': 18,
                    'vip_rows': [1, 2, 3],
                    'pricing': {
                        'regular': 10.00,
                        'vip': 15.00
                    }
                },
                {
                    'screen_number': 2,
                    'rows': 10,
                    'seats_per_row': 16,
                    'pricing': {
                        'regular': 8.00
                    }
                }
            ]
        }
        
        response = self.client.put(url, {'seating_layout': new_layout}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_seats'], 376)  # (12*18) + (10*16)


class MovieAPITest(APITestCase):
    """Test cases for Movie API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
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
    
    def test_movie_list_public(self):
        """Test public movie list access"""
        url = '/api/movies/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_movie_create_authentication_required(self):
        """Test movie creation requires authentication"""
        url = '/api/movies/'
        data = {
            'title': 'New Movie',
            'description': 'A new movie',
            'genre': 'comedy',
            'duration': 90,
            'rating': 'PG',
            'director': 'New Director',
            'release_date': timezone.now().date()
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_movie_create_authenticated(self):
        """Test movie creation by authenticated user"""
        self.client.force_authenticate(user=self.user)
        
        url = '/api/movies/'
        data = {
            'title': 'New Movie',
            'description': 'A new movie',
            'genre': 'comedy',
            'duration': 90,
            'rating': 'PG',
            'director': 'New Director',
            'release_date': timezone.now().date(),
            'cast': ['Actor 1', 'Actor 2']
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Movie')
    
    def test_movie_filtering(self):
        """Test movie filtering"""
        # Create additional movies
        Movie.objects.create(
            title='Comedy Movie',
            description='A comedy',
            genre='comedy',
            duration=90,
            rating='PG',
            director='Comedy Director',
            release_date=timezone.now().date()
        )
        
        # Filter by genre
        url = '/api/movies/?genre=action'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['genre'], 'action')


class ShowtimeAPITest(APITestCase):
    """Test cases for Showtime API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create theater owner
        self.theater_owner = User.objects.create_user(
            username='theater_owner',
            email='owner@example.com',
            password='testpass123'
        )
        self.owner_profile, _ = UserProfile.objects.get_or_create(
            user=self.theater_owner,
            defaults={'role': 'theater_owner'}
        )
        
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Theater',
            address='123 Main St',
            city='Test City',
            state='Test State',
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
            release_date=timezone.now().date()
        )
    
    def test_showtime_create_by_theater_owner(self):
        """Test showtime creation by theater owner"""
        self.client.force_authenticate(user=self.theater_owner)
        
        start_time = timezone.now() + timedelta(days=1)
        
        url = '/api/showtimes/'
        data = {
            'movie': self.movie.id,
            'theater': self.theater.id,
            'screen_number': 1,
            'start_time': start_time.isoformat(),
            'base_price': '10.00'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total_seats'], 150)
    
    def test_showtime_conflict_prevention(self):
        """Test showtime conflict prevention via API"""
        self.client.force_authenticate(user=self.theater_owner)
        
        start_time = timezone.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        # Create first showtime
        Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=start_time,
            end_time=end_time,
            base_price=Decimal('10.00')
        )
        
        # Try to create conflicting showtime via API
        conflicting_start = start_time + timedelta(minutes=30)
        
        url = '/api/showtimes/'
        data = {
            'movie': self.movie.id,
            'theater': self.theater.id,
            'screen_number': 1,
            'start_time': conflicting_start.isoformat(),
            'base_price': '10.00'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_showtime_availability(self):
        """Test showtime seat availability endpoint"""
        start_time = timezone.now() + timedelta(days=1)
        
        showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=start_time,
            base_price=Decimal('10.00')
        )
        
        url = f'/api/showtimes/{showtime.id}/availability/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('seat_map', response.data)
        self.assertEqual(response.data['total_seats'], 150)
        self.assertEqual(response.data['available_seats'], 150)
    
    def test_dynamic_pricing_management(self):
        """Test dynamic pricing management"""
        self.client.force_authenticate(user=self.theater_owner)
        
        start_time = timezone.now() + timedelta(days=1)
        
        showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=start_time,
            base_price=Decimal('10.00')
        )
        
        # Get current pricing
        url = f'/api/showtimes/{showtime.id}/pricing/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update pricing
        pricing_config = {
            'vip': {
                'price': 15.00,
                'rows': ['A', 'B']
            },
            'premium': {
                'price': 12.00,
                'rows': ['C', 'D']
            }
        }
        
        response = self.client.post(url, {'seat_pricing': pricing_config}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify pricing was updated
        showtime.refresh_from_db()
        self.assertIn('vip', showtime.seat_pricing)
        self.assertEqual(showtime.seat_pricing['vip']['price'], 15.00)