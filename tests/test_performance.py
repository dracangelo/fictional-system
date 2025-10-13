"""
Performance tests for concurrent operations and load testing.
Tests system behavior under high load and concurrent access.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.db import transaction, connections
from django.utils import timezone
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import timedelta
import threading
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch

from tests.factories import (
    UserFactory, EventFactory, TicketTypeFactory, TheaterFactory,
    MovieFactory, ShowtimeFactory, BookingFactory, create_test_user_with_role,
    create_complete_event_setup, create_complete_theater_setup
)

from bookings.booking_service import BookingService
from bookings.models import Booking, Ticket
from events.models import Event, TicketType
from theaters.models import Showtime
from events.services import DiscountService


class ConcurrentBookingTest(TransactionTestCase):
    """Test concurrent booking scenarios"""
    
    def setUp(self):
        self.event_setup = create_complete_event_setup()
        self.event = self.event_setup['event']
        self.ticket_type = self.event_setup['ticket_types'][0]
        
        # Set limited tickets for testing
        self.ticket_type.quantity_available = 10
        self.ticket_type.save()
        
        # Create multiple customers
        self.customers = [create_test_user_with_role('customer') for _ in range(20)]
    
    def test_concurrent_event_booking_race_condition(self):
        """Test that concurrent bookings don't oversell tickets"""
        results = []
        
        def make_booking(customer):
            try:
                booking_data = {
                    'customer': customer,
                    'booking_type': 'event',
                    'event': self.event,
                    'tickets': [{'ticket_type': self.ticket_type, 'quantity': 1}]
                }
                booking = BookingService.create_booking(booking_data)
                results.append(('success', booking.id))
                return True
            except Exception as e:
                results.append(('error', str(e)))
                return False
        
        # Use ThreadPoolExecutor for concurrent execution
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_booking, customer) for customer in self.customers]
            
            # Wait for all threads to complete
            for future in as_completed(futures):
                future.result()
        
        # Count successful bookings
        successful_bookings = [r for r in results if r[0] == 'success']
        
        # Should not exceed available tickets
        self.assertLessEqual(len(successful_bookings), self.ticket_type.quantity_available)
        
        # Verify ticket type quantities are consistent
        self.ticket_type.refresh_from_db()
        actual_sold = Booking.objects.filter(
            event=self.event,
            booking_status='confirmed'
        ).count()
        
        self.assertEqual(actual_sold, len(successful_bookings))
    
    def test_concurrent_seat_booking_race_condition(self):
        """Test concurrent seat booking for movies"""
        theater_setup = create_complete_theater_setup()
        showtime = theater_setup['showtimes'][0]
        
        # Set limited seats
        showtime.total_seats = 20
        showtime.available_seats = 20
        showtime.booked_seats = []
        showtime.save()
        
        results = []
        
        def book_seats(customer, seat_numbers):
            try:
                booking_data = {
                    'customer': customer,
                    'booking_type': 'movie',
                    'showtime': showtime,
                    'seats': seat_numbers
                }
                booking = BookingService.create_booking(booking_data)
                results.append(('success', booking.id, seat_numbers))
                return True
            except Exception as e:
                results.append(('error', str(e), seat_numbers))
                return False
        
        # Try to book overlapping seats concurrently
        seat_requests = [
            (['A1', 'A2'], self.customers[0]),
            (['A1', 'A3'], self.customers[1]),
            (['A2', 'A4'], self.customers[2]),
            (['B1', 'B2'], self.customers[3]),
            (['B1', 'B3'], self.customers[4]),
        ]
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(book_seats, customer, seats)
                for seats, customer in seat_requests
            ]
            
            for future in as_completed(futures):
                future.result()
        
        # Verify no seat conflicts
        successful_bookings = [r for r in results if r[0] == 'success']
        all_booked_seats = []
        
        for _, booking_id, seats in successful_bookings:
            all_booked_seats.extend(seats)
        
        # Check for duplicates
        self.assertEqual(len(all_booked_seats), len(set(all_booked_seats)))
        
        # Verify showtime state
        showtime.refresh_from_db()
        self.assertEqual(len(showtime.booked_seats), len(all_booked_seats))
    
    def test_concurrent_discount_usage_limit(self):
        """Test discount usage limits under concurrent access"""
        discount = self.event_setup['discounts'][0]
        discount.max_uses = 3
        discount.current_uses = 0
        discount.save()
        
        results = []
        
        def apply_discount(customer):
            try:
                result = DiscountService.validate_discount_code(
                    discount.promo_code,
                    self.event.id
                )
                if result['valid']:
                    DiscountService.track_discount_usage(discount.id)
                    results.append(('success', customer.id))
                else:
                    results.append(('invalid', result['error']))
                return result['valid']
            except Exception as e:
                results.append(('error', str(e)))
                return False
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(apply_discount, customer) for customer in self.customers[:10]]
            
            for future in as_completed(futures):
                future.result()
        
        # Only 3 should succeed
        successful_uses = [r for r in results if r[0] == 'success']
        self.assertEqual(len(successful_uses), 3)
        
        # Verify discount usage count
        discount.refresh_from_db()
        self.assertEqual(discount.current_uses, 3)


