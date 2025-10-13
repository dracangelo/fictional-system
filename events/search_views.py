"""
Search and discovery API views
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from decimal import Decimal, InvalidOperation
from typing import List

from .search_services import (
    SearchService, RecommendationService, 
    GeolocationService, CategoryBrowsingService
)
from .serializers import EventListSerializer
from theaters.serializers import ShowtimeListSerializer


class SearchPagination(PageNumberPagination):
    """Custom pagination for search results"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_events(request):
    """
    Advanced event search with filtering
    
    Query Parameters:
    - q: Search query
    - location: Location filter
    - date_from: Start date (YYYY-MM-DD)
    - date_to: End date (YYYY-MM-DD)
    - min_price: Minimum price
    - max_price: Maximum price
    - categories: Comma-separated list of categories
    - min_rating: Minimum rating
    - available_only: true/false
    - sort_by: relevance, date, price_low, price_high, popularity, rating
    - page: Page number
    - page_size: Results per page
    """
    try:
        # Extract query parameters
        query = request.GET.get('q', '').strip()
        location = request.GET.get('location', '').strip()
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        sort_by = request.GET.get('sort_by', 'relevance')
        available_only = request.GET.get('available_only', 'true').lower() == 'true'
        
        # Parse price filters
        min_price = None
        max_price = None
        try:
            if request.GET.get('min_price'):
                min_price = Decimal(request.GET.get('min_price'))
            if request.GET.get('max_price'):
                max_price = Decimal(request.GET.get('max_price'))
        except (InvalidOperation, ValueError):
            return Response(
                {'error': 'Invalid price format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse categories
        categories = None
        if request.GET.get('categories'):
            categories = [cat.strip() for cat in request.GET.get('categories').split(',')]
        
        # Parse rating
        min_rating = None
        try:
            if request.GET.get('min_rating'):
                min_rating = float(request.GET.get('min_rating'))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid rating format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform search
        events = SearchService.search_events(
            query=query or None,
            location=location or None,
            date_from=date_from,
            date_to=date_to,
            min_price=min_price,
            max_price=max_price,
            categories=categories,
            min_rating=min_rating,
            available_only=available_only,
            sort_by=sort_by
        )
        
        # Paginate results
        paginator = SearchPagination()
        page = paginator.paginate_queryset(events, request)
        
        if page is not None:
            serializer = EventListSerializer(page, many=True)
            return paginator.get_paginated_response({
                'results': serializer.data,
                'search_params': {
                    'query': query,
                    'location': location,
                    'date_from': date_from,
                    'date_to': date_to,
                    'min_price': str(min_price) if min_price else None,
                    'max_price': str(max_price) if max_price else None,
                    'categories': categories,
                    'min_rating': min_rating,
                    'available_only': available_only,
                    'sort_by': sort_by
                }
            })
        
        serializer = EventListSerializer(events, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data),
            'search_params': {
                'query': query,
                'location': location,
                'date_from': date_from,
                'date_to': date_to,
                'min_price': str(min_price) if min_price else None,
                'max_price': str(max_price) if max_price else None,
                'categories': categories,
                'min_rating': min_rating,
                'available_only': available_only,
                'sort_by': sort_by
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Search failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_movies(request):
    """
    Advanced movie search with filtering
    
    Query Parameters:
    - q: Search query
    - location: Location filter (theater location)
    - date_from: Start date (YYYY-MM-DD)
    - date_to: End date (YYYY-MM-DD)
    - min_price: Minimum price
    - max_price: Maximum price
    - genres: Comma-separated list of genres
    - ratings: Comma-separated list of ratings (G, PG, R, etc.)
    - min_rating: Minimum user rating
    - available_only: true/false
    - sort_by: relevance, date, price_low, price_high, popularity, rating
    - page: Page number
    - page_size: Results per page
    """
    try:
        # Extract query parameters
        query = request.GET.get('q', '').strip()
        location = request.GET.get('location', '').strip()
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        sort_by = request.GET.get('sort_by', 'relevance')
        available_only = request.GET.get('available_only', 'true').lower() == 'true'
        
        # Parse price filters
        min_price = None
        max_price = None
        try:
            if request.GET.get('min_price'):
                min_price = Decimal(request.GET.get('min_price'))
            if request.GET.get('max_price'):
                max_price = Decimal(request.GET.get('max_price'))
        except (InvalidOperation, ValueError):
            return Response(
                {'error': 'Invalid price format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse genres and ratings
        genres = None
        if request.GET.get('genres'):
            genres = [genre.strip() for genre in request.GET.get('genres').split(',')]
        
        ratings = None
        if request.GET.get('ratings'):
            ratings = [rating.strip() for rating in request.GET.get('ratings').split(',')]
        
        # Parse user rating
        min_rating = None
        try:
            if request.GET.get('min_rating'):
                min_rating = float(request.GET.get('min_rating'))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid rating format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform search
        showtimes = SearchService.search_movies(
            query=query or None,
            location=location or None,
            date_from=date_from,
            date_to=date_to,
            min_price=min_price,
            max_price=max_price,
            genres=genres,
            ratings=ratings,
            min_rating=min_rating,
            available_only=available_only,
            sort_by=sort_by
        )
        
        # Paginate results
        paginator = SearchPagination()
        page = paginator.paginate_queryset(showtimes, request)
        
        if page is not None:
            serializer = ShowtimeListSerializer(page, many=True)
            return paginator.get_paginated_response({
                'results': serializer.data,
                'search_params': {
                    'query': query,
                    'location': location,
                    'date_from': date_from,
                    'date_to': date_to,
                    'min_price': str(min_price) if min_price else None,
                    'max_price': str(max_price) if max_price else None,
                    'genres': genres,
                    'ratings': ratings,
                    'min_rating': min_rating,
                    'available_only': available_only,
                    'sort_by': sort_by
                }
            })
        
        serializer = ShowtimeListSerializer(showtimes, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data),
            'search_params': {
                'query': query,
                'location': location,
                'date_from': date_from,
                'date_to': date_to,
                'min_price': str(min_price) if min_price else None,
                'max_price': str(max_price) if max_price else None,
                'genres': genres,
                'ratings': ratings,
                'min_rating': min_rating,
                'available_only': available_only,
                'sort_by': sort_by
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Search failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
def get_popular_searches(request):
    """Get popular search terms and categories"""
    try:
        popular_data = SearchService.get_popular_searches()
        return Response(popular_data)
    except Exception as e:
        return Response(
            {'error': f'Failed to get popular searches: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def get_recommendations(request):
    """Get personalized recommendations for the user"""
    try:
        limit = int(request.GET.get('limit', 10))
        limit = min(limit, 50)  # Cap at 50
        
        recommendations = RecommendationService.get_user_recommendations(
            request.user, limit
        )
        
        # Serialize the recommendations
        event_serializer = EventListSerializer(recommendations['events'], many=True)
        showtime_serializer = ShowtimeListSerializer(recommendations['movies'], many=True)
        
        return Response({
            'events': event_serializer.data,
            'movies': showtime_serializer.data,
            'preferences': recommendations['preferences']
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get recommendations: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_nearby(request):
    """
    Search for nearby events and theaters
    
    Query Parameters:
    - lat: Latitude
    - lon: Longitude
    - radius: Search radius in kilometers (default: 50)
    - type: 'events', 'theaters', or 'both' (default: 'both')
    """
    try:
        # Get location parameters
        try:
            latitude = float(request.GET.get('lat'))
            longitude = float(request.GET.get('lon'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'Valid latitude and longitude are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        radius = float(request.GET.get('radius', 50))
        search_type = request.GET.get('type', 'both')
        
        results = {}
        
        if search_type in ['events', 'both']:
            nearby_events = GeolocationService.search_nearby_events(
                latitude, longitude, radius
            )
            # Serialize events
            events_data = []
            for item in nearby_events:
                event_data = EventListSerializer(item['event']).data
                event_data['distance_km'] = item['distance_km']
                events_data.append(event_data)
            results['events'] = events_data
        
        if search_type in ['theaters', 'both']:
            nearby_theaters = GeolocationService.search_nearby_theaters(
                latitude, longitude, radius
            )
            # Serialize theaters
            from theaters.serializers import TheaterListSerializer
            theaters_data = []
            for item in nearby_theaters:
                theater_data = TheaterListSerializer(item['theater']).data
                theater_data['distance_km'] = item['distance_km']
                theaters_data.append(theater_data)
            results['theaters'] = theaters_data
        
        return Response({
            'location': {
                'latitude': latitude,
                'longitude': longitude,
                'radius_km': radius
            },
            'results': results
        })
        
    except Exception as e:
        return Response(
            {'error': f'Nearby search failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@method_decorator(cache_page(60 * 30))  # Cache for 30 minutes
def browse_categories(request):
    """Get all categories with counts for browsing"""
    try:
        event_categories = CategoryBrowsingService.get_event_categories_with_counts()
        movie_genres = CategoryBrowsingService.get_movie_genres_with_counts()
        
        return Response({
            'event_categories': event_categories,
            'movie_genres': movie_genres
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get categories: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def browse_by_category(request, category_type, category_name):
    """
    Browse events or movies by category
    
    URL Parameters:
    - category_type: 'events' or 'movies'
    - category_name: The category/genre name
    
    Query Parameters:
    - limit: Number of results (default: 20, max: 100)
    """
    try:
        limit = int(request.GET.get('limit', 20))
        limit = min(limit, 100)  # Cap at 100
        
        if category_type == 'events':
            results = CategoryBrowsingService.browse_events_by_category(
                category_name, limit
            )
            serializer = EventListSerializer(results, many=True)
        elif category_type == 'movies':
            results = CategoryBrowsingService.browse_movies_by_genre(
                category_name, limit
            )
            serializer = ShowtimeListSerializer(results, many=True)
        else:
            return Response(
                {'error': 'Invalid category type. Use "events" or "movies"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'category_type': category_type,
            'category_name': category_name,
            'results': serializer.data,
            'count': len(serializer.data)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Browse failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
def get_featured_content(request):
    """Get featured events and movies for homepage"""
    try:
        featured = CategoryBrowsingService.get_featured_content()
        
        event_serializer = EventListSerializer(featured['events'], many=True)
        showtime_serializer = ShowtimeListSerializer(featured['movies'], many=True)
        
        return Response({
            'events': event_serializer.data,
            'movies': showtime_serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get featured content: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_similar_content(request, content_type, content_id):
    """
    Get similar events or movies
    
    URL Parameters:
    - content_type: 'events' or 'movies'
    - content_id: The event or movie ID
    
    Query Parameters:
    - limit: Number of results (default: 5, max: 20)
    """
    try:
        limit = int(request.GET.get('limit', 5))
        limit = min(limit, 20)  # Cap at 20
        
        if content_type == 'events':
            from .models import Event
            try:
                event = Event.objects.get(id=content_id)
                results = RecommendationService.get_similar_events(event, limit)
                serializer = EventListSerializer(results, many=True)
            except Event.DoesNotExist:
                return Response(
                    {'error': 'Event not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        elif content_type == 'movies':
            from theaters.models import Movie
            try:
                movie = Movie.objects.get(id=content_id)
                results = RecommendationService.get_similar_movies(movie, limit)
                serializer = ShowtimeListSerializer(results, many=True)
            except Movie.DoesNotExist:
                return Response(
                    {'error': 'Movie not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Invalid content type. Use "events" or "movies"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'content_type': content_type,
            'content_id': content_id,
            'results': serializer.data,
            'count': len(serializer.data)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Similar content search failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )