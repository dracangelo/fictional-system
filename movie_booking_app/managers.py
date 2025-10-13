"""
Optimized Django managers with caching and query optimization
"""

from django.db import models
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from .cache_utils import cache_manager, query_optimizer, cache_result


class CachedManager(models.Manager):
    """Base manager with caching capabilities"""
    
    def get_cached(self, pk, timeout=None):
        """Get object by primary key with caching"""
        cache_key = cache_manager.get_cache_key(
            f"{self.model._meta.label_lower}_detail", pk
        )
        
        obj = cache_manager.get(cache_key)
        if obj is None:
            try:
                obj = self.get(pk=pk)
                cache_timeout = timeout or cache_manager.timeouts.get(
                    f"{self.model._meta.label_lower}_detail", 600
                )
                cache_manager.set(cache_key, obj, cache_timeout)
            except self.model.DoesNotExist:
                # Cache negative results for a short time
                cache_manager.set(cache_key, 'NOT_FOUND', 60)
                raise
        elif obj == 'NOT_FOUND':
            raise self.model.DoesNotExist()
        
        return obj
    
    def get_cached_list(self, cache_key_suffix, queryset=None, timeout=None):
        """Get cached list of objects"""
        cache_key = cache_manager.get_cache_key(
            f"{self.model._meta.label_lower}_list", cache_key_suffix
        )
        
        result = cache_manager.get(cache_key, cache_name='api_cache')
        if result is None:
            if queryset is None:
                queryset = self.get_queryset()
            
            result = list(queryset)
            cache_timeout = timeout or cache_manager.timeouts.get(
                f"{self.model._meta.label_lower}_list", 300
            )
            cache_manager.set(cache_key, result, cache_timeout, cache_name='api_cache')
        
        return result


class OptimizedEventManager(CachedManager):
    """Optimized manager for Event model"""
    
    def get_queryset(self):
        """Return optimized queryset"""
        return query_optimizer.optimize_event_queryset(super().get_queryset())
    
    @cache_result(timeout=300, key_prefix='events_active')
    def get_active_events(self):
        """Get active published events with caching"""
        return self.filter(
            is_active=True,
            status='published'
        ).order_by('start_datetime')
    
    @cache_result(timeout=600, key_prefix='events_upcoming')
    def get_upcoming_events(self, days=30):
        """Get upcoming events within specified days"""
        end_date = timezone.now() + timedelta(days=days)
        return self.get_active_events().filter(
            start_datetime__gte=timezone.now(),
            start_datetime__lte=end_date
        )
    
    @cache_result(timeout=900, key_prefix='events_popular')
    def get_popular_events(self, limit=10):
        """Get popular events based on bookings"""
        from django.db.models import Count
        
        return self.get_active_events().annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')[:limit]
    
    def search_events(self, query, location=None, category=None, date_from=None, date_to=None):
        """Optimized event search with caching"""
        cache_key_parts = ['search', query or 'all']
        if location:
            cache_key_parts.append(f'loc_{location}')
        if category:
            cache_key_parts.append(f'cat_{category}')
        if date_from:
            cache_key_parts.append(f'from_{date_from}')
        if date_to:
            cache_key_parts.append(f'to_{date_to}')
        
        cache_key = cache_manager.get_cache_key('events_search', *cache_key_parts)
        
        result = cache_manager.get(cache_key, cache_name='api_cache')
        if result is None:
            queryset = self.get_active_events()
            
            if query:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(title__icontains=query) |
                    Q(description__icontains=query) |
                    Q(venue__icontains=query)
                )
            
            if location:
                queryset = queryset.filter(
                    models.Q(venue__icontains=location) |
                    models.Q(address__icontains=location)
                )
            
            if category:
                queryset = queryset.filter(category=category)
            
            if date_from:
                queryset = queryset.filter(start_datetime__gte=date_from)
            
            if date_to:
                queryset = queryset.filter(end_datetime__lte=date_to)
            
            result = list(queryset)
            cache_manager.set(cache_key, result, 600, cache_name='api_cache')
        
        return result


class OptimizedTheaterManager(CachedManager):
    """Optimized manager for Theater model"""
    
    def get_queryset(self):
        """Return optimized queryset"""
        return query_optimizer.optimize_theater_queryset(super().get_queryset())
    
    @cache_result(timeout=1800, key_prefix='theaters_active')
    def get_active_theaters(self):
        """Get active theaters with caching"""
        return self.filter(is_active=True).order_by('name')
    
    @cache_result(timeout=3600, key_prefix='theaters_by_city')
    def get_theaters_by_city(self, city):
        """Get theaters in a specific city"""
        return self.get_active_theaters().filter(city__iexact=city)
    
    def search_theaters(self, query=None, city=None, amenities=None):
        """Optimized theater search with caching"""
        cache_key_parts = ['search', query or 'all']
        if city:
            cache_key_parts.append(f'city_{city}')
        if amenities:
            cache_key_parts.append(f'amenities_{",".join(sorted(amenities))}')
        
        cache_key = cache_manager.get_cache_key('theaters_search', *cache_key_parts)
        
        result = cache_manager.get(cache_key, cache_name='api_cache')
        if result is None:
            queryset = self.get_active_theaters()
            
            if query:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(name__icontains=query) |
                    Q(address__icontains=query) |
                    Q(city__icontains=query)
                )
            
            if city:
                queryset = queryset.filter(city__iexact=city)
            
            if amenities:
                for amenity in amenities:
                    queryset = queryset.filter(amenities__contains=[amenity])
            
            result = list(queryset)
            cache_manager.set(cache_key, result, 1800, cache_name='api_cache')
        
        return result


