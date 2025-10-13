"""
Management command to run performance benchmarks
"""

import time
import statistics
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from datetime import timedelta

from movie_booking_app.performance_tests import (
    CachingPerformanceTests,
    QueryOptimizationTests,
    AnalyticsPerformanceTests
)


class Command(BaseCommand):
    help = 'Run performance benchmarks for the application'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--test-type',
            choices=['caching', 'queries', 'analytics', 'all'],
            default='all',
            help='Type of performance test to run',
        )
        parser.add_argument(
            '--iterations',
            type=int,
            default=10,
            help='Number of iterations for each benchmark (default: 10)',
        )
        parser.add_argument(
            '--output-file',
            type=str,
            help='File to save benchmark results',
        )
    
    def handle(self, *args, **options):
        """Execute performance benchmarks"""
        test_type = options['test_type']
        iterations = options['iterations']
        output_file = options['output_file']
        
        results = {}
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting performance benchmarks ({iterations} iterations)...')
        )
        
        if test_type in ['caching', 'all']:
            results['caching'] = self.run_caching_benchmarks(iterations)
        
        if test_type in ['queries', 'all']:
            results['queries'] = self.run_query_benchmarks(iterations)
        
        if test_type in ['analytics', 'all']:
            results['analytics'] = self.run_analytics_benchmarks(iterations)
        
        # Display results
        self.display_results(results)
        
        # Save to file if specified
        if output_file:
            self.save_results(results, output_file)
        
        self.stdout.write(
            self.style.SUCCESS('Performance benchmarks completed')
        )
    
    def run_caching_benchmarks(self, iterations):
        """Run caching performance benchmarks"""
        self.stdout.write('Running caching benchmarks...')
        
        from events.models import Event
        from django.core.cache import cache
        
        results = {}
        
        # Test 1: Cache hit vs miss performance
        cache.clear()
        
        # Create test event
        from django.contrib.auth.models import User
        try:
            user = User.objects.get(username='test_event_owner')
        except User.DoesNotExist:
            user = User.objects.create_user(
                username='test_event_owner',
                email='test@example.com',
                password='testpass123'
            )
        
        event = Event.objects.create(
            owner=user,
            title='Benchmark Event',
            description='Test event for benchmarking',
            venue='Test Venue',
            address='Test Address',
            category='concert',
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, hours=2)
        )
        
        # Benchmark cache miss (first access)
        cache_miss_times = []
        for _ in range(iterations):
            cache.clear()
            start_time = time.time()
            _ = Event.objects.get(id=event.id)
            end_time = time.time()
            cache_miss_times.append(end_time - start_time)
        
        # Benchmark cache hit (subsequent accesses)
        cache_hit_times = []
        for _ in range(iterations):
            start_time = time.time()
            _ = Event.objects.get(id=event.id)
            end_time = time.time()
            cache_hit_times.append(end_time - start_time)
        
        results['cache_performance'] = {
            'cache_miss_avg': statistics.mean(cache_miss_times),
            'cache_hit_avg': statistics.mean(cache_hit_times),
            'improvement_ratio': statistics.mean(cache_miss_times) / statistics.mean(cache_hit_times)
        }
        
        # Clean up
        event.delete()
        
        return results
    
    def run_query_benchmarks(self, iterations):
        """Run query optimization benchmarks"""
        self.stdout.write('Running query optimization benchmarks...')
        
        from bookings.models import Booking
        from movie_booking_app.cache_utils import query_optimizer
        
        results = {}
        
        # Test 1: Optimized vs unoptimized queries
        def unoptimized_query():
            initial_queries = len(connection.queries)
            bookings = list(Booking.objects.all()[:10])
            # Access related objects (N+1 problem)
            for booking in bookings:
                _ = booking.customer.username
                if booking.showtime:
                    _ = booking.showtime.movie.title
            return len(connection.queries) - initial_queries
        
        def optimized_query():
            initial_queries = len(connection.queries)
            bookings = list(query_optimizer.optimize_booking_queryset(
                Booking.objects.all()[:10]
            ))
            # Access related objects (should be prefetched)
            for booking in bookings:
                _ = booking.customer.username
                if booking.showtime:
                    _ = booking.showtime.movie.title
            return len(connection.queries) - initial_queries
        
        # Benchmark unoptimized queries
        unopt_times = []
        unopt_queries = []
        for _ in range(iterations):
            connection.queries_log.clear()
            start_time = time.time()
            query_count = unoptimized_query()
            end_time = time.time()
            unopt_times.append(end_time - start_time)
            unopt_queries.append(query_count)
        
        # Benchmark optimized queries
        opt_times = []
        opt_queries = []
        for _ in range(iterations):
            connection.queries_log.clear()
            start_time = time.time()
            query_count = optimized_query()
            end_time = time.time()
            opt_times.append(end_time - start_time)
            opt_queries.append(query_count)
        
        results['query_optimization'] = {
            'unoptimized_avg_time': statistics.mean(unopt_times),
            'optimized_avg_time': statistics.mean(opt_times),
            'unoptimized_avg_queries': statistics.mean(unopt_queries),
            'optimized_avg_queries': statistics.mean(opt_queries),
            'time_improvement': statistics.mean(unopt_times) / statistics.mean(opt_times),
            'query_reduction': statistics.mean(unopt_queries) / statistics.mean(opt_queries)
        }
        
        return results
    
    def run_analytics_benchmarks(self, iterations):
        """Run analytics performance benchmarks"""
        self.stdout.write('Running analytics benchmarks...')
        
        from django.db.models import Count, Sum, Avg
        from bookings.models import Booking
        
        results = {}
        
        # Test 1: Complex analytics query
        def analytics_query():
            initial_queries = len(connection.queries)
            start_time = time.time()
            
            analytics = Booking.objects.filter(
                payment_status='completed'
            ).aggregate(
                total_bookings=Count('id'),
                total_revenue=Sum('total_amount'),
                avg_booking_value=Avg('total_amount')
            )
            
            end_time = time.time()
            query_count = len(connection.queries) - initial_queries
            
            return {
                'time': end_time - start_time,
                'queries': query_count,
                'result': analytics
            }
        
        # Benchmark analytics queries
        analytics_results = []
        for _ in range(iterations):
            connection.queries_log.clear()
            result = analytics_query()
            analytics_results.append(result)
        
        results['analytics_performance'] = {
            'avg_time': statistics.mean([r['time'] for r in analytics_results]),
            'avg_queries': statistics.mean([r['queries'] for r in analytics_results]),
            'min_time': min([r['time'] for r in analytics_results]),
            'max_time': max([r['time'] for r in analytics_results])
        }
        
        return results
    
    def display_results(self, results):
        """Display benchmark results"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('PERFORMANCE BENCHMARK RESULTS'))
        self.stdout.write('='*60)
        
        for category, data in results.items():
            self.stdout.write(f'\n{category.upper()} BENCHMARKS:')
            self.stdout.write('-' * 40)
            
            for test_name, metrics in data.items():
                self.stdout.write(f'\n{test_name}:')
                
                if isinstance(metrics, dict):
                    for metric, value in metrics.items():
                        if isinstance(value, float):
                            self.stdout.write(f'  {metric}: {value:.4f}')
                        else:
                            self.stdout.write(f'  {metric}: {value}')
                else:
                    self.stdout.write(f'  Result: {metrics}')
    
    def save_results(self, results, filename):
        """Save results to file"""
        import json
        from datetime import datetime
        
        output_data = {
            'timestamp': datetime.now().isoformat(),
            'results': results
        }
        
        try:
            with open(filename, 'w') as f:
                json.dump(output_data, f, indent=2, default=str)
            
            self.stdout.write(
                self.style.SUCCESS(f'Results saved to {filename}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to save results: {e}')
            )