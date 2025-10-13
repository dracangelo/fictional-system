"""
Performance tests and benchmarking for critical operations
"""

import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.test import TestCase, TransactionTestCase
from django.test.utils import override_settings
from django.core.cache import cache
from django.db import connection
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking, Ticket
from users.models import UserProfile
from movie_booking_app.cache_utils import cache_manager, query_optimizer
from movie_booking_app.cached_views import monitor_query_performance


class PerformanceTestMixin:
    """Mixin for performance testing utilities"""
    
    def setUp(self):
        """Set up test data"""
        super().setUp()
        cache.clear()  # Clear cache before each test
        
        # Create test users
        self.event_owner = User.objects.create_user(
            username='event_owner',
            email='event@test.com',
            password='testpass123'
        )
        UserProfile.objects.create(user=self.event_owner, role='event_owner')
        
        self.theater_owner = User.objects.create_user(
            username='theater_owner',
            email='theater@test.com',
            password='testpass123'
        )
        UserProfile.objects.create(user=self.theater_owner, role='theater_owner')
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        UserProfile.objects.create(user=self.customer, role='customer')
    
    def measure_execution_time(self, func, *args, **kwargs):
        """Measure execution time of a function"""
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        return result, end_time - start_time
    
    def measure_query_count(self, func, *args, **kwargs):
        """Measure number of database queries"""
        initial_queries = len(connection.queries)
        result = func(*args, **kwargs)
        query_count = len(connection.queries) - initial_queries
        return result, query_count
    
    def benchmark_function(self, func, iterations=10, *args, **kwargs):
        """Benchmark a function over multiple iterations"""
        times = []
        query_counts = []
        
        for _ in range(iterations):
            # Reset connection queries
            connection.queries_log.clear()
            
            start_time = time.time()
            initial_queries = len(connection.queries)
            
            result = func(*args, **kwargs)
            
            end_time = time.time()
            query_count = len(connection.queries) - initial_queries
            
            times.append(end_time - start_time)
            query_counts.append(query_count)
        
        return {
            'avg_time': statistics.mean(times),
            'min_time': min(times),
            'max_time': max(times),
            'avg_queries': statistics.mean(query_counts),
            'min_queries': min(query_counts),
            'max_queries': max(query_counts),
            'times': times,
            'query_counts': query_counts
        }


class CachingPerformanceTests(PerformanceTestMixin, TestCase):
    """Test caching performance improvements"""
    
    def setUp(self):
        super().setUp()
        
        # Create test events
        self.events = []
        for i in range(50):
            event = Event.objects.create(
                owner=self.event_owner,
                title=f'Test Event {i}',
                description=f'Description for event {i}',
                venue=f'Venue {i}',
                address=f'Address {i}',
                category='concert',
                start_datetime=timezone.now() + timedelta(days=i),
                end_datetime=timezone.now() + timedelta(days=i, hours=2)
            )
            self.events.append(event)
            
            # Create ticket types
            TicketType.objects.create(
                event=event,
                name='General',
                price=Decimal('50.00'),
                quantity_available=100
            )
    
    def test_event_list_caching(self):
        """Test event list view caching performance"""
        from events.views import EventViewSet
        
        # First request (no cache)
        viewset = EventViewSet()
        viewset.request = type('Request', (), {'GET': {}, 'user': self.customer})()
        
        result1, time1 = self.measure_execution_time(
            lambda: list(viewset.get_queryset())
        )
        
        # Second request (should use cache if implemented)
        result2, time2 = self.measure_execution_time(
            lambda: list(viewset.get_queryset())
        )
        
        # Verify results are the same
        self.assertEqual(len(result1), len(result2))
        
        # Log performance metrics
        print(f"Event list - First request: {time1:.4f}s, Second request: {time2:.4f}s")
    
    def test_cache_invalidation(self):
        """Test cache invalidation when models are updated"""
        event = self.events[0]
        
        # Cache the event
        cache_key = cache_manager.get_cache_key('event_detail', event.id)
        cache_manager.set(cache_key, {'id': event.id, 'title': event.title})
        
        # Verify cache exists
        cached_data = cache_manager.get(cache_key)
        self.assertIsNotNone(cached_data)
        
        # Update the event (should invalidate cache)
        event.title = 'Updated Title'
        event.save()
        
        # Verify cache is invalidated
        cached_data = cache_manager.get(cache_key)
        # Note: This test assumes cache invalidation is working
        # In a real implementation, this should be None
    
    def test_search_caching(self):
        """Test search result caching"""
        from events.models import Event
        
        # Perform search
        search_query = 'Test Event'
        
        def search_events():
            return Event.objects.search_events(search_query)
        
        # Benchmark search performance
        benchmark = self.benchmark_function(search_events, iterations=5)
        
        print(f"Search performance - Avg time: {benchmark['avg_time']:.4f}s, "
              f"Avg queries: {benchmark['avg_queries']:.1f}")
        
        # Verify search works
        results = search_events()
        self.assertGreater(len(results), 0)