class OptimizedMovieManager(CachedManager):
    """Optimized manager for Movie model"""
    
    def get_queryset(self):
        """Return optimized queryset"""
        return query_optimizer.optimize_movie_queryset(super().get_queryset())
    
    @cache_result(timeout=3600, key_prefix='movies_active')
    def get_active_movies(self):
        """Get active movies with caching"""
        return self.filter(is_active=True).order_by('-release_date')
    
    @cache_result(timeout=7200, key_prefix='movies_by_genre')
    def get_movies_by_genre(self, genre):
        """Get movies by genre"""
        return self.get_active_movies().filter(genre=genre)
    
    @cache_result(timeout=3600, key_prefix='movies_now_showing')
    def get_now_showing(self):
        """Get movies currently showing in theaters"""
        return self.get_active_movies().filter(
            showtimes__start_time__gte=timezone.now(),
            showtimes__is_active=True
        ).distinct()
    
    def search_movies(self, query=None, genre=None, rating=None, year=None):
        """Optimized movie search with caching"""
        cache_key_parts = ['search', query or 'all']
        if genre:
            cache_key_parts.append(f'genre_{genre}')
        if rating:
            cache_key_parts.append(f'rating_{rating}')
        if year:
            cache_key_parts.append(f'year_{year}')
        
        cache_key = cache_manager.get_cache_key('movies_search', *cache_key_parts)
        
        result = cache_manager.get(cache_key, cache_name='api_cache')
        if result is None:
            queryset = self.get_active_movies()
            
            if query:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(title__icontains=query) |
                    Q(description__icontains=query) |
                    Q(director__icontains=query)
                )
            
            if genre:
                queryset = queryset.filter(genre=genre)
            
            if rating:
                queryset = queryset.filter(rating=rating)
            
            if year:
                queryset = queryset.filter(release_date__year=year)
            
            result = list(queryset)
            cache_manager.set(cache_key, result, 3600, cache_name='api_cache')
        
        return result


class OptimizedShowtimeManager(CachedManager):
    """Optimized manager for Showtime model"""
    
    def get_queryset(self):
        """Return optimized queryset"""
        return query_optimizer.optimize_showtime_queryset(super().get_queryset())
    
    @cache_result(timeout=300, key_prefix='showtimes_upcoming')
    def get_upcoming_showtimes(self, days=7):
        """Get upcoming showtimes within specified days"""
        end_date = timezone.now() + timedelta(days=days)
        return self.filter(
            start_time__gte=timezone.now(),
            start_time__lte=end_date,
            is_active=True
        ).order_by('start_time')
    
    @cache_result(timeout=600, key_prefix='showtimes_by_theater')
    def get_showtimes_by_theater(self, theater_id, date=None):
        """Get showtimes for a specific theater"""
        queryset = self.filter(theater_id=theater_id, is_active=True)
        
        if date:
            queryset = queryset.filter(start_time__date=date)
        else:
            queryset = queryset.filter(start_time__gte=timezone.now())
        
        return queryset.order_by('start_time')
    
    @cache_result(timeout=600, key_prefix='showtimes_by_movie')
    def get_showtimes_by_movie(self, movie_id, city=None, date=None):
        """Get showtimes for a specific movie"""
        queryset = self.filter(movie_id=movie_id, is_active=True)
        
        if city:
            queryset = queryset.filter(theater__city__iexact=city)
        
        if date:
            queryset = queryset.filter(start_time__date=date)
        else:
            queryset = queryset.filter(start_time__gte=timezone.now())
        
        return queryset.order_by('start_time')


class OptimizedBookingManager(CachedManager):
    """Optimized manager for Booking model"""
    
    def get_queryset(self):
        """Return optimized queryset"""
        return query_optimizer.optimize_booking_queryset(super().get_queryset())
    
    @cache_result(timeout=900, key_prefix='bookings_analytics')
    def get_analytics_data(self, date_from=None, date_to=None):
        """Get booking analytics data with caching"""
        from django.db.models import Count, Sum, Avg
        
        queryset = self.filter(payment_status='completed')
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.aggregate(
            total_bookings=Count('id'),
            total_revenue=Sum('total_amount'),
            average_booking_value=Avg('total_amount')
        )
    
    def get_customer_bookings(self, customer_id, status=None):
        """Get bookings for a specific customer with optimization"""
        cache_key = cache_manager.get_cache_key(
            'customer_bookings', customer_id, status or 'all'
        )
        
        result = cache_manager.get(cache_key)
        if result is None:
            queryset = self.filter(customer_id=customer_id)
            
            if status:
                queryset = queryset.filter(booking_status=status)
            
            result = list(queryset.order_by('-created_at'))
            cache_manager.set(cache_key, result, 300)
        
        return result