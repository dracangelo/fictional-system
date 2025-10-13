"""
Management command to warm up cache with frequently accessed data
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from movie_booking_app.cache_utils import cache_manager, warm_up_cache
from events.models import Event
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking


class Command(BaseCommand):
    help = 'Warm up cache with frequently accessed data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--events',
            action='store_true',
            help='Warm up event cache',
        )
        parser.add_argument(
            '--theaters',
            action='store_true',
            help='Warm up theater cache',
        )
        parser.add_argument(
            '--movies',
            action='store_true',
            help='Warm up movie cache',
        )
        parser.add_argument(
            '--showtimes',
            action='store_true',
            help='Warm up showtime cache',
        )
        parser.add_argument(
            '--analytics',
            action='store_true',
            help='Warm up analytics cache',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Warm up all caches',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Limit number of items to cache (default: 50)',
        )
    
    def handle(self, *args, **options):
        """Execute cache warming"""
        limit = options['limit']
        
        if options['all']:
            self.warm_events(limit)
            self.warm_theaters(limit)
            self.warm_movies(limit)
            self.warm_showtimes(limit)
            self.warm_analytics()
        else:
            if options['events']:
                self.warm_events(limit)
            if options['theaters']:
                self.warm_theaters(limit)
            if options['movies']:
                self.warm_movies(limit)
            if options['showtimes']:
                self.warm_showtimes(limit)
            if options['analytics']:
                self.warm_analytics()
        
        self.stdout.write(
            self.style.SUCCESS('Cache warming completed successfully')
        )
    
    def warm_events(self, limit):
        """Warm up event cache"""
        self.stdout.write('Warming up event cache...')
        
        # Popular events (by booking count)
        from django.db.models import Count
        popular_events = Event.objects.filter(
            is_active=True,
            status='published'
        ).annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')[:limit]
        
        for event in popular_events:
            # Cache event detail
            cache_key = cache_manager.get_cache_key('event_detail', event.id)
            event_data = {
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'venue': event.venue,
                'start_datetime': event.start_datetime.isoformat(),
                'category': event.category,
                'status': event.status
            }
            cache_manager.set(cache_key, event_data, 
                            timeout=cache_manager.timeouts.get('event_detail', 600))
        
        # Upcoming events
        upcoming_events = Event.objects.filter(
            is_active=True,
            status='published',
            start_datetime__gte=timezone.now(),
            start_datetime__lte=timezone.now() + timedelta(days=30)
        )[:limit]
        
        cache_key = cache_manager.get_cache_key('events_upcoming')
        cache_manager.set(cache_key, list(upcoming_events), 
                        timeout=cache_manager.timeouts.get('events_upcoming', 600))
        
        self.stdout.write(f'  Cached {len(popular_events)} popular events')
        self.stdout.write(f'  Cached {len(upcoming_events)} upcoming events')
    
    def warm_theaters(self, limit):
        """Warm up theater cache"""
        self.stdout.write('Warming up theater cache...')
        
        active_theaters = Theater.objects.filter(is_active=True)[:limit]
        
        for theater in active_theaters:
            # Cache theater detail
            cache_key = cache_manager.get_cache_key('theater_detail', theater.id)
            theater_data = {
                'id': theater.id,
                'name': theater.name,
                'address': theater.address,
                'city': theater.city,
                'screens': theater.screens,
                'seating_layout': theater.seating_layout
            }
            cache_manager.set(cache_key, theater_data,
                            timeout=cache_manager.timeouts.get('theater_detail', 3600))
        
        # Cache theaters by popular cities
        from django.db.models import Count
        popular_cities = Theater.objects.filter(
            is_active=True
        ).values('city').annotate(
            theater_count=Count('id')
        ).order_by('-theater_count')[:10]
        
        for city_data in popular_cities:
            city = city_data['city']
            city_theaters = Theater.objects.filter(city=city, is_active=True)
            cache_key = cache_manager.get_cache_key('theaters_by_city', city)
            cache_manager.set(cache_key, list(city_theaters), timeout=1800)
        
        self.stdout.write(f'  Cached {len(active_theaters)} theaters')
        self.stdout.write(f'  Cached theaters for {len(popular_cities)} cities')
    
    def warm_movies(self, limit):
        """Warm up movie cache"""
        self.stdout.write('Warming up movie cache...')
        
        # Now showing movies
        now_showing = Movie.objects.filter(
            is_active=True,
            showtimes__start_time__gte=timezone.now(),
            showtimes__is_active=True
        ).distinct()[:limit]
        
        for movie in now_showing:
            # Cache movie detail
            cache_key = cache_manager.get_cache_key('movie_detail', movie.id)
            movie_data = {
                'id': movie.id,
                'title': movie.title,
                'description': movie.description,
                'genre': movie.genre,
                'duration': movie.duration,
                'rating': movie.rating,
                'director': movie.director,
                'release_date': movie.release_date.isoformat()
            }
            cache_manager.set(cache_key, movie_data,
                            timeout=cache_manager.timeouts.get('movie_detail', 7200))
        
        # Cache movies by genre
        popular_genres = ['action', 'comedy', 'drama', 'horror', 'sci-fi']
        for genre in popular_genres:
            genre_movies = Movie.objects.filter(genre=genre, is_active=True)[:20]
            cache_key = cache_manager.get_cache_key('movies_by_genre', genre)
            cache_manager.set(cache_key, list(genre_movies), timeout=3600)
        
        self.stdout.write(f'  Cached {len(now_showing)} now showing movies')
        self.stdout.write(f'  Cached movies for {len(popular_genres)} genres')
    
    def warm_showtimes(self, limit):
        """Warm up showtime cache"""
        self.stdout.write('Warming up showtime cache...')
        
        # Upcoming showtimes
        upcoming_showtimes = Showtime.objects.filter(
            start_time__gte=timezone.now(),
            start_time__lte=timezone.now() + timedelta(days=7),
            is_active=True
        ).select_related('theater', 'movie')[:limit]
        
        # Cache by theater
        theater_showtimes = {}
        for showtime in upcoming_showtimes:
            theater_id = showtime.theater_id
            if theater_id not in theater_showtimes:
                theater_showtimes[theater_id] = []
            theater_showtimes[theater_id].append(showtime)
        
        for theater_id, showtimes in theater_showtimes.items():
            cache_key = cache_manager.get_cache_key('showtimes_by_theater', theater_id)
            cache_manager.set(cache_key, showtimes, timeout=300)
        
        # Cache by movie
        movie_showtimes = {}
        for showtime in upcoming_showtimes:
            movie_id = showtime.movie_id
            if movie_id not in movie_showtimes:
                movie_showtimes[movie_id] = []
            movie_showtimes[movie_id].append(showtime)
        
        for movie_id, showtimes in movie_showtimes.items():
            cache_key = cache_manager.get_cache_key('showtimes_by_movie', movie_id)
            cache_manager.set(cache_key, showtimes, timeout=300)
        
        self.stdout.write(f'  Cached {len(upcoming_showtimes)} upcoming showtimes')
        self.stdout.write(f'  Cached showtimes for {len(theater_showtimes)} theaters')
        self.stdout.write(f'  Cached showtimes for {len(movie_showtimes)} movies')
    
    def warm_analytics(self):
        """Warm up analytics cache"""
        self.stdout.write('Warming up analytics cache...')
        
        from django.db.models import Count, Sum, Avg
        
        # System-wide analytics
        analytics_data = Booking.objects.filter(
            payment_status='completed'
        ).aggregate(
            total_bookings=Count('id'),
            total_revenue=Sum('total_amount'),
            avg_booking_value=Avg('total_amount')
        )
        
        cache_key = cache_manager.get_cache_key('system_analytics')
        cache_manager.set(cache_key, analytics_data, timeout=900)
        
        # Popular events analytics
        popular_events = Event.objects.filter(
            is_active=True,
            status='published'
        ).annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')[:10]
        
        for event in popular_events:
            event_analytics = {
                'total_bookings': Booking.objects.filter(event=event).count(),
                'total_revenue': Booking.objects.filter(
                    event=event, payment_status='completed'
                ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            }
            
            cache_key = cache_manager.get_cache_key('event_analytics', event.id)
            cache_manager.set(cache_key, event_analytics, timeout=900)
        
        self.stdout.write('  Cached system-wide analytics')
        self.stdout.write(f'  Cached analytics for {len(popular_events)} popular events')