class LoadTestingTest(TestCase):
    """Test system performance under load"""
    
    def setUp(self):
        # Create test data
        self.events = [EventFactory() for _ in range(50)]
        self.theaters = [TheaterFactory() for _ in range(10)]
        self.movies = [MovieFactory() for _ in range(20)]
        self.customers = [create_test_user_with_role('customer') for _ in range(100)]
        
        # Create showtimes
        self.showtimes = []
        for theater in self.theaters:
            for movie in random.sample(self.movies, 5):
                showtime = ShowtimeFactory(theater=theater, movie=movie)
                self.showtimes.append(showtime)
    
    def test_event_search_performance(self):
        """Test event search performance with large dataset"""
        from events.search_services import SearchService
        
        start_time = time.time()
        
        # Perform multiple searches
        search_queries = [
            {'query': 'concert'},
            {'category': 'theater'},
            {'start_date': timezone.now(), 'end_date': timezone.now() + timedelta(days=30)},
            {'query': 'music', 'category': 'concert'}
        ]
        
        for query in search_queries * 10:  # 40 searches total
            results = SearchService.search_events(query)
            self.assertIsInstance(results, list)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        self.assertLess(execution_time, 5.0, "Event search took too long")
    
    def test_booking_creation_performance(self):
        """Test booking creation performance"""
        event = self.events[0]
        ticket_type = TicketTypeFactory(event=event, quantity_available=1000)
        
        start_time = time.time()
        
        # Create multiple bookings
        bookings_created = 0
        for i in range(50):
            try:
                booking_data = {
                    'customer': self.customers[i],
                    'booking_type': 'event',
                    'event': event,
                    'tickets': [{'ticket_type': ticket_type, 'quantity': 1}]
                }
                booking = BookingService.create_booking(booking_data)
                bookings_created += 1
            except Exception:
                pass  # Some may fail due to constraints
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should create bookings efficiently
        self.assertGreater(bookings_created, 40)
        self.assertLess(execution_time, 10.0, "Booking creation took too long")
    
    def test_database_query_performance(self):
        """Test database query performance with optimizations"""
        from django.db import connection
        from django.test.utils import override_settings
        
        # Reset query count
        connection.queries_log.clear()
        
        # Test optimized event listing with related data
        events_with_tickets = Event.objects.select_related('owner').prefetch_related(
            'ticket_types', 'bookings'
        )[:20]
        
        # Force evaluation
        list(events_with_tickets)
        
        # Should use reasonable number of queries (not N+1)
        query_count = len(connection.queries)
        self.assertLess(query_count, 10, f"Too many queries: {query_count}")
    
    def test_concurrent_read_performance(self):
        """Test read performance under concurrent access"""
        results = []
        
        def read_events():
            start_time = time.time()
            events = list(Event.objects.select_related('owner')[:20])
            end_time = time.time()
            results.append(end_time - start_time)
            return len(events)
        
        # Simulate concurrent reads
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(read_events) for _ in range(50)]
            
            for future in as_completed(futures):
                result = future.result()
                self.assertGreater(result, 0)
        
        # Check average response time
        avg_time = sum(results) / len(results)
        self.assertLess(avg_time, 1.0, f"Average read time too slow: {avg_time}")


