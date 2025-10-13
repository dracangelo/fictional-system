"""
Middleware for caching and performance optimization
"""

import time
import logging
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings

from .cache_utils import cache_manager

logger = logging.getLogger('performance')


class APIResponseCacheMiddleware(MiddlewareMixin):
    """
    Middleware to cache API responses for GET requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming request for cache lookup"""
        # Only cache GET requests to API endpoints
        if (request.method != 'GET' or 
            not request.path.startswith('/api/') or
            request.user.is_authenticated and request.path.startswith('/api/admin/')):
            return None
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        # Try to get cached response
        cached_response = cache_manager.get(cache_key, cache_name='api_cache')
        if cached_response is not None:
            # Return cached response
            response = JsonResponse(cached_response)
            response['X-Cache'] = 'HIT'
            return response
        
        # Store cache key in request for use in process_response
        request._cache_key = cache_key
        return None
    
    def process_response(self, request, response):
        """Process response for caching"""
        # Only cache successful GET responses to API endpoints
        if (hasattr(request, '_cache_key') and 
            response.status_code == 200 and
            hasattr(response, 'data')):
            
            # Determine cache timeout based on endpoint
            timeout = self._get_cache_timeout(request.path)
            
            # Cache the response data
            cache_manager.set(
                request._cache_key, 
                response.data, 
                timeout, 
                cache_name='api_cache'
            )
            
            response['X-Cache'] = 'MISS'
        
        return response
    
    def _generate_cache_key(self, request):
        """Generate cache key for request"""
        key_parts = [
            'api_response',
            request.path,
            request.method
        ]
        
        # Add query parameters
        if request.GET:
            query_string = "&".join([f"{k}={v}" for k, v in sorted(request.GET.items())])
            key_parts.append(query_string)
        
        # Add user ID for user-specific endpoints
        if request.user.is_authenticated and self._is_user_specific_endpoint(request.path):
            key_parts.append(f"user_{request.user.id}")
        
        return cache_manager.get_cache_key(*key_parts)
    
    def _get_cache_timeout(self, path):
        """Get cache timeout based on endpoint"""
        timeout_map = {
            '/api/events/': 300,      # 5 minutes
            '/api/theaters/': 1800,   # 30 minutes
            '/api/movies/': 3600,     # 1 hour
            '/api/showtimes/': 300,   # 5 minutes
            '/api/bookings/': 300,    # 5 minutes (user-specific)
        }
        
        for endpoint, timeout in timeout_map.items():
            if path.startswith(endpoint):
                return timeout
        
        return 600  # Default 10 minutes
    
    def _is_user_specific_endpoint(self, path):
        """Check if endpoint returns user-specific data"""
        user_specific_endpoints = [
            '/api/bookings/',
            '/api/customer/',
            '/api/profile/',
        ]
        
        return any(path.startswith(endpoint) for endpoint in user_specific_endpoints)


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """
    Middleware to monitor API performance
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Start performance monitoring"""
        request._start_time = time.time()
        request._initial_queries = len(getattr(request, '_queries', []))
        return None
    
    def process_response(self, request, response):
        """Log performance metrics"""
        if not hasattr(request, '_start_time'):
            return response
        
        # Calculate metrics
        duration = time.time() - request._start_time
        query_count = len(getattr(request, '_queries', [])) - request._initial_queries
        
        # Add performance headers
        response['X-Response-Time'] = f'{duration:.3f}s'
        response['X-Query-Count'] = str(query_count)
        
        # Log slow requests
        if duration > 1.0:  # Requests taking more than 1 second
            logger.warning(
                f'Slow request: {request.method} {request.path} '
                f'took {duration:.3f}s with {query_count} queries'
            )
        
        # Log requests with many queries
        if query_count > 20:
            logger.warning(
                f'High query count: {request.method} {request.path} '
                f'executed {query_count} queries in {duration:.3f}s'
            )
        
        # Log API performance metrics
        if request.path.startswith('/api/') and settings.DEBUG:
            logger.info(
                f'API Performance: {request.method} {request.path} '
                f'- {duration:.3f}s, {query_count} queries'
            )
        
        return response


class CacheInvalidationMiddleware(MiddlewareMixin):
    """
    Middleware to handle cache invalidation for write operations
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """Invalidate cache for write operations"""
        # Invalidate cache for successful write operations
        if (request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and
            response.status_code in [200, 201, 204] and
            request.path.startswith('/api/')):
            
            self._invalidate_related_cache(request.path, request.method)
        
        return response
    
    def _invalidate_related_cache(self, path, method):
        """Invalidate cache based on the endpoint"""
        invalidation_map = {
            '/api/events/': ['events_*', 'search_*'],
            '/api/theaters/': ['theaters_*', 'showtimes_*'],
            '/api/movies/': ['movies_*', 'showtimes_*'],
            '/api/showtimes/': ['showtimes_*', 'theaters_*', 'movies_*'],
            '/api/bookings/': ['bookings_*', 'analytics_*', 'customer_*'],
        }
        
        patterns_to_invalidate = []
        
        for endpoint, patterns in invalidation_map.items():
            if path.startswith(endpoint):
                patterns_to_invalidate.extend(patterns)
                break
        
        # Invalidate cache patterns
        for pattern in patterns_to_invalidate:
            cache_manager.delete_pattern(pattern)
            cache_manager.delete_pattern(pattern, cache_name='api_cache')


class CompressionMiddleware(MiddlewareMixin):
    """
    Middleware to compress API responses
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """Compress response if appropriate"""
        # Only compress JSON responses
        if (hasattr(response, 'content') and 
            response.get('Content-Type', '').startswith('application/json') and
            len(response.content) > 1024):  # Only compress responses > 1KB
            
            # Check if client accepts gzip
            accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
            if 'gzip' in accept_encoding:
                import gzip
                
                # Compress content
                compressed_content = gzip.compress(response.content)
                
                # Only use compressed version if it's actually smaller
                if len(compressed_content) < len(response.content):
                    response.content = compressed_content
                    response['Content-Encoding'] = 'gzip'
                    response['Content-Length'] = str(len(compressed_content))
        
        return response