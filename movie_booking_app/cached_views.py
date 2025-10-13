"""
Cached view mixins and decorators for performance optimization
"""

from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework.response import Response
from rest_framework import status

from .cache_utils import cache_manager, monitor_query_performance


def cache_api_view(timeout=300, key_prefix=None, vary_on=None):
    """
    Decorator for caching API view responses
    
    Args:
        timeout: Cache timeout in seconds
        key_prefix: Prefix for cache key
        vary_on: Headers to vary cache on
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Generate cache key based on request
            cache_key_parts = [
                key_prefix or view_func.__name__,
                request.method,
                request.path,
            ]
            
            # Add query parameters to cache key
            if request.GET:
                query_string = "&".join([f"{k}={v}" for k, v in sorted(request.GET.items())])
                cache_key_parts.append(query_string)
            
            # Add user ID for user-specific caching
            if hasattr(request, 'user') and request.user.is_authenticated:
                cache_key_parts.append(f"user_{request.user.id}")
            
            # Add vary_on headers to cache key
            if vary_on:
                for header in vary_on:
                    header_value = request.META.get(f'HTTP_{header.upper().replace("-", "_")}', '')
                    if header_value:
                        cache_key_parts.append(f"{header}_{header_value}")
            
            cache_key = cache_manager.get_cache_key(*cache_key_parts)
            
            # Try to get from cache
            cached_response = cache_manager.get(cache_key, cache_name='api_cache')
            if cached_response is not None:
                return Response(cached_response)
            
            # Execute view and cache result
            response = view_func(request, *args, **kwargs)
            
            # Only cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                cache_manager.set(cache_key, response.data, timeout, cache_name='api_cache')
            
            return response
        return wrapper
    return decorator


class CachedViewMixin:
    """
    Mixin to add caching capabilities to ViewSets
    """
    cache_timeout = 300
    cache_key_prefix = None
    cache_per_user = False
    
    def get_cache_key(self, action, *args, **kwargs):
        """Generate cache key for the view"""
        key_parts = [
            self.cache_key_prefix or self.__class__.__name__.lower(),
            action
        ]
        
        # Add URL parameters
        key_parts.extend(str(arg) for arg in args)
        
        # Add query parameters
        if hasattr(self, 'request') and self.request.GET:
            query_string = "&".join([f"{k}={v}" for k, v in sorted(self.request.GET.items())])
            key_parts.append(query_string)
        
        # Add user ID for user-specific caching
        if self.cache_per_user and hasattr(self, 'request') and self.request.user.is_authenticated:
            key_parts.append(f"user_{self.request.user.id}")
        
        return cache_manager.get_cache_key(*key_parts)
    
    def get_cached_response(self, action, *args, **kwargs):
        """Get cached response if available"""
        cache_key = self.get_cache_key(action, *args, **kwargs)
        return cache_manager.get(cache_key, cache_name='api_cache')
    
    def set_cached_response(self, action, response_data, timeout=None, *args, **kwargs):
        """Cache response data"""
        cache_key = self.get_cache_key(action, *args, **kwargs)
        cache_timeout = timeout or self.cache_timeout
        cache_manager.set(cache_key, response_data, cache_timeout, cache_name='api_cache')
    
    def list(self, request, *args, **kwargs):
        """Override list method with caching"""
        # Try to get from cache
        cached_data = self.get_cached_response('list', *args, **kwargs)
        if cached_data is not None:
            return Response(cached_data)
        
        # Execute original list method
        response = super().list(request, *args, **kwargs)
        
        # Cache successful responses
        if response.status_code == 200:
            self.set_cached_response('list', response.data, *args, **kwargs)
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve method with caching"""
        # Try to get from cache
        cached_data = self.get_cached_response('retrieve', *args, **kwargs)
        if cached_data is not None:
            return Response(cached_data)
        
        # Execute original retrieve method
        response = super().retrieve(request, *args, **kwargs)
        
        # Cache successful responses with longer timeout
        if response.status_code == 200:
            self.set_cached_response('retrieve', response.data, self.cache_timeout * 2, *args, **kwargs)
        
        return response


class PerformanceMonitoringMixin:
    """
    Mixin to add performance monitoring to views
    """
    
    @method_decorator(monitor_query_performance)
    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to monitor performance"""
        return super().dispatch(request, *args, **kwargs)


class OptimizedQuerysetMixin:
    """
    Mixin to optimize querysets with select_related and prefetch_related
    """
    
    def get_queryset(self):
        """Override to apply optimizations"""
        queryset = super().get_queryset()
        
        # Apply model-specific optimizations
        model_name = queryset.model._meta.label_lower
        
        if model_name == 'events.event':
            from movie_booking_app.cache_utils import query_optimizer
            return query_optimizer.optimize_event_queryset(queryset)
        elif model_name == 'theaters.theater':
            from movie_booking_app.cache_utils import query_optimizer
            return query_optimizer.optimize_theater_queryset(queryset)
        elif model_name == 'theaters.movie':
            from movie_booking_app.cache_utils import query_optimizer
            return query_optimizer.optimize_movie_queryset(queryset)
        elif model_name == 'theaters.showtime':
            from movie_booking_app.cache_utils import query_optimizer
            return query_optimizer.optimize_showtime_queryset(queryset)
        elif model_name == 'bookings.booking':
            from movie_booking_app.cache_utils import query_optimizer
            return query_optimizer.optimize_booking_queryset(queryset)
        
        return queryset


def invalidate_cache_on_save(sender, instance, **kwargs):
    """
    Signal handler to invalidate cache when models are saved
    """
    cache_manager.invalidate_model_cache(instance)
    cache_manager.invalidate_related_cache(instance)


def invalidate_cache_on_delete(sender, instance, **kwargs):
    """
    Signal handler to invalidate cache when models are deleted
    """
    cache_manager.invalidate_model_cache(instance)
    cache_manager.invalidate_related_cache(instance)


# Decorators for specific caching patterns
def cache_search_results(timeout=600):
    """Cache search results with specific timeout"""
    return cache_api_view(timeout=timeout, key_prefix='search')


def cache_analytics(timeout=900):
    """Cache analytics data with specific timeout"""
    return cache_api_view(timeout=timeout, key_prefix='analytics')


def cache_list_view(timeout=300):
    """Cache list view responses"""
    return cache_api_view(timeout=timeout, key_prefix='list')


def cache_detail_view(timeout=600):
    """Cache detail view responses"""
    return cache_api_view(timeout=timeout, key_prefix='detail')


class CacheWarmupMixin:
    """
    Mixin to warm up cache for frequently accessed data
    """
    
    def warm_up_cache(self):
        """Warm up cache for this view's data"""
        # This method should be implemented by subclasses
        # to define specific cache warming strategies
        pass
    
    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to potentially warm up cache"""
        # Warm up cache for GET requests on popular endpoints
        if request.method == 'GET' and hasattr(self, 'warm_up_cache'):
            try:
                self.warm_up_cache()
            except Exception:
                # Don't let cache warming failures affect the request
                pass
        
        return super().dispatch(request, *args, **kwargs)