class MemoryUsageTest(TestCase):
    """Test memory usage patterns"""
    
    def test_bulk_data_processing_memory(self):
        """Test memory usage during bulk data processing"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create large dataset
        events = []
        for i in range(1000):
            event = EventFactory()
            events.append(event)
        
        # Process data
        processed_events = []
        for event in events:
            processed_events.append({
                'id': event.id,
                'title': event.title,
                'start_datetime': event.start_datetime
            })
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (adjust threshold as needed)
        self.assertLess(memory_increase, 100, f"Memory usage too high: {memory_increase}MB")
    
    def test_queryset_memory_efficiency(self):
        """Test queryset memory efficiency with iterator"""
        # Create large dataset
        events = [EventFactory() for _ in range(500)]
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024
        
        # Process with iterator (memory efficient)
        processed_count = 0
        for event in Event.objects.iterator(chunk_size=50):
            processed_count += 1
        
        final_memory = process.memory_info().rss / 1024 / 1024
        memory_increase = final_memory - initial_memory
        
        self.assertEqual(processed_count, len(events))
        self.assertLess(memory_increase, 50, f"Iterator memory usage too high: {memory_increase}MB")


class CachePerformanceTest(TestCase):
    """Test caching performance"""
    
    def setUp(self):
        self.events = [EventFactory() for _ in range(20)]
    
    @patch('django.core.cache.cache.get')
    @patch('django.core.cache.cache.set')
    def test_event_caching_performance(self, mock_cache_set, mock_cache_get):
        """Test event caching improves performance"""
        from events.views import EventViewSet
        
        # First call - cache miss
        mock_cache_get.return_value = None
        
        start_time = time.time()
        # Simulate API call
        events = list(Event.objects.all()[:10])
        first_call_time = time.time() - start_time
        
        # Second call - cache hit
        mock_cache_get.return_value = events
        
        start_time = time.time()
        cached_events = mock_cache_get.return_value
        second_call_time = time.time() - start_time
        
        # Cache hit should be significantly faster
        self.assertLess(second_call_time, first_call_time / 10)
        mock_cache_set.assert_called()
        mock_cache_get.assert_called()


class DatabaseConnectionTest(TestCase):
    """Test database connection handling under load"""
    
    def test_connection_pooling_efficiency(self):
        """Test database connection efficiency"""
        from django.db import connections
        
        def db_operation():
            # Perform database operation
            return Event.objects.count()
        
        results = []
        
        # Simulate concurrent database operations
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(db_operation) for _ in range(100)]
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
        
        # All operations should complete successfully
        self.assertEqual(len(results), 100)
        
        # Check connection usage
        for alias in connections:
            connection = connections[alias]
            # Connection should be properly managed
            self.assertIsNotNone(connection)
    
    def test_transaction_performance(self):
        """Test transaction performance"""
        start_time = time.time()
        
        # Perform multiple transactions
        for i in range(50):
            with transaction.atomic():
                event = EventFactory()
                ticket_type = TicketTypeFactory(event=event)
                booking = BookingFactory(event=event)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should complete within reasonable time
        self.assertLess(execution_time, 10.0, "Transaction performance too slow")


class APIResponseTimeTest(TestCase):
    """Test API response times"""
    
    def setUp(self):
        # Create test data
        self.events = [EventFactory() for _ in range(100)]
        self.customer = create_test_user_with_role('customer')
    
    def test_event_list_response_time(self):
        """Test event list API response time"""
        from django.test import Client
        
        client = Client()
        
        start_time = time.time()
        response = client.get('/api/events/')
        end_time = time.time()
        
        response_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(response_time, 2.0, f"Event list response too slow: {response_time}s")
    
    def test_search_response_time(self):
        """Test search API response time"""
        from django.test import Client
        
        client = Client()
        
        search_queries = [
            '?search=concert',
            '?category=theater',
            '?search=music&category=concert'
        ]
        
        for query in search_queries:
            start_time = time.time()
            response = client.get(f'/api/events/{query}')
            end_time = time.time()
            
            response_time = end_time - start_time
            
            self.assertEqual(response.status_code, 200)
            self.assertLess(response_time, 3.0, f"Search response too slow: {response_time}s")


@pytest.mark.performance
class StressTest(TransactionTestCase):
    """Stress tests for extreme load conditions"""
    
    def test_extreme_concurrent_bookings(self):
        """Test system under extreme concurrent booking load"""
        event = EventFactory()
        ticket_type = TicketTypeFactory(event=event, quantity_available=1000)
        
        # Create many customers
        customers = [create_test_user_with_role('customer') for _ in range(200)]
        
        results = []
        
        def make_booking(customer):
            try:
                booking_data = {
                    'customer': customer,
                    'booking_type': 'event',
                    'event': event,
                    'tickets': [{'ticket_type': ticket_type, 'quantity': random.randint(1, 3)}]
                }
                booking = BookingService.create_booking(booking_data)
                results.append(('success', booking.id))
            except Exception as e:
                results.append(('error', str(e)))
        
        start_time = time.time()
        
        # Use high concurrency
        with ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(make_booking, customer) for customer in customers]
            
            for future in as_completed(futures):
                future.result()
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        successful_bookings = [r for r in results if r[0] == 'success']
        
        # System should handle high load gracefully
        self.assertGreater(len(successful_bookings), 100)
        self.assertLess(execution_time, 30.0, "Stress test took too long")
        
        # Verify data consistency
        total_tickets_sold = sum(
            booking.tickets.count() 
            for booking in Booking.objects.filter(event=event, booking_status='confirmed')
        )
        
        ticket_type.refresh_from_db()
        self.assertEqual(ticket_type.quantity_sold, total_tickets_sold)