"""
Caching utilities for the movie booking application.
Provides centralized cache management with invalidation strategies.
"""

import hashlib
import json
from functools import wraps
from typing import Any, Dict, List, Optional, Union

from django.core.cache import cache, caches
from django.conf import settings
from django.db.models import Model
from django.utils import timezone
from django.utils.encoding import force_str


class CacheManager:
    """Centralized cache management with invalidation strategies"""
    
    def __init__(self):
        self.default_cache = cache
        self.api_cache = caches['api_cache']
        self.timeouts = getattr(settings, 'CACHE_TIMEOUT', {})
    
    def get_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a consistent cache key"""
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            if isinstance(arg, Model):
                key_parts.append(f"{arg._meta.label_lower}_{arg.pk}")
            else:
                key_parts.append(str(arg))
        
        # Add keyword arguments (sorted for consistency)
        for key, value in sorted(kwargs.items()):
            if isinstance(value, Model):
                key_parts.append(f"{key}_{value._meta.label_lower}_{value.pk}")
            else:
                key_parts.append(f"{key}_{value}")
        
        # Create hash for long keys
        key_string = "_".join(key_parts)
        if len(key_string) > 200:
            key_hash = hashlib.md5(key_string.encode()).hexdigest()
            return f"{prefix}_{key_hash}"
        
        return key_string.replace(" ", "_").replace(":", "_")
    
    def get(self, key: str, default=None, cache_name: str = 'default') -> Any:
        """Get value from cache"""
        target_cache = self.api_cache if cache_name == 'api_cache' else self.default_cache
        return target_cache.get(key, default)
    
    def set(self, key: str, value: Any, timeout: Optional[int] = None, 
            cache_name: str = 'default') -> None:
        """Set value in cache"""
        target_cache = self.api_cache if cache_name == 'api_cache' else self.default_cache
        if timeout is None:
            timeout = 300  # 5 minutes default
        target_cache.set(key, value, timeout)
    
    def delete(self, key: str, cache_name: str = 'default') -> None:
        """Delete value from cache"""
        target_cache = self.api_cache if cache_name == 'api_cache' else self.default_cache
        target_cache.delete(key)
    
    def delete_pattern(self, pattern: str, cache_name: str = 'default') -> None:
        """Delete all keys matching pattern"""
        target_cache = self.api_cache if cache_name == 'api_cache' else self.default_cache
        if hasattr(target_cache, 'delete_pattern'):
            target_cache.delete_pattern(pattern)
    
    def invalidate_model_cache(self, model_instance: Model) -> None:
        """Invalidate cache for a specific model instance"""
        model_name = model_instance._meta.label_lower
        model_id = model_instance.pk
        
        # Invalidate specific instance caches
        patterns = [
            f"*{model_name}_{model_id}*",
            f"*{model_name}_detail_{model_id}*",
            f"*{model_name}_analytics_{model_id}*",
        ]
        
        for pattern in patterns:
            self.delete_pattern(pattern)
            self.delete_pattern(pattern, cache_name='api_cache')
        
        # Invalidate list caches for the model
        list_patterns = [
            f"*{model_name}_list*",
            f"*{model_name}s_list*",
            f"*search*{model_name}*",
        ]
        
        for pattern in list_patterns:
            self.delete_pattern(pattern)
            self.delete_pattern(pattern, cache_name='api_cache')
    
    def invalidate_related_cache(self, model_instance: Model) -> None:
        """Invalidate cache for related models"""
        model_name = model_instance._meta.label_lower
        
        # Define relationships that should trigger cache invalidation
        invalidation_map = {
            'events.event': ['events_list', 'search_results', 'analytics'],
            'events.tickettype': ['events_list', 'event_detail', 'analytics'],
            'events.discount': ['events_list', 'event_detail', 'analytics'],
            'theaters.theater': ['theaters_list', 'search_results', 'analytics'],
            'theaters.movie': ['movies_list', 'search_results', 'showtimes'],
            'theaters.showtime': ['showtimes', 'theaters_list', 'movies_list', 'analytics'],
            'bookings.booking': ['analytics', 'customer_analytics'],
            'bookings.ticket': ['analytics', 'customer_analytics'],
        }
        
        patterns_to_invalidate = invalidation_map.get(model_name, [])
        
        for pattern in patterns_to_invalidate:
            self.delete_pattern(f"*{pattern}*")
            self.delete_pattern(f"*{pattern}*", cache_name='api_cache')


# Global cache manager instance
cache_manager = CacheManager()


def cache_result(timeout: Optional[int] = None, cache_name: str = 'default', 
                key_prefix: str = None):
    """
    Decorator to cache function results
    
    Args:
        timeout: Cache timeout in seconds
        cache_name: Cache backend to use ('default' or 'api_cache')
        key_prefix: Prefix for cache key
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_prefix:
                prefix = key_prefix
            else:
                prefix = f"{func.__module__}.{func.__name__}"
            
            cache_key = cache_manager.get_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            result = cache_manager.get(cache_key, cache_name=cache_name)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_timeout = timeout or cache_manager.timeouts.get(key_prefix, 300)
            cache_manager.set(cache_key, result, cache_timeout, cache_name=cache_name)
            
            return result
        return wrapper
    return decorator


