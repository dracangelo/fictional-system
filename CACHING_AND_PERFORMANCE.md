# Caching and Performance Optimization

This document describes the caching and performance optimization implementation for the Movie Event Booking App.

## Overview

The implementation includes:
- Redis-based caching for frequently accessed data
- Database query optimization with select_related and prefetch_related
- Cache invalidation strategies for data updates
- API response caching for search and listing endpoints
- Database connection pooling and query monitoring
- Performance tests and benchmarking for critical operations

## Architecture

### Cache Layers

1. **Default Cache**: General application caching (Redis DB 1)
2. **API Cache**: API response caching (Redis DB 3)
3. **Session Cache**: User session storage (Redis DB 2)

### Cache Configuration

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/1',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'api_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/3',
        'TIMEOUT': 600,  # 10 minutes for API responses
    }
}
```

## Components

### 1. Cache Manager (`cache_utils.py`)

Central cache management with:
- Consistent cache key generation
- Model-specific cache invalidation
- Cache warming utilities
- Performance monitoring decorators

**Key Features:**
- Automatic cache invalidation on model changes
- Pattern-based cache deletion
- Cache timeout configuration per data type
- Query optimization utilities

### 2. Optimized Managers (`managers.py`)

Custom Django managers with:
- Built-in query optimization
- Cached query methods
- Search result caching
- Analytics data caching

**Available Managers:**
- `OptimizedEventManager`
- `OptimizedTheaterManager`
- `OptimizedMovieManager`
- `OptimizedShowtimeManager`
- `OptimizedBookingManager`

### 3. Cached Views (`cached_views.py`)

View mixins and decorators for:
- Automatic response caching
- Performance monitoring
- Query optimization
- Cache warming

**Mixins:**
- `CachedViewMixin`: Automatic list/detail caching
- `PerformanceMonitoringMixin`: Query and time monitoring
- `OptimizedQuerysetMixin`: Automatic query optimization

### 4. Middleware (`middleware.py`)

Performance and caching middleware:
- `APIResponseCacheMiddleware`: Cache GET API responses
- `PerformanceMonitoringMiddleware`: Monitor request performance
- `CacheInvalidationMiddleware`: Invalidate cache on writes
- `CompressionMiddleware`: Compress large responses

### 5. Signal Handlers (`signals.py`)

Automatic cache invalidation on model changes:
- Event-related cache invalidation
- Theater and movie cache invalidation
- Booking and analytics cache invalidation
- Cross-model relationship invalidation

## Cache Strategies

### 1. Data Caching

**Events:**
- List views: 5 minutes
- Detail views: 10 minutes
- Search results: 10 minutes
- Analytics: 15 minutes

**Theaters:**
- List views: 30 minutes
- Detail views: 1 hour
- Search results: 30 minutes

**Movies:**
- List views: 1 hour
- Detail views: 2 hours
- Search results: 1 hour

**Showtimes:**
- List views: 5 minutes (frequently changing)
- Availability: 5 minutes
- Search results: 5 minutes

### 2. Query Optimization

**Select Related:**
```python
# Events with owner information
Event.objects.select_related('owner', 'owner__profile')

# Showtimes with theater and movie
Showtime.objects.select_related('theater', 'movie')
```

**Prefetch Related:**
```python
# Events with ticket types and discounts
Event.objects.prefetch_related('ticket_types', 'discounts')

# Bookings with tickets and customer
Booking.objects.prefetch_related('tickets', 'tickets__ticket_type')
```

### 3. Cache Invalidation

**Automatic Invalidation:**
- Model save/delete triggers cache invalidation
- Related model changes invalidate dependent caches
- Pattern-based invalidation for related data

**Manual Invalidation:**
```python
from movie_booking_app.cache_utils import cache_manager

# Invalidate specific model
cache_manager.invalidate_model_cache(event_instance)

# Invalidate pattern
cache_manager.delete_pattern('events_*')
```

## Performance Monitoring

### 1. Query Monitoring

**Automatic Logging:**
- Slow queries (>100ms)
- High query count (>10 queries)
- N+1 query detection

**Manual Monitoring:**
```python
from movie_booking_app.cache_utils import monitor_query_performance

@monitor_query_performance
def my_view_function():
    # Function implementation
    pass
```

### 2. Response Time Monitoring

**Headers Added:**
- `X-Response-Time`: Request processing time
- `X-Query-Count`: Number of database queries
- `X-Cache`: Cache hit/miss status

### 3. Performance Benchmarking

**Management Commands:**
```bash
# Run performance benchmarks
python manage.py benchmark_performance --test-type all --iterations 10

