from rest_framework import viewsets, status, permissions, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Avg, F
from django.db.models.functions import TruncDate
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import Event, TicketType, Discount
from .serializers import (
    EventListSerializer, EventDetailSerializer, EventCreateUpdateSerializer,
    EventAnalyticsSerializer, EventStatusUpdateSerializer,
    TicketTypeSerializer, DiscountSerializer, DiscountAnalyticsSerializer,
    PromoCodeValidationSerializer, PriceCalculationSerializer
)
from .services import DiscountService, BookingPriceCalculator
from users.permissions import IsEventOwner, IsOwnerOrReadOnly, CanManageOwnContent


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events with CRUD operations and owner-based filtering
    """
    queryset = Event.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'is_active']
    search_fields = ['title', 'description', 'venue', 'address']
    ordering_fields = ['start_datetime', 'created_at', 'title']
    ordering = ['-start_datetime']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return EventListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EventCreateUpdateSerializer
        else:
            return EventDetailSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsEventOwner]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
        elif self.action in ['analytics', 'update_status', 'discount_analytics']:
            permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
        elif self.action in ['discounts'] and self.request and self.request.method == 'POST':
            permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
        else:
            permission_classes = [permissions.AllowAny]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and request parameters"""
        queryset = Event.objects.select_related('owner').prefetch_related(
            'ticket_types', 'discounts'
        )
        
        # Apply search functionality
        search_query = self.request.query_params.get('search', None)
        if search_query:
            # Use PostgreSQL full-text search if available, otherwise use icontains
            try:
                # PostgreSQL full-text search
                search_vector = SearchVector('title', weight='A') + \
                               SearchVector('description', weight='B') + \
                               SearchVector('venue', weight='C') + \
                               SearchVector('address', weight='D')
                search_query_obj = SearchQuery(search_query)
                queryset = queryset.annotate(
                    search=search_vector,
                    rank=SearchRank(search_vector, search_query_obj)
                ).filter(search=search_query_obj).order_by('-rank', '-start_datetime')
            except:
                # Fallback to icontains search for SQLite
                queryset = queryset.filter(
                    Q(title__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(venue__icontains=search_query) |
                    Q(address__icontains=search_query)
                )
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            queryset = queryset.filter(start_datetime__gte=start_date)
        if end_date:
            queryset = queryset.filter(end_datetime__lte=end_date)
        
        # Filter by location (venue or address)
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(
                Q(venue__icontains=location) | Q(address__icontains=location)
            )
        
        # Filter by price range (based on ticket types)
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        
        if min_price:
            queryset = queryset.filter(ticket_types__price__gte=min_price).distinct()
        if max_price:
            queryset = queryset.filter(ticket_types__price__lte=max_price).distinct()
        
        # Filter by availability
        available_only = self.request.query_params.get('available_only', None)
        if available_only and available_only.lower() == 'true':
            queryset = queryset.filter(
                ticket_types__quantity_sold__lt=F('ticket_types__quantity_available')
            ).distinct()
        
        # Owner-based filtering for management views
        if self.action in ['analytics', 'update_status'] or \
           self.request.query_params.get('my_events', None):
            if self.request.user.is_authenticated:
                if hasattr(self.request.user, 'profile') and \
                   self.request.user.profile.role == 'admin':
                    # Admins can see all events
                    pass
                else:
                    # Event owners can only see their own events
                    queryset = queryset.filter(owner=self.request.user)
        
        # Filter by upcoming/past events
        time_filter = self.request.query_params.get('time_filter', None)
        if time_filter == 'upcoming':
            queryset = queryset.filter(start_datetime__gt=timezone.now())
        elif time_filter == 'past':
            queryset = queryset.filter(end_datetime__lt=timezone.now())
        elif time_filter == 'ongoing':
            now = timezone.now()
            queryset = queryset.filter(
                start_datetime__lte=now,
                end_datetime__gte=now
            )
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics data for a specific event"""
        event = self.get_object()
        
        # Import here to avoid circular imports
        from bookings.models import Booking, Ticket
        
        # Basic analytics
        total_bookings = Booking.objects.filter(event=event).count()
        total_tickets_sold = Ticket.objects.filter(
            booking__event=event
        ).count()
        
        # Revenue calculation
        total_revenue = Ticket.objects.filter(
            booking__event=event,
            booking__payment_status='completed'
        ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
        
        # Tickets by type
        tickets_by_type = {}
        revenue_by_type = {}
        
        for ticket_type in event.ticket_types.all():
            sold_count = Ticket.objects.filter(
                ticket_type=ticket_type,
                booking__payment_status='completed'
            ).count()
            
            revenue = Ticket.objects.filter(
                ticket_type=ticket_type,
                booking__payment_status='completed'
            ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
            
            tickets_by_type[ticket_type.name] = sold_count
            revenue_by_type[ticket_type.name] = float(revenue)
        
        # Booking trends (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        booking_trends = list(
            Booking.objects.filter(
                event=event,
                created_at__gte=thirty_days_ago
            ).extra(
                select={'day': 'date(created_at)'}
            ).values('day').annotate(
                bookings=Count('id')
            ).order_by('day')
        )
        
        # Days until event
        days_until_event = (event.start_datetime.date() - timezone.now().date()).days
        
        analytics_data = {
            'event_id': event.id,
            'event_title': event.title,
            'total_bookings': total_bookings,
            'total_tickets_sold': total_tickets_sold,
            'total_revenue': total_revenue,
            'tickets_by_type': tickets_by_type,
            'revenue_by_type': revenue_by_type,
            'booking_trends': booking_trends,
            'status': event.status,
            'days_until_event': days_until_event,
        }
        
        serializer = EventAnalyticsSerializer(analytics_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update event status with validation"""
        event = self.get_object()
        serializer = EventStatusUpdateSerializer(
            event, data=request.data, partial=True
        )
        
        if serializer.is_valid():
            new_status = serializer.validated_data['status']
            reason = serializer.validated_data.get('reason', '')
            
            # Update event status
            event.status = new_status
            event.save()
            
            # Log status change (you might want to create an audit log model)
            # For now, we'll just return the updated event
            
            response_serializer = EventDetailSerializer(event)
            return Response({
                'message': f'Event status updated to {new_status}',
                'reason': reason,
                'event': response_serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get', 'post'])
    def ticket_types(self, request, pk=None):
        """Manage ticket types for an event"""
        event = self.get_object()
        
        if request.method == 'GET':
            ticket_types = event.ticket_types.all()
            serializer = TicketTypeSerializer(ticket_types, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = TicketTypeSerializer(
                data=request.data,
                context={'event': event, 'request': request}
            )
            if serializer.is_valid():
                serializer.save(event=event)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get', 'post'])
    def discounts(self, request, pk=None):
        """Manage discounts for an event"""
        event = self.get_object()
        
        if request.method == 'GET':
            discounts = event.discounts.all()
            serializer = DiscountSerializer(discounts, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = DiscountSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(event=event)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def validate_promo_code(self, request, pk=None):
        """Validate a promo code for an event"""
        event = self.get_object()
        serializer = PromoCodeValidationSerializer(data=request.data)
        
        if serializer.is_valid():
            promo_code = serializer.validated_data['promo_code']
            discount, message = DiscountService.validate_promo_code(event, promo_code)
            
            if discount:
                return Response({
                    'valid': True,
                    'message': message,
                    'discount': DiscountSerializer(discount).data
                })
            else:
                return Response({
                    'valid': False,
                    'message': message,
                    'discount': None
                })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def calculate_price(self, request, pk=None):
        """Calculate booking price with discounts"""
        event = self.get_object()
        serializer = PriceCalculationSerializer(data=request.data)
        
        if serializer.is_valid():
            ticket_selections = serializer.validated_data['ticket_selections']
            promo_code = serializer.validated_data.get('promo_code')
            
            try:
                price_breakdown = BookingPriceCalculator.calculate_booking_price(
                    ticket_selections, event, promo_code
                )
                return Response(price_breakdown)
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def discount_analytics(self, request, pk=None):
        """Get discount analytics for an event"""
        event = self.get_object()
        analytics_data = DiscountService.get_discount_analytics(event)
        serializer = DiscountAnalyticsSerializer(analytics_data)
        return Response(serializer.data)


class TicketTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ticket types within event context
    """
    queryset = TicketType.objects.all()
    serializer_class = TicketTypeSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
    
    def get_queryset(self):
        """Filter ticket types based on event ownership"""
        queryset = TicketType.objects.select_related('event')
        
        if self.request.user.is_authenticated:
            if hasattr(self.request.user, 'profile') and \
               self.request.user.profile.role == 'admin':
                return queryset
            else:
                return queryset.filter(event__owner=self.request.user)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Ensure ticket type is created for user's event"""
        event_id = self.request.data.get('event_id')
        if event_id:
            try:
                event = Event.objects.get(id=event_id, owner=self.request.user)
                serializer.save(event=event)
            except Event.DoesNotExist:
                raise serializers.ValidationError("Event not found or not owned by user")
        else:
            raise serializers.ValidationError("Event ID is required")


class DiscountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing discounts within event context
    """
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageOwnContent]
    
    def get_queryset(self):
        """Filter discounts based on event ownership"""
        queryset = Discount.objects.select_related('event')
        
        if self.request.user.is_authenticated:
            if hasattr(self.request.user, 'profile') and \
               self.request.user.profile.role == 'admin':
                return queryset
            else:
                return queryset.filter(event__owner=self.request.user)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Ensure discount is created for user's event"""
        event_id = self.request.data.get('event_id')
        if event_id:
            try:
                event = Event.objects.get(id=event_id, owner=self.request.user)
                serializer.save(event=event)
            except Event.DoesNotExist:
                raise serializers.ValidationError("Event not found or not owned by user")
        else:
            raise serializers.ValidationError("Event ID is required")
