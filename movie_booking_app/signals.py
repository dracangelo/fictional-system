"""
Signal handlers for cache invalidation and performance monitoring
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from movie_booking_app.cache_utils import cache_manager
from events.models import Event, TicketType, Discount
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking, Ticket, CustomerReview, WaitlistEntry


@receiver(post_save, sender=Event)
@receiver(post_delete, sender=Event)
def invalidate_event_cache(sender, instance, **kwargs):
    """Invalidate event-related cache when Event is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    # Invalidate related caches
    patterns = [
        'events_*',
        'search_*',
        'analytics_*',
        f'event_detail_{instance.id}',
        f'event_analytics_{instance.id}',
    ]
    
    for pattern in patterns:
        cache_manager.delete_pattern(pattern)
        cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=TicketType)
@receiver(post_delete, sender=TicketType)
def invalidate_ticket_type_cache(sender, instance, **kwargs):
    """Invalidate cache when TicketType is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    # Invalidate event-related caches
    if instance.event:
        cache_manager.invalidate_model_cache(instance.event)
        
        patterns = [
            f'event_detail_{instance.event.id}',
            f'event_analytics_{instance.event.id}',
            'events_*',
        ]
        
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
            cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=Discount)
@receiver(post_delete, sender=Discount)
def invalidate_discount_cache(sender, instance, **kwargs):
    """Invalidate cache when Discount is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    # Invalidate event-related caches
    if instance.event:
        patterns = [
            f'event_detail_{instance.event.id}',
            f'event_analytics_{instance.event.id}',
            'events_*',
        ]
        
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
            cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=Theater)
@receiver(post_delete, sender=Theater)
def invalidate_theater_cache(sender, instance, **kwargs):
    """Invalidate theater-related cache when Theater is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    patterns = [
        'theaters_*',
        'search_*',
        f'theater_detail_{instance.id}',
        f'theater_analytics_{instance.id}',
        f'theaters_by_city_{instance.city}',
    ]
    
    for pattern in patterns:
        cache_manager.delete_pattern(pattern)
        cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=Movie)
@receiver(post_delete, sender=Movie)
def invalidate_movie_cache(sender, instance, **kwargs):
    """Invalidate movie-related cache when Movie is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    patterns = [
        'movies_*',
        'search_*',
        f'movie_detail_{instance.id}',
        f'movies_by_genre_{instance.genre}',
    ]
    
    for pattern in patterns:
        cache_manager.delete_pattern(pattern)
        cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=Showtime)
@receiver(post_delete, sender=Showtime)
def invalidate_showtime_cache(sender, instance, **kwargs):
    """Invalidate showtime-related cache when Showtime is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    patterns = [
        'showtimes_*',
        f'showtimes_by_theater_{instance.theater_id}',
        f'showtimes_by_movie_{instance.movie_id}',
        f'theater_detail_{instance.theater_id}',
        f'movie_detail_{instance.movie_id}',
    ]
    
    for pattern in patterns:
        cache_manager.delete_pattern(pattern)
        cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=Booking)
@receiver(post_delete, sender=Booking)
def invalidate_booking_cache(sender, instance, **kwargs):
    """Invalidate booking-related cache when Booking is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    patterns = [
        'bookings_*',
        'analytics_*',
        f'customer_bookings_{instance.customer_id}',
        'system_analytics',
    ]
    
    # Invalidate event/showtime analytics
    if instance.event:
        patterns.append(f'event_analytics_{instance.event.id}')
    if instance.showtime:
        patterns.append(f'theater_analytics_{instance.showtime.theater_id}')
    
    for pattern in patterns:
        cache_manager.delete_pattern(pattern)
        cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=Ticket)
@receiver(post_delete, sender=Ticket)
def invalidate_ticket_cache(sender, instance, **kwargs):
    """Invalidate ticket-related cache when Ticket is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    # Invalidate booking-related caches
    if instance.booking:
        patterns = [
            f'customer_bookings_{instance.booking.customer_id}',
            'analytics_*',
        ]
        
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
            cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=CustomerReview)
@receiver(post_delete, sender=CustomerReview)
def invalidate_review_cache(sender, instance, **kwargs):
    """Invalidate review-related cache when CustomerReview is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    # Invalidate event/movie detail caches (reviews affect ratings)
    if instance.booking:
        patterns = []
        
        if instance.booking.event:
            patterns.append(f'event_detail_{instance.booking.event.id}')
        if instance.booking.showtime:
            patterns.append(f'movie_detail_{instance.booking.showtime.movie.id}')
        
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
            cache_manager.delete_pattern(pattern, cache_name='api_cache')


@receiver(post_save, sender=WaitlistEntry)
@receiver(post_delete, sender=WaitlistEntry)
def invalidate_waitlist_cache(sender, instance, **kwargs):
    """Invalidate waitlist-related cache when WaitlistEntry is modified"""
    cache_manager.invalidate_model_cache(instance)
    
    patterns = [
        f'customer_bookings_{instance.customer_id}',
        'waitlist_*',
    ]
    
    for pattern in patterns:
        cache_manager.delete_pattern(pattern)
        cache_manager.delete_pattern(pattern, cache_name='api_cache')