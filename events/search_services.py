"""
Search and discovery services for events and movies
"""
from django.db import models
from django.db.models import Q, Count, Avg, Sum, F, Case, When, Value, IntegerField
from django.db.models.functions import Greatest, Coalesce
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import math

from .models import Event, TicketType
from theaters.models import Movie, Theater, Showtime
from bookings.models import Booking, Ticket


class SearchService:
    """Advanced search service for events and movies"""
    
    @staticmethod
    def search_events(
        query: str = None,
        location: str = None,
        date_from: str = None,
        date_to: str = None,
        min_price: Decimal = None,
        max_price: Decimal = None,
        categories: List[str] = None,
        min_rating: float = None,
        available_only: bool = True,
        sort_by: str = 'relevance',
        page_size: int = 20
    ):
        """
        Advanced event search with multiple filters
        
        Args:
            query: Search query string
            location: Location filter (venue, address, city)
            date_from: Start date filter
            date_to: End date filter
            min_price: Minimum price filter
            max_price: Maximum price filter
            categories: List of event categories
            min_rating: Minimum rating filter
            available_only: Only show events with available tickets
            sort_by: Sort order (relevance, date, price, rating)
            page_size: Number of results per page
        
        Returns:
            QuerySet of filtered events
        """
        queryset = Event.objects.select_related('owner').prefetch_related(
            'ticket_types', 'discounts'
        ).filter(
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now()
        )
        
        # Text search
        if query:
            try:
                # PostgreSQL full-text search
                search_vector = SearchVector('title', weight='A') + \
                               SearchVector('description', weight='B') + \
                               SearchVector('venue', weight='C') + \
                               SearchVector('address', weight='D')
                search_query_obj = SearchQuery(query)
                queryset = queryset.annotate(
                    search=search_vector,
                    rank=SearchRank(search_vector, search_query_obj)
                ).filter(search=search_query_obj)
            except:
                # Fallback to icontains search for SQLite
                queryset = queryset.filter(
                    Q(title__icontains=query) |
                    Q(description__icontains=query) |
                    Q(venue__icontains=query) |
                    Q(address__icontains=query)
                ).annotate(rank=Value(1.0))
        else:
            queryset = queryset.annotate(rank=Value(1.0))
        
        # Location filter
        if location:
            queryset = queryset.filter(
                Q(venue__icontains=location) |
                Q(address__icontains=location)
            )
        
        # Date range filter
        if date_from:
            queryset = queryset.filter(start_datetime__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_datetime__date__lte=date_to)
        
        # Category filter
        if categories:
            queryset = queryset.filter(category__in=categories)
        
        # Price range filter
        if min_price is not None or max_price is not None:
            price_filter = Q()
            if min_price is not None:
                price_filter &= Q(ticket_types__price__gte=min_price)
            if max_price is not None:
                price_filter &= Q(ticket_types__price__lte=max_price)
            queryset = queryset.filter(price_filter).distinct()
        
        # Availability filter
        if available_only:
            queryset = queryset.filter(
                ticket_types__quantity_sold__lt=F('ticket_types__quantity_available')
            ).distinct()
        
        # Add calculated fields for sorting
        queryset = queryset.annotate(
            min_price=Coalesce(
                models.Min('ticket_types__price'),
                Value(Decimal('0.00'))
            ),
            avg_rating=Coalesce(
                Avg('bookings__tickets__booking__customer__bookings__tickets__price'),
                Value(0.0)
            ),
            booking_count=Count('bookings', distinct=True)
        )
        
        # Rating filter (if we had a rating system)
        if min_rating is not None:
            queryset = queryset.filter(avg_rating__gte=min_rating)
        
        # Sorting
        if sort_by == 'date':
            queryset = queryset.order_by('start_datetime')
        elif sort_by == 'price_low':
            queryset = queryset.order_by('min_price')
        elif sort_by == 'price_high':
            queryset = queryset.order_by('-min_price')
        elif sort_by == 'popularity':
            queryset = queryset.order_by('-booking_count', '-start_datetime')
        elif sort_by == 'rating':
            queryset = queryset.order_by('-avg_rating', '-start_datetime')
        else:  # relevance (default)
            if query:
                queryset = queryset.order_by('-rank', '-start_datetime')
            else:
                queryset = queryset.order_by('-start_datetime')
        
        return queryset
    
    @staticmethod
    def search_movies(
        query: str = None,
        location: str = None,
        date_from: str = None,
        date_to: str = None,
        min_price: Decimal = None,
        max_price: Decimal = None,
        genres: List[str] = None,
        ratings: List[str] = None,
        min_rating: float = None,
        available_only: bool = True,
        sort_by: str = 'relevance',
        page_size: int = 20
    ):
        """
        Advanced movie search with multiple filters
        
        Args:
            query: Search query string
            location: Location filter (theater name, city, address)
            date_from: Start date filter for showtimes
            date_to: End date filter for showtimes
            min_price: Minimum price filter
            max_price: Maximum price filter
            genres: List of movie genres
            ratings: List of movie ratings (G, PG, R, etc.)
            min_rating: Minimum user rating filter
            available_only: Only show movies with available seats
            sort_by: Sort order (relevance, date, price, rating)
            page_size: Number of results per page
        
        Returns:
            QuerySet of filtered movies with showtimes
        """
        # Start with showtimes to get movies with available showtimes
        queryset = Showtime.objects.select_related(
            'movie', 'theater'
        ).filter(
            is_active=True,
            start_time__gt=timezone.now()
        )
        
        # Location filter (theater-based)
        if location:
            queryset = queryset.filter(
                Q(theater__name__icontains=location) |
                Q(theater__city__icontains=location) |
                Q(theater__address__icontains=location)
            )
        
        # Date range filter
        if date_from:
            queryset = queryset.filter(start_time__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_time__date__lte=date_to)
        
        # Movie filters
        if query:
            try:
                # PostgreSQL full-text search
                search_vector = SearchVector('movie__title', weight='A') + \
                               SearchVector('movie__description', weight='B') + \
                               SearchVector('movie__director', weight='C')
                search_query_obj = SearchQuery(query)
                queryset = queryset.annotate(
                    search=search_vector,
                    rank=SearchRank(search_vector, search_query_obj)
                ).filter(search=search_query_obj)
            except:
                # Fallback to icontains search
                queryset = queryset.filter(
                    Q(movie__title__icontains=query) |
                    Q(movie__description__icontains=query) |
                    Q(movie__director__icontains=query)
                ).annotate(rank=Value(1.0))
        else:
            queryset = queryset.annotate(rank=Value(1.0))
        
        # Genre filter
        if genres:
            queryset = queryset.filter(movie__genre__in=genres)
        
        # Rating filter
        if ratings:
            queryset = queryset.filter(movie__rating__in=ratings)
        
        # Price range filter
        if min_price is not None:
            queryset = queryset.filter(base_price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(base_price__lte=max_price)
        
        # Availability filter
        if available_only:
            queryset = queryset.filter(available_seats__gt=0)
        
        # Add calculated fields for sorting
        queryset = queryset.annotate(
            booking_count=Count('bookings', distinct=True),
            avg_rating=Coalesce(
                Avg('bookings__tickets__price'),
                Value(0.0)
            )
        )
        
        # User rating filter (if we had a rating system)
        if min_rating is not None:
            queryset = queryset.filter(avg_rating__gte=min_rating)
        
        # Sorting
        if sort_by == 'date':
            queryset = queryset.order_by('start_time')
        elif sort_by == 'price_low':
            queryset = queryset.order_by('base_price')
        elif sort_by == 'price_high':
            queryset = queryset.order_by('-base_price')
        elif sort_by == 'popularity':
            queryset = queryset.order_by('-booking_count', '-start_time')
        elif sort_by == 'rating':
            queryset = queryset.order_by('-avg_rating', '-start_time')
        else:  # relevance (default)
            if query:
                queryset = queryset.order_by('-rank', '-start_time')
            else:
                queryset = queryset.order_by('-start_time')
        
        return queryset
    
    @staticmethod
    def get_popular_searches():
        """Get popular search terms based on booking data"""
        # Get popular event categories
        popular_event_categories = Event.objects.filter(
            bookings__payment_status='completed',
            start_datetime__gte=timezone.now() - timedelta(days=30)
        ).values('category').annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')[:10]
        
        # Get popular movie genres
        popular_movie_genres = Movie.objects.filter(
            showtimes__bookings__payment_status='completed',
            showtimes__start_time__gte=timezone.now() - timedelta(days=30)
        ).values('genre').annotate(
            booking_count=Count('showtimes__bookings')
        ).order_by('-booking_count')[:10]
        
        # Get popular locations
        popular_event_locations = Event.objects.filter(
            bookings__payment_status='completed',
            start_datetime__gte=timezone.now() - timedelta(days=30)
        ).values('venue').annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')[:10]
        
        popular_theater_locations = Theater.objects.filter(
            showtimes__bookings__payment_status='completed',
            showtimes__start_time__gte=timezone.now() - timedelta(days=30)
        ).values('city').annotate(
            booking_count=Count('showtimes__bookings')
        ).order_by('-booking_count')[:10]
        
        return {
            'event_categories': list(popular_event_categories),
            'movie_genres': list(popular_movie_genres),
            'event_locations': list(popular_event_locations),
            'theater_locations': list(popular_theater_locations)
        }


class RecommendationService:
    """Recommendation system based on user booking history"""
    
    @staticmethod
    def get_user_recommendations(user, limit: int = 10):
        """
        Get personalized recommendations for a user based on their booking history
        
        Args:
            user: User object
            limit: Number of recommendations to return
        
        Returns:
            Dictionary with event and movie recommendations
        """
        if not user.is_authenticated:
            return RecommendationService.get_trending_recommendations(limit)
        
        # Get user's booking history
        user_bookings = Booking.objects.filter(
            customer=user,
            payment_status='completed'
        ).select_related('event', 'showtime__movie')
        
        if not user_bookings.exists():
            return RecommendationService.get_trending_recommendations(limit)
        
        # Analyze user preferences
        preferences = RecommendationService._analyze_user_preferences(user_bookings)
        
        # Get recommendations based on preferences
        event_recommendations = RecommendationService._get_event_recommendations(
            preferences, limit // 2
        )
        movie_recommendations = RecommendationService._get_movie_recommendations(
            preferences, limit // 2
        )
        
        return {
            'events': event_recommendations,
            'movies': movie_recommendations,
            'preferences': preferences
        }
    
    @staticmethod
    def _analyze_user_preferences(user_bookings):
        """Analyze user preferences from booking history"""
        preferences = {
            'event_categories': {},
            'movie_genres': {},
            'price_ranges': {'events': [], 'movies': []},
            'locations': {'events': [], 'movies': []},
            'time_preferences': {'events': [], 'movies': []}
        }
        
        for booking in user_bookings:
            if booking.booking_type == 'event' and booking.event:
                event = booking.event
                
                # Category preferences
                category = event.category
                preferences['event_categories'][category] = \
                    preferences['event_categories'].get(category, 0) + 1
                
                # Location preferences
                preferences['locations']['events'].append(event.venue)
                
                # Price preferences
                preferences['price_ranges']['events'].append(float(booking.total_amount))
                
                # Time preferences (hour of day)
                preferences['time_preferences']['events'].append(
                    event.start_datetime.hour
                )
            
            elif booking.booking_type == 'movie' and booking.showtime:
                movie = booking.showtime.movie
                
                # Genre preferences
                genre = movie.genre
                preferences['movie_genres'][genre] = \
                    preferences['movie_genres'].get(genre, 0) + 1
                
                # Location preferences
                preferences['locations']['movies'].append(booking.showtime.theater.city)
                
                # Price preferences
                preferences['price_ranges']['movies'].append(float(booking.total_amount))
                
                # Time preferences
                preferences['time_preferences']['movies'].append(
                    booking.showtime.start_time.hour
                )
        
        # Calculate average price ranges
        if preferences['price_ranges']['events']:
            avg_event_price = sum(preferences['price_ranges']['events']) / \
                            len(preferences['price_ranges']['events'])
            preferences['avg_event_price'] = avg_event_price
        
        if preferences['price_ranges']['movies']:
            avg_movie_price = sum(preferences['price_ranges']['movies']) / \
                            len(preferences['price_ranges']['movies'])
            preferences['avg_movie_price'] = avg_movie_price
        
        return preferences
    
    @staticmethod
    def _get_event_recommendations(preferences, limit):
        """Get event recommendations based on user preferences"""
        queryset = Event.objects.filter(
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now()
        ).select_related('owner').prefetch_related('ticket_types')
        
        # Filter by preferred categories
        preferred_categories = list(preferences['event_categories'].keys())
        if preferred_categories:
            queryset = queryset.filter(category__in=preferred_categories)
        
        # Filter by price range (within 50% of user's average)
        if 'avg_event_price' in preferences:
            avg_price = preferences['avg_event_price']
            min_price = avg_price * 0.5
            max_price = avg_price * 1.5
            queryset = queryset.filter(
                ticket_types__price__gte=min_price,
                ticket_types__price__lte=max_price
            ).distinct()
        
        # Add scoring based on preferences
        category_scores = []
        for category, count in preferences['event_categories'].items():
            category_scores.append(
                When(category=category, then=Value(count))
            )
        
        if category_scores:
            queryset = queryset.annotate(
                preference_score=Case(
                    *category_scores,
                    default=Value(0),
                    output_field=IntegerField()
                )
            ).order_by('-preference_score', '-start_datetime')
        else:
            queryset = queryset.order_by('-start_datetime')
        
        return list(queryset[:limit])
    
    @staticmethod
    def _get_movie_recommendations(preferences, limit):
        """Get movie recommendations based on user preferences"""
        queryset = Showtime.objects.filter(
            is_active=True,
            start_time__gt=timezone.now(),
            available_seats__gt=0
        ).select_related('movie', 'theater')
        
        # Filter by preferred genres
        preferred_genres = list(preferences['movie_genres'].keys())
        if preferred_genres:
            queryset = queryset.filter(movie__genre__in=preferred_genres)
        
        # Filter by price range
        if 'avg_movie_price' in preferences:
            avg_price = preferences['avg_movie_price']
            min_price = avg_price * 0.5
            max_price = avg_price * 1.5
            queryset = queryset.filter(
                base_price__gte=min_price,
                base_price__lte=max_price
            )
        
        # Add scoring based on preferences
        genre_scores = []
        for genre, count in preferences['movie_genres'].items():
            genre_scores.append(
                When(movie__genre=genre, then=Value(count))
            )
        
        if genre_scores:
            queryset = queryset.annotate(
                preference_score=Case(
                    *genre_scores,
                    default=Value(0),
                    output_field=IntegerField()
                )
            ).order_by('-preference_score', '-start_time')
        else:
            queryset = queryset.order_by('-start_time')
        
        # Group by movie to avoid duplicates
        seen_movies = set()
        recommendations = []
        for showtime in queryset:
            if showtime.movie.id not in seen_movies:
                recommendations.append(showtime)
                seen_movies.add(showtime.movie.id)
                if len(recommendations) >= limit:
                    break
        
        return recommendations
    
    @staticmethod
    def get_trending_recommendations(limit: int = 10):
        """Get trending events and movies for users without booking history"""
        # Get trending events (most booked in last 7 days)
        trending_events = Event.objects.filter(
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now(),
            bookings__created_at__gte=timezone.now() - timedelta(days=7)
        ).annotate(
            recent_bookings=Count('bookings')
        ).order_by('-recent_bookings')[:limit // 2]
        
        # Get trending movies (most booked showtimes in last 7 days)
        trending_showtimes = Showtime.objects.filter(
            is_active=True,
            start_time__gt=timezone.now(),
            available_seats__gt=0,
            bookings__created_at__gte=timezone.now() - timedelta(days=7)
        ).select_related('movie', 'theater').annotate(
            recent_bookings=Count('bookings')
        ).order_by('-recent_bookings')
        
        # Group by movie to avoid duplicates
        seen_movies = set()
        trending_movies = []
        for showtime in trending_showtimes:
            if showtime.movie.id not in seen_movies:
                trending_movies.append(showtime)
                seen_movies.add(showtime.movie.id)
                if len(trending_movies) >= limit // 2:
                    break
        
        return {
            'events': list(trending_events),
            'movies': trending_movies,
            'preferences': {}
        }
    
    @staticmethod
    def get_similar_events(event, limit: int = 5):
        """Get events similar to the given event"""
        similar_events = Event.objects.filter(
            category=event.category,
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now()
        ).exclude(id=event.id)
        
        # Add location-based similarity (same venue or nearby)
        similar_events = similar_events.annotate(
            location_match=Case(
                When(venue=event.venue, then=Value(2)),
                When(address__icontains=event.venue, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('-location_match', 'start_datetime')
        
        return list(similar_events[:limit])
    
    @staticmethod
    def get_similar_movies(movie, limit: int = 5):
        """Get movies similar to the given movie"""
        # Find showtimes for similar movies
        similar_showtimes = Showtime.objects.filter(
            movie__genre=movie.genre,
            is_active=True,
            start_time__gt=timezone.now(),
            available_seats__gt=0
        ).exclude(movie=movie).select_related('movie', 'theater')
        
        # Add similarity scoring
        similar_showtimes = similar_showtimes.annotate(
            similarity_score=Case(
                When(movie__director=movie.director, then=Value(2)),
                When(movie__rating=movie.rating, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('-similarity_score', 'start_time')
        
        # Group by movie to avoid duplicates
        seen_movies = set()
        recommendations = []
        for showtime in similar_showtimes:
            if showtime.movie.id not in seen_movies:
                recommendations.append(showtime)
                seen_movies.add(showtime.movie.id)
                if len(recommendations) >= limit:
                    break
        
        return recommendations


class GeolocationService:
    """Geolocation-based search for nearby venues"""
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points using Haversine formula
        
        Args:
            lat1, lon1: Latitude and longitude of first point
            lat2, lon2: Latitude and longitude of second point
        
        Returns:
            Distance in kilometers
        """
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r
    
    @staticmethod
    def search_nearby_events(
        latitude: float,
        longitude: float,
        radius_km: float = 50,
        limit: int = 20
    ):
        """
        Search for events near a given location
        
        Note: This is a simplified implementation. In production, you would
        want to use PostGIS or similar for efficient geospatial queries.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius_km: Search radius in kilometers
            limit: Maximum number of results
        
        Returns:
            List of nearby events with distances
        """
        # For now, we'll do a simple text-based location search
        # In production, you'd want to geocode addresses and use spatial queries
        
        events = Event.objects.filter(
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now()
        ).select_related('owner').prefetch_related('ticket_types')
        
        # This is a placeholder implementation
        # In reality, you'd need to:
        # 1. Geocode event addresses to get lat/lon
        # 2. Use spatial database functions for efficient distance queries
        # 3. Store coordinates in the database
        
        nearby_events = []
        for event in events[:limit * 2]:  # Get more to filter by distance
            # Placeholder: assume some events are "nearby"
            # In reality, calculate actual distance
            estimated_distance = abs(hash(event.address) % 100)  # Fake distance
            
            if estimated_distance <= radius_km:
                nearby_events.append({
                    'event': event,
                    'distance_km': estimated_distance
                })
        
        # Sort by distance
        nearby_events.sort(key=lambda x: x['distance_km'])
        
        return nearby_events[:limit]
    
    @staticmethod
    def search_nearby_theaters(
        latitude: float,
        longitude: float,
        radius_km: float = 50,
        limit: int = 20
    ):
        """
        Search for theaters near a given location
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius_km: Search radius in kilometers
            limit: Maximum number of results
        
        Returns:
            List of nearby theaters with distances
        """
        theaters = Theater.objects.filter(
            is_active=True
        ).select_related('owner')
        
        # Placeholder implementation (same as events)
        nearby_theaters = []
        for theater in theaters[:limit * 2]:
            estimated_distance = abs(hash(theater.address) % 100)  # Fake distance
            
            if estimated_distance <= radius_km:
                nearby_theaters.append({
                    'theater': theater,
                    'distance_km': estimated_distance
                })
        
        # Sort by distance
        nearby_theaters.sort(key=lambda x: x['distance_km'])
        
        return nearby_theaters[:limit]


class CategoryBrowsingService:
    """Category-based browsing for events and movies"""
    
    @staticmethod
    def get_event_categories_with_counts():
        """Get all event categories with event counts"""
        categories = Event.objects.filter(
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now()
        ).values('category').annotate(
            count=Count('id'),
            upcoming_count=Count(
                Case(
                    When(start_datetime__gte=timezone.now(), then=1),
                    output_field=IntegerField()
                )
            )
        ).order_by('category')
        
        return list(categories)
    
    @staticmethod
    def get_movie_genres_with_counts():
        """Get all movie genres with showtime counts"""
        genres = Showtime.objects.filter(
            is_active=True,
            start_time__gt=timezone.now(),
            available_seats__gt=0
        ).values('movie__genre').annotate(
            count=Count('id'),
            movie_count=Count('movie', distinct=True)
        ).order_by('movie__genre')
        
        return list(genres)
    
    @staticmethod
    def browse_events_by_category(category: str, limit: int = 20):
        """Browse events by category"""
        events = Event.objects.filter(
            category=category,
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now()
        ).select_related('owner').prefetch_related('ticket_types').annotate(
            booking_count=Count('bookings'),
            min_price=models.Min('ticket_types__price')
        ).order_by('-booking_count', 'start_datetime')
        
        return list(events[:limit])
    
    @staticmethod
    def browse_movies_by_genre(genre: str, limit: int = 20):
        """Browse movies by genre"""
        showtimes = Showtime.objects.filter(
            movie__genre=genre,
            is_active=True,
            start_time__gt=timezone.now(),
            available_seats__gt=0
        ).select_related('movie', 'theater').annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count', 'start_time')
        
        # Group by movie to avoid duplicates
        seen_movies = set()
        movies = []
        for showtime in showtimes:
            if showtime.movie.id not in seen_movies:
                movies.append(showtime)
                seen_movies.add(showtime.movie.id)
                if len(movies) >= limit:
                    break
        
        return movies
    
    @staticmethod
    def get_featured_content():
        """Get featured events and movies for homepage"""
        # Featured events (high booking count, upcoming)
        featured_events = Event.objects.filter(
            status='published',
            is_active=True,
            start_datetime__gt=timezone.now(),
            start_datetime__lte=timezone.now() + timedelta(days=30)
        ).annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')[:6]
        
        # Featured movies (popular, with available showtimes)
        featured_showtimes = Showtime.objects.filter(
            is_active=True,
            start_time__gt=timezone.now(),
            available_seats__gt=0
        ).select_related('movie', 'theater').annotate(
            booking_count=Count('bookings')
        ).order_by('-booking_count')
        
        # Group by movie
        seen_movies = set()
        featured_movies = []
        for showtime in featured_showtimes:
            if showtime.movie.id not in seen_movies:
                featured_movies.append(showtime)
                seen_movies.add(showtime.movie.id)
                if len(featured_movies) >= 6:
                    break
        
        return {
            'events': list(featured_events),
            'movies': featured_movies
        }