def cache_api_response(timeout: Optional[int] = None, key_prefix: str = None):
    """
    Decorator specifically for caching API responses
    """
    return cache_result(timeout=timeout, cache_name='api_cache', key_prefix=key_prefix)


class QueryOptimizer:
    """Query optimization utilities"""
    
    @staticmethod
    def optimize_event_queryset(queryset):
        """Optimize event queryset with select_related and prefetch_related"""
        return queryset.select_related(
            'owner',
            'owner__profile'
        ).prefetch_related(
            'ticket_types',
            'discounts',
            'bookings',
            'bookings__tickets'
        )
    
    @staticmethod
    def optimize_theater_queryset(queryset):
        """Optimize theater queryset with select_related and prefetch_related"""
        return queryset.select_related(
            'owner',
            'owner__profile'
        ).prefetch_related(
            'showtimes',
            'showtimes__movie',
            'showtimes__bookings'
        )
    
    @staticmethod
    def optimize_movie_queryset(queryset):
        """Optimize movie queryset with select_related and prefetch_related"""
        return queryset.prefetch_related(
            'showtimes',
            'showtimes__theater',
            'showtimes__bookings'
        )
    
    @staticmethod
    def optimize_showtime_queryset(queryset):
        """Optimize showtime queryset with select_related and prefetch_related"""
        return queryset.select_related(
            'theater',
            'theater__owner',
            'movie'
        ).prefetch_related(
            'bookings',
            'bookings__tickets',
            'bookings__customer'
        )
    
    @staticmethod
    def optimize_booking_queryset(queryset):
        """Optimize booking queryset with select_related and prefetch_related"""
        return queryset.select_related(
            'customer',
            'customer__profile',
            'event',
            'event__owner',
            'showtime',
            'showtime__theater',
            'showtime__movie',
            'applied_discount'
        ).prefetch_related(
            'tickets',
            'tickets__ticket_type'
        )


# Global query optimizer instance
query_optimizer = QueryOptimizer()


def monitor_query_performance(func):
    """
    Decorator to monitor query performance
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        from django.db import connection
        from django.conf import settings
        import logging
        
        if not settings.DEBUG:
            return func(*args, **kwargs)
        
        logger = logging.getLogger('performance')
        
        # Reset queries count
        initial_queries = len(connection.queries)
        start_time = timezone.now()
        
        # Execute function
        result = func(*args, **kwargs)
        
        # Calculate performance metrics
        end_time = timezone.now()
        execution_time = (end_time - start_time).total_seconds()
        queries_count = len(connection.queries) - initial_queries
        
        # Log performance data
        logger.info(
            f"Function: {func.__name__} | "
            f"Execution time: {execution_time:.3f}s | "
            f"Queries: {queries_count}"
        )
        
        # Log slow queries (> 100ms)
        if execution_time > 0.1:
            logger.warning(
                f"Slow function detected: {func.__name__} took {execution_time:.3f}s"
            )
        
        # Log excessive queries (> 10)
        if queries_count > 10:
            logger.warning(
                f"Excessive queries detected: {func.__name__} executed {queries_count} queries"
            )
        
        return result
    return wrapper


class CacheInvalidationMixin:
    """
    Mixin for Django models to handle automatic cache invalidation
    """
    
    def save(self, *args, **kwargs):
        """Override save to invalidate cache"""
        super().save(*args, **kwargs)
        cache_manager.invalidate_model_cache(self)
        cache_manager.invalidate_related_cache(self)
    
    def delete(self, *args, **kwargs):
        """Override delete to invalidate cache"""
        cache_manager.invalidate_model_cache(self)
        cache_manager.invalidate_related_cache(self)
        super().delete(*args, **kwargs)


def warm_up_cache():
    """
    Warm up frequently accessed cache entries
    """
    from events.models import Event
    from theaters.models import Theater, Movie
    
    # Warm up popular events
    popular_events = Event.objects.filter(
        is_active=True,
        status='published'
    ).order_by('-created_at')[:10]
    
    for event in popular_events:
        cache_key = cache_manager.get_cache_key('event_detail', event.id)
        if not cache_manager.get(cache_key):
            # This would typically be the serialized event data
            cache_manager.set(cache_key, {'id': event.id, 'title': event.title}, 
                            timeout=cache_manager.timeouts.get('event_detail', 600))
    
    # Warm up active theaters
    active_theaters = Theater.objects.filter(is_active=True)[:10]
    
    for theater in active_theaters:
        cache_key = cache_manager.get_cache_key('theater_detail', theater.id)
        if not cache_manager.get(cache_key):
            cache_manager.set(cache_key, {'id': theater.id, 'name': theater.name},
                            timeout=cache_manager.timeouts.get('theater_detail', 3600))
    
    # Warm up popular movies
    popular_movies = Movie.objects.filter(is_active=True).order_by('-created_at')[:10]
    
    for movie in popular_movies:
        cache_key = cache_manager.get_cache_key('movie_detail', movie.id)
        if not cache_manager.get(cache_key):
            cache_manager.set(cache_key, {'id': movie.id, 'title': movie.title},
                            timeout=cache_manager.timeouts.get('movie_detail', 7200))