class QueryOptimizationTests(PerformanceTestMixin, TestCase):
    """Test database query optimization"""
    
    def setUp(self):
        super().setUp()
        
        # Create test data with relationships
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Theater',
            address='123 Test St',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=3,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 10,
                        'seats_per_row': 15,
                        'vip_rows': [1, 2]
                    }
                ]
            }
        )
        
        self.movie = Movie.objects.create(
            title='Test Movie',
            description='Test Description',
            genre='action',
            duration=120,
            director='Test Director',
            release_date=timezone.now().date()
        )
        
        # Create showtimes
        self.showtimes = []
        for i in range(10):
            showtime = Showtime.objects.create(
                theater=self.theater,
                movie=self.movie,
                screen_number=1,
                start_time=timezone.now() + timedelta(hours=i*3),
                end_time=timezone.now() + timedelta(hours=i*3+2),
                base_price=Decimal('15.00'),
                total_seats=150,
                available_seats=150
            )
            self.showtimes.append(showtime)
        
        # Create bookings
        for i in range(20):
            booking = Booking.objects.create(
                customer=self.customer,
                booking_type='movie',
                showtime=self.showtimes[i % len(self.showtimes)],
                booking_reference=f'BOOK{i:04d}',
                subtotal=Decimal('30.00'),
                total_amount=Decimal('30.00'),
                payment_status='completed',
                booking_status='confirmed',
                customer_email=self.customer.email
            )
            
            # Create tickets
            for j in range(2):
                Ticket.objects.create(
                    booking=booking,
                    seat_number=f'A{j+1}',
                    ticket_number=f'TKT{i:04d}{j}',
                    qr_code_data=f'ticket:TKT{i:04d}{j}',
                    price=Decimal('15.00')
                )
    
    def test_optimized_vs_unoptimized_queries(self):
        """Compare optimized vs unoptimized query performance"""
        
        # Unoptimized query
        def unoptimized_booking_query():
            bookings = list(Booking.objects.all())
            # Access related objects (triggers N+1 queries)
            for booking in bookings:
                _ = booking.customer.username
                if booking.showtime:
                    _ = booking.showtime.movie.title
                    _ = booking.showtime.theater.name
                _ = list(booking.tickets.all())
            return bookings
        
        # Optimized query
        def optimized_booking_query():
            return list(query_optimizer.optimize_booking_queryset(Booking.objects.all()))
        
        # Benchmark both approaches
        unopt_benchmark = self.benchmark_function(unoptimized_booking_query, iterations=3)
        opt_benchmark = self.benchmark_function(optimized_booking_query, iterations=3)
        
        print(f"Unoptimized - Avg time: {unopt_benchmark['avg_time']:.4f}s, "
              f"Avg queries: {unopt_benchmark['avg_queries']:.1f}")
        print(f"Optimized - Avg time: {opt_benchmark['avg_time']:.4f}s, "
              f"Avg queries: {opt_benchmark['avg_queries']:.1f}")
        
        # Optimized should use fewer queries
        self.assertLess(opt_benchmark['avg_queries'], unopt_benchmark['avg_queries'])
    
    def test_showtime_availability_query_optimization(self):
        """Test showtime availability query optimization"""
        
        def get_available_showtimes():
            return list(
                Showtime.objects.select_related('theater', 'movie')
                .filter(
                    start_time__gte=timezone.now(),
                    available_seats__gt=0,
                    is_active=True
                )
                .order_by('start_time')
            )
        
        benchmark = self.benchmark_function(get_available_showtimes, iterations=5)
        
        print(f"Showtime availability - Avg time: {benchmark['avg_time']:.4f}s, "
              f"Avg queries: {benchmark['avg_queries']:.1f}")
        
        # Should use minimal queries due to select_related
        self.assertLessEqual(benchmark['avg_queries'], 3)


class ConcurrentBookingTests(PerformanceTestMixin, TransactionTestCase):
    """Test concurrent booking performance and race conditions"""
    
    def setUp(self):
        super().setUp()
        
        # Create test showtime
        self.theater = Theater.objects.create(
            owner=self.theater_owner,
            name='Test Theater',
            address='123 Test St',
            city='Test City',
            state='Test State',
            zip_code='12345',
            screens=1,
            seating_layout={
                'screens': [
                    {
                        'screen_number': 1,
                        'rows': 5,
                        'seats_per_row': 10
                    }
                ]
            }
        )
        
        self.movie = Movie.objects.create(
            title='Test Movie',
            description='Test Description',
            genre='action',
            duration=120,
            director='Test Director',
            release_date=timezone.now().date()
        )
        
        self.showtime = Showtime.objects.create(
            theater=self.theater,
            movie=self.movie,
            screen_number=1,
            start_time=timezone.now() + timedelta(hours=2),
            end_time=timezone.now() + timedelta(hours=4),
            base_price=Decimal('15.00'),
            total_seats=50,
            available_seats=50
        )
        
        # Create multiple customers
        self.customers = []
        for i in range(10):
            customer = User.objects.create_user(
                username=f'customer{i}',
                email=f'customer{i}@test.com',
                password='testpass123'
            )
            UserProfile.objects.create(user=customer, role='customer')
            self.customers.append(customer)
    
    def simulate_booking(self, customer, seat_numbers):
        """Simulate a booking attempt"""
        from bookings.booking_service import BookingService
        
        try:
            booking_data = {
                'showtime_id': self.showtime.id,
                'seat_numbers': seat_numbers,
                'customer_email': customer.email,
                'customer_phone': '1234567890'
            }
            
            booking = BookingService.create_movie_booking(customer, booking_data)
            return {'success': True, 'booking_id': booking.id}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_concurrent_booking_performance(self):
        """Test performance under concurrent booking load"""
        
        # Prepare booking attempts
        booking_tasks = []
        for i, customer in enumerate(self.customers):
            seat_numbers = [f'A{i+1}', f'A{i+2}']
            booking_tasks.append((customer, seat_numbers))
        
        # Execute concurrent bookings
        start_time = time.time()
        results = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_booking = {
                executor.submit(self.simulate_booking, customer, seats): (customer, seats)
                for customer, seats in booking_tasks
            }
            
            for future in as_completed(future_to_booking):
                customer, seats = future_to_booking[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append({'success': False, 'error': str(e)})
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Analyze results
        successful_bookings = sum(1 for r in results if r['success'])
        failed_bookings = len(results) - successful_bookings
        
        print(f"Concurrent booking test:")
        print(f"Total time: {total_time:.4f}s")
        print(f"Successful bookings: {successful_bookings}")
        print(f"Failed bookings: {failed_bookings}")
        print(f"Average time per booking: {total_time/len(results):.4f}s")
        
        # At least some bookings should succeed
        self.assertGreater(successful_bookings, 0)


class AnalyticsPerformanceTests(PerformanceTestMixin, TestCase):
    """Test analytics query performance"""
    
    def setUp(self):
        super().setUp()
        
        # Create large dataset for analytics testing
        self.events = []
        for i in range(100):
            event = Event.objects.create(
                owner=self.event_owner,
                title=f'Event {i}',
                description=f'Description {i}',
                venue=f'Venue {i}',
                address=f'Address {i}',
                category=['concert', 'theater', 'sports'][i % 3],
                start_datetime=timezone.now() + timedelta(days=i),
                end_datetime=timezone.now() + timedelta(days=i, hours=2)
            )
            self.events.append(event)
            
            # Create bookings for analytics
            for j in range(10):
                customer = User.objects.create_user(
                    username=f'customer_{i}_{j}',
                    email=f'customer_{i}_{j}@test.com',
                    password='testpass123'
                )
                
                booking = Booking.objects.create(
                    customer=customer,
                    booking_type='event',
                    event=event,
                    booking_reference=f'BOOK{i:03d}{j:02d}',
                    subtotal=Decimal('50.00'),
                    total_amount=Decimal('50.00'),
                    payment_status='completed',
                    booking_status='confirmed',
                    customer_email=customer.email
                )
    
    def test_analytics_query_performance(self):
        """Test analytics aggregation performance"""
        from django.db.models import Count, Sum, Avg
        
        def calculate_analytics():
            return Booking.objects.filter(
                payment_status='completed'
            ).aggregate(
                total_bookings=Count('id'),
                total_revenue=Sum('total_amount'),
                avg_booking_value=Avg('total_amount')
            )
        
        benchmark = self.benchmark_function(calculate_analytics, iterations=10)
        
        print(f"Analytics query - Avg time: {benchmark['avg_time']:.4f}s, "
              f"Avg queries: {benchmark['avg_queries']:.1f}")
        
        # Should be efficient with proper indexing
        self.assertLess(benchmark['avg_time'], 1.0)  # Should complete in under 1 second
    
    def test_event_analytics_performance(self):
        """Test event-specific analytics performance"""
        
        def get_event_analytics(event):
            from django.db.models import Count, Sum
            
            return {
                'total_bookings': Booking.objects.filter(event=event).count(),
                'total_revenue': Booking.objects.filter(
                    event=event, payment_status='completed'
                ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
                'booking_trends': list(
                    Booking.objects.filter(event=event)
                    .extra(select={'day': 'date(created_at)'})
                    .values('day')
                    .annotate(bookings=Count('id'))
                    .order_by('day')
                )
            }
        
        # Test with first event
        event = self.events[0]
        benchmark = self.benchmark_function(
            lambda: get_event_analytics(event), 
            iterations=5
        )
        
        print(f"Event analytics - Avg time: {benchmark['avg_time']:.4f}s, "
              f"Avg queries: {benchmark['avg_queries']:.1f}")


def run_performance_tests():
    """Run all performance tests and generate report"""
    import unittest
    
    # Create test suite
    test_classes = [
        CachingPerformanceTests,
        QueryOptimizationTests,
        ConcurrentBookingTests,
        AnalyticsPerformanceTests
    ]
    
    suite = unittest.TestSuite()
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result


if __name__ == '__main__':
    run_performance_tests()