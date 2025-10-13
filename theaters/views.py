from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Avg, F
from django.db.models.functions import TruncDate, TruncMonth, Extract
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal

from movie_booking_app.cached_views import (
    CachedViewMixin, PerformanceMonitoringMixin, OptimizedQuerysetMixin,
    cache_search_results, cache_analytics, cache_list_view, cache_detail_view
)
from movie_booking_app.cache_utils import monitor_query_performance

from .models import Theater, Movie, Showtime
from .serializers import (
    TheaterListSerializer, TheaterDetailSerializer, TheaterCreateUpdateSerializer,
    TheaterAnalyticsSerializer, MovieSerializer, ShowtimeListSerializer,
    ShowtimeDetailSerializer, ShowtimeCreateUpdateSerializer, ShowtimePricingSerializer
)
from users.permissions import IsTheaterOwner, IsOwnerOrReadOnly, CanManageOwnContent


class TheaterViewSet(CachedViewMixin, PerformanceMonitoringMixin,
                     OptimizedQuerysetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing theaters with seating layout management
    """
    queryset = Theater.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'state', 'screens', 'is_active']
    search_fields = ['name', 'address', 'city', 'state']
    ordering_fields = ['name', 'city', 'screens', 'created_at']
    ordering = ['name']
    
    # Caching configuration
    cache_timeout = 1800  # 30 minutes for theaters
    cache_key_prefix = 'theaters'
    cache_per_user = False
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TheaterListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TheaterCreateUpdateSerializer
        else:
            return TheaterDetailSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsTheaterOwner]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
        elif self.action in ['analytics', 'seating_layout']:
            permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
        else:
            permission_classes = [permissions.AllowAny]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and request parameters"""
        queryset = Theater.objects.select_related('owner').prefetch_related('showtimes')
        
        # Filter by location
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(
                Q(city__icontains=location) | 
                Q(state__icontains=location) | 
                Q(address__icontains=location)
            )
        
        # Filter by amenities
        amenities = self.request.query_params.get('amenities', None)
        if amenities:
            amenity_list = [a.strip() for a in amenities.split(',')]
            for amenity in amenity_list:
                queryset = queryset.filter(amenities__contains=[amenity])
        
        # Owner-based filtering for management views
        if self.action in ['analytics', 'seating_layout'] or \
           self.request.query_params.get('my_theaters', None):
            if self.request.user.is_authenticated:
                if hasattr(self.request.user, 'profile') and \
                   self.request.user.profile.role == 'admin':
                    # Admins can see all theaters
                    pass
                else:
                    # Theater owners can only see their own theaters
                    queryset = queryset.filter(owner=self.request.user)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics data for a specific theater"""
        theater = self.get_object()
        
        # Import here to avoid circular imports
        from bookings.models import Booking, Ticket
        
        # Basic theater metrics
        total_screens = theater.screens
        total_seats = theater.get_total_seats()
        
        # Showtime metrics
        total_showtimes = theater.showtimes.count()
        upcoming_showtimes = theater.showtimes.filter(
            start_time__gt=timezone.now(),
            is_active=True
        ).count()
        
        # Booking and revenue metrics
        theater_bookings = Booking.objects.filter(showtime__theater=theater)
        total_bookings = theater_bookings.count()
        
        total_revenue = Ticket.objects.filter(
            booking__showtime__theater=theater,
            booking__payment_status='completed'
        ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
        
        # Calculate average occupancy
        completed_showtimes = theater.showtimes.filter(
            end_time__lt=timezone.now(),
            is_active=True
        )
        
        if completed_showtimes.exists():
            total_capacity = sum(st.total_seats for st in completed_showtimes)
            total_sold = sum(st.seats_booked for st in completed_showtimes)
            average_occupancy = (total_sold / total_capacity * 100) if total_capacity > 0 else 0
        else:
            average_occupancy = 0
        
        # Occupancy by screen
        occupancy_by_screen = {}
        for screen_num in range(1, total_screens + 1):
            screen_showtimes = completed_showtimes.filter(screen_number=screen_num)
            if screen_showtimes.exists():
                screen_capacity = sum(st.total_seats for st in screen_showtimes)
                screen_sold = sum(st.seats_booked for st in screen_showtimes)
                occupancy_by_screen[f'Screen {screen_num}'] = (
                    (screen_sold / screen_capacity * 100) if screen_capacity > 0 else 0
                )
            else:
                occupancy_by_screen[f'Screen {screen_num}'] = 0
        
        # Revenue by month (last 12 months)
        twelve_months_ago = timezone.now() - timedelta(days=365)
        revenue_by_month = list(
            Ticket.objects.filter(
                booking__showtime__theater=theater,
                booking__payment_status='completed',
                booking__created_at__gte=twelve_months_ago
            ).extra(
                select={'month': 'EXTRACT(month FROM booking__created_at)',
                       'year': 'EXTRACT(year FROM booking__created_at)'}
            ).values('month', 'year').annotate(
                revenue=Sum('price')
            ).order_by('year', 'month')
        )
        
        # Popular movies (top 10 by tickets sold)
        popular_movies = list(
            Ticket.objects.filter(
                booking__showtime__theater=theater,
                booking__payment_status='completed'
            ).values(
                'booking__showtime__movie__title'
            ).annotate(
                tickets_sold=Count('id'),
                revenue=Sum('price')
            ).order_by('-tickets_sold')[:10]
        )
        
        # Peak hours analysis
        peak_hours = {}
        for hour in range(24):
            hour_bookings = theater_bookings.filter(
                showtime__start_time__hour=hour
            ).count()
            peak_hours[f'{hour:02d}:00'] = hour_bookings
        
        analytics_data = {
            'theater_id': theater.id,
            'theater_name': theater.name,
            'total_screens': total_screens,
            'total_seats': total_seats,
            'total_showtimes': total_showtimes,
            'upcoming_showtimes': upcoming_showtimes,
            'total_bookings': total_bookings,
            'total_revenue': total_revenue,
            'average_occupancy': round(average_occupancy, 2),
            'occupancy_by_screen': occupancy_by_screen,
            'revenue_by_month': revenue_by_month,
            'popular_movies': popular_movies,
            'peak_hours': peak_hours,
        }
        
        serializer = TheaterAnalyticsSerializer(analytics_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get', 'put'])
    def seating_layout(self, request, pk=None):
        """Manage seating layout for a theater"""
        theater = self.get_object()
        
        if request.method == 'GET':
            return Response({
                'theater_id': theater.id,
                'theater_name': theater.name,
                'screens': theater.screens,
                'seating_layout': theater.seating_layout,
                'total_seats': theater.get_total_seats()
            })
        
        elif request.method == 'PUT':
            seating_layout = request.data.get('seating_layout')
            if not seating_layout:
                return Response(
                    {'error': 'Seating layout is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate seating layout
            serializer = TheaterCreateUpdateSerializer(
                theater, data={'seating_layout': seating_layout}, partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'Seating layout updated successfully',
                    'theater_id': theater.id,
                    'seating_layout': theater.seating_layout,
                    'total_seats': theater.get_total_seats()
                })
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def showtimes(self, request, pk=None):
        """Get showtimes for a specific theater"""
        theater = self.get_object()
        
        # Filter parameters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        screen_number = request.query_params.get('screen_number')
        movie_id = request.query_params.get('movie_id')
        
        queryset = theater.showtimes.select_related('movie').filter(is_active=True)
        
        if date_from:
            queryset = queryset.filter(start_time__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_time__date__lte=date_to)
        if screen_number:
            queryset = queryset.filter(screen_number=screen_number)
        if movie_id:
            queryset = queryset.filter(movie_id=movie_id)
        
        queryset = queryset.order_by('start_time')
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ShowtimeListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ShowtimeListSerializer(queryset, many=True)
        return Response(serializer.data)


class MovieViewSet(CachedViewMixin, PerformanceMonitoringMixin,
                   OptimizedQuerysetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing movies with CRUD operations
    """
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['genre', 'rating', 'language', 'is_active']
    search_fields = ['title', 'description', 'director', 'cast']
    ordering_fields = ['title', 'release_date', 'duration', 'created_at']
    ordering = ['-release_date']
    
    # Caching configuration
    cache_timeout = 3600  # 1 hour for movies
    cache_key_prefix = 'movies'
    cache_per_user = False
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.AllowAny]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on request parameters"""
        queryset = Movie.objects.all()
        
        # Filter by release year
        release_year = self.request.query_params.get('release_year')
        if release_year:
            queryset = queryset.filter(release_date__year=release_year)
        
        # Filter by duration range
        min_duration = self.request.query_params.get('min_duration')
        max_duration = self.request.query_params.get('max_duration')
        
        if min_duration:
            queryset = queryset.filter(duration__gte=min_duration)
        if max_duration:
            queryset = queryset.filter(duration__lte=max_duration)
        
        # Filter by upcoming releases
        upcoming_only = self.request.query_params.get('upcoming_only')
        if upcoming_only and upcoming_only.lower() == 'true':
            queryset = queryset.filter(release_date__gt=timezone.now().date())
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def showtimes(self, request, pk=None):
        """Get showtimes for a specific movie"""
        movie = self.get_object()
        
        # Filter parameters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        theater_id = request.query_params.get('theater_id')
        city = request.query_params.get('city')
        
        queryset = movie.showtimes.select_related('theater').filter(is_active=True)
        
        if date_from:
            queryset = queryset.filter(start_time__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_time__date__lte=date_to)
        if theater_id:
            queryset = queryset.filter(theater_id=theater_id)
        if city:
            queryset = queryset.filter(theater__city__icontains=city)
        
        queryset = queryset.order_by('start_time')
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ShowtimeListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ShowtimeListSerializer(queryset, many=True)
        return Response(serializer.data)


class ShowtimeViewSet(CachedViewMixin, PerformanceMonitoringMixin,
                      OptimizedQuerysetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing showtimes with conflict detection and validation
    """
    queryset = Showtime.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['theater', 'movie', 'screen_number', 'is_active']
    search_fields = ['movie__title', 'theater__name']
    ordering_fields = ['start_time', 'base_price', 'created_at']
    ordering = ['start_time']
    
    # Caching configuration
    cache_timeout = 300  # 5 minutes for showtimes (frequently changing)
    cache_key_prefix = 'showtimes'
    cache_per_user = False
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ShowtimeListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ShowtimeCreateUpdateSerializer
        else:
            return ShowtimeDetailSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
        elif self.action in ['pricing', 'availability']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.AllowAny]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and request parameters"""
        queryset = Showtime.objects.select_related('theater', 'movie')
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(start_time__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_time__date__lte=date_to)
        
        # Filter by time of day
        time_from = self.request.query_params.get('time_from')
        time_to = self.request.query_params.get('time_to')
        
        if time_from:
            queryset = queryset.filter(start_time__time__gte=time_from)
        if time_to:
            queryset = queryset.filter(start_time__time__lte=time_to)
        
        # Filter by availability
        available_only = self.request.query_params.get('available_only')
        if available_only and available_only.lower() == 'true':
            queryset = queryset.filter(available_seats__gt=0)
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(base_price__gte=min_price)
        if max_price:
            queryset = queryset.filter(base_price__lte=max_price)
        
        # Owner-based filtering for management views
        if self.action in ['update', 'partial_update', 'destroy']:
            if self.request.user.is_authenticated:
                if hasattr(self.request.user, 'profile') and \
                   self.request.user.profile.role == 'admin':
                    # Admins can manage all showtimes
                    pass
                else:
                    # Theater owners can only manage their own theater's showtimes
                    queryset = queryset.filter(theater__owner=self.request.user)
        
        return queryset
    
    @action(detail=True, methods=['get', 'post'])
    def pricing(self, request, pk=None):
        """Manage dynamic pricing for different time slots and seat categories"""
        showtime = self.get_object()
        
        if request.method == 'GET':
            # Get current pricing configuration
            pricing_data = []
            
            # Base pricing
            pricing_data.append({
                'time_slot': 'base',
                'price_multiplier': 1.0,
                'seat_category': 'regular',
                'base_price': showtime.base_price,
                'final_price': showtime.base_price
            })
            
            # Seat category pricing
            if showtime.seat_pricing:
                for category, config in showtime.seat_pricing.items():
                    pricing_data.append({
                        'time_slot': 'base',
                        'price_multiplier': float(config.get('price', showtime.base_price)) / float(showtime.base_price),
                        'seat_category': category,
                        'base_price': showtime.base_price,
                        'final_price': config.get('price', showtime.base_price)
                    })
            
            serializer = ShowtimePricingSerializer(pricing_data, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Update pricing configuration
            pricing_config = request.data.get('seat_pricing', {})
            
            # Validate pricing configuration
            serializer = ShowtimeCreateUpdateSerializer(
                showtime, 
                data={'seat_pricing': pricing_config}, 
                partial=True,
                context={'request': request}
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'Pricing updated successfully',
                    'showtime_id': showtime.id,
                    'seat_pricing': showtime.seat_pricing
                })
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        """Get seat availability for a showtime"""
        showtime = self.get_object()
        
        # Get theater seating configuration
        screen_config = showtime.theater.get_screen_configuration(showtime.screen_number)
        
        if not screen_config:
            return Response(
                {'error': 'Screen configuration not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate seat map with availability
        seat_map = []
        booked_seats = set(showtime.booked_seats)
        
        for row in range(1, screen_config['rows'] + 1):
            row_letter = chr(ord('A') + row - 1)
            row_seats = []
            
            for seat in range(1, screen_config['seats_per_row'] + 1):
                seat_id = f"{row_letter}{seat}"
                seat_price = showtime.get_seat_price(seat_id)
                
                row_seats.append({
                    'seat_id': seat_id,
                    'row': row_letter,
                    'seat_number': seat,
                    'is_available': seat_id not in booked_seats,
                    'price': float(seat_price),
                    'category': 'vip' if row in screen_config.get('vip_rows', []) else 'regular'
                })
            
            seat_map.append({
                'row': row_letter,
                'seats': row_seats
            })
        
        return Response({
            'showtime_id': showtime.id,
            'theater_name': showtime.theater.name,
            'movie_title': showtime.movie.title,
            'screen_number': showtime.screen_number,
            'start_time': showtime.start_time,
            'total_seats': showtime.total_seats,
            'available_seats': showtime.available_seats,
            'seat_map': seat_map
        })
    
    def perform_create(self, serializer):
        """Custom create logic with conflict detection"""
        # The serializer validation already handles conflict detection
        # through the model's clean() method
        serializer.save()
    
    def perform_update(self, serializer):
        """Custom update logic with conflict detection"""
        # The serializer validation already handles conflict detection
        # through the model's clean() method
        serializer.save()