# Warm up cache
python manage.py warm_cache --all --limit 100
```

## Usage Examples

### 1. Using Optimized Managers

```python
# Get cached active events
events = Event.objects.get_active_events()

# Search with caching
results = Event.objects.search_events(
    query='concert',
    location='New York',
    category='music'
)

# Get cached analytics
analytics = Booking.objects.get_analytics_data(
    date_from=start_date,
    date_to=end_date
)
```

### 2. Using Cached Views

```python
from movie_booking_app.cached_views import CachedViewMixin

class EventViewSet(CachedViewMixin, viewsets.ModelViewSet):
    cache_timeout = 300
    cache_key_prefix = 'events'
    cache_per_user = False
```

### 3. Manual Cache Management

```python
from movie_booking_app.cache_utils import cache_manager

# Cache data manually
cache_manager.set('my_key', data, timeout=600)

# Get cached data
data = cache_manager.get('my_key')

# Invalidate cache
cache_manager.delete('my_key')
cache_manager.delete_pattern('events_*')
```

## Performance Testing

### 1. Running Tests

```bash
# Run all performance tests
python manage.py test movie_booking_app.performance_tests

# Run specific test category
python -m pytest movie_booking_app/performance_tests.py::CachingPerformanceTests
```

### 2. Benchmark Results

Expected performance improvements:
- **Cache Hit Ratio**: 80-90% for frequently accessed data
- **Query Reduction**: 50-80% reduction in database queries
- **Response Time**: 30-60% faster response times
- **Concurrent Load**: Handle 5x more concurrent requests

### 3. Monitoring in Production

**Key Metrics to Monitor:**
- Cache hit ratio
- Average response time
- Database query count
- Memory usage
- Redis performance

**Alerting Thresholds:**
- Response time > 2 seconds
- Query count > 50 per request
- Cache hit ratio < 70%
- Memory usage > 80%

## Configuration

### 1. Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0

# Performance Settings
LOG_DB_QUERIES=True  # Enable query logging in development
```

### 2. Cache Timeouts

Customize cache timeouts in settings:

```python
CACHE_TIMEOUT = {
    'events_list': 300,
    'event_detail': 600,
    'theaters_list': 1800,
    'theater_detail': 3600,
    'movies_list': 3600,
    'movie_detail': 7200,
    'showtimes': 300,
    'analytics': 900,
    'search_results': 600,
}
```

## Best Practices

### 1. Cache Key Design
- Use consistent naming conventions
- Include relevant parameters in keys
- Avoid overly long cache keys
- Use hierarchical key structures

### 2. Cache Invalidation
- Invalidate related caches when data changes
- Use pattern-based invalidation for efficiency
- Monitor cache hit ratios
- Implement cache warming for critical data

### 3. Query Optimization
- Always use select_related for foreign keys
- Use prefetch_related for reverse foreign keys
- Avoid N+1 queries in loops
- Monitor query counts in development

### 4. Performance Monitoring
- Set up alerts for performance degradation
- Regularly review slow query logs
- Monitor cache performance metrics
- Benchmark critical operations regularly

## Troubleshooting

### 1. Cache Issues

**Cache Not Working:**
- Check Redis connection
- Verify cache configuration
- Check cache key generation
- Monitor cache hit ratios

**Cache Invalidation Problems:**
- Verify signal handlers are connected
- Check invalidation patterns
- Monitor cache size and memory usage
- Review cache timeout settings

### 2. Performance Issues

**Slow Queries:**
- Review database indexes
- Check query optimization
- Monitor N+1 query patterns
- Analyze query execution plans

**High Memory Usage:**
- Monitor cache size
- Review cache timeout settings
- Check for memory leaks
- Optimize data structures

### 3. Monitoring and Debugging

**Enable Debug Logging:**
```python
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
        },
        'performance': {
            'level': 'INFO',
        },
    },
}
```

**Performance Profiling:**
```bash
# Profile specific endpoints
python manage.py benchmark_performance --test-type queries

# Monitor cache performance
redis-cli monitor

# Check cache statistics
redis-cli info stats
```

## Maintenance

### 1. Regular Tasks

**Daily:**
- Monitor performance metrics
- Check error logs
- Review cache hit ratios

**Weekly:**
- Run performance benchmarks
- Review slow query logs
- Update cache warming data

**Monthly:**
- Analyze performance trends
- Optimize cache strategies
- Review and update timeouts

### 2. Cache Maintenance

```bash
# Warm up cache after deployment
python manage.py warm_cache --all

# Clear cache if needed
python manage.py shell -c "from django.core.cache import cache; cache.clear()"

# Monitor Redis memory usage
redis-cli info memory
```

This implementation provides a comprehensive caching and performance optimization solution that significantly improves the application's scalability and response times while maintaining data consistency and reliability.