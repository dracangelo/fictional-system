from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from decimal import Decimal
from datetime import datetime, timedelta

from movie_booking_app.cached_views import (
    CachedViewMixin, PerformanceMonitoringMixin, OptimizedQuerysetMixin,
    cache_analytics
)
from movie_booking_app.cache_utils import monitor_query_performance

from .models import Booking, Ticket, CustomerReview, WaitlistEntry
from .serializers import (
    BookingListSerializer, BookingDetailSerializer, BookingCancellationSerializer,
    CustomerReviewSerializer, WaitlistEntrySerializer, BookingHistoryFilterSerializer,
    BookingAnalyticsSerializer, TicketSerializer
)
from .booking_service import BookingService
from .payment_service import PaymentService
from events.models import Event, TicketType
from theaters.models import Showtime


class BookingFilter(filters.FilterSet):
    """Filter for booking queries"""
    booking_type = filters.ChoiceFilter(choices=Booking.BOOKING_TYPES)
    payment_status = filters.ChoiceFilter(choices=Booking.PAYMENT_STATUS_CHOICES)
    booking_status = filters.ChoiceFilter(choices=Booking.BOOKING_STATUS_CHOICES)
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    min_amount = filters.NumberFilter(field_name='total_amount', lookup_expr='gte')
    max_amount = filters.NumberFilter(field_name='total_amount', lookup_expr='lte')
    event_title = filters.CharFilter(field_name='event__title', lookup_expr='icontains')
    movie_title = filters.CharFilter(field_name='showtime__movie__title', lookup_expr='icontains')
    
    class Meta:
        model = Booking
        fields = [
            'booking_type', 'payment_status', 'booking_status',
            'date_from', 'date_to', 'min_amount', 'max_amount',
            'event_title', 'movie_title'
        ]


class BookingPagination(PageNumberPagination):
    """Custom pagination for bookings"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class CustomerBookingViewSet(CachedViewMixin, PerformanceMonitoringMixin,
                             OptimizedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for customer booking management"""
    
    serializer_class = BookingListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BookingFilter
    pagination_class = BookingPagination
    
    # Caching configuration
    cache_timeout = 300  # 5 minutes for customer bookings
    cache_key_prefix = 'customer_bookings'
    cache_per_user = True  # Cache per user since it's user-specific data
    
    def get_queryset(self):
        """Get bookings for the current user"""
        return Booking.objects.filter(
            customer=self.request.user
        ).select_related(
            'event', 'showtime__movie', 'showtime__theater'
        ).prefetch_related('tickets')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return BookingDetailSerializer
        return BookingListSerializer
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a booking with optional refund"""
        booking = self.get_object()
        
        # Validate cancellation request
        serializer = BookingCancellationSerializer(
            data=request.data,
            context={'booking': booking}
        )
        serializer.is_valid(raise_exception=True)
        
        try:
            # Process cancellation
            result = BookingService.cancel_booking(
                booking=booking,
                reason=serializer.validated_data.get('reason', ''),
                refund_requested=serializer.validated_data.get('refund_requested', True),
                cancelled_by=request.user
            )
            
            if result['success']:
                return Response({
                    'message': 'Booking cancelled successfully',
                    'refund_amount': result.get('refund_amount', 0),
                    'refund_status': result.get('refund_status', 'not_requested')
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['message']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': f'Failed to cancel booking: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def tickets(self, request, pk=None):
        """Get tickets for a specific booking"""
        booking = self.get_object()
        tickets = booking.tickets.all()
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    @cache_analytics(timeout=900)
    @monitor_query_performance
    def analytics(self, request):
        """Get customer booking analytics"""
        user = request.user
        bookings = Booking.objects.filter(customer=user)
        
        # Calculate analytics
        total_bookings = bookings.count()
        total_spent = bookings.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        total_tickets = Ticket.objects.filter(booking__customer=user).count()
        
        # Find favorite category
        event_bookings = bookings.filter(booking_type='event').select_related('event')
        category_counts = {}
        for booking in event_bookings:
            if booking.event:
                category = booking.event.category
                category_counts[category] = category_counts.get(category, 0) + 1
        
        favorite_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else 'None'
        
        # Bookings by month (last 12 months)
        now = timezone.now()
        bookings_by_month = {}
        for i in range(12):
            month_start = now.replace(day=1) - timedelta(days=30 * i)
            month_bookings = bookings.filter(
                created_at__year=month_start.year,
                created_at__month=month_start.month
            ).count()
            month_key = month_start.strftime('%Y-%m')
            bookings_by_month[month_key] = month_bookings
        
        # Bookings by type
        bookings_by_type = {
            'event': bookings.filter(booking_type='event').count(),
            'movie': bookings.filter(booking_type='movie').count()
        }
        
        # Average booking amount
        avg_amount = bookings.aggregate(
            avg=Avg('total_amount')
        )['avg'] or Decimal('0.00')
        
        # Upcoming vs past bookings
        upcoming_bookings = 0
        past_bookings = 0
        
        for booking in bookings:
            event_datetime = booking.event_or_showtime_datetime
            if event_datetime:
                if event_datetime > now:
                    upcoming_bookings += 1
                else:
                    past_bookings += 1
        
        analytics_data = {
            'total_bookings': total_bookings,
            'total_spent': total_spent,
            'total_tickets': total_tickets,
            'favorite_category': favorite_category,
            'bookings_by_month': bookings_by_month,
            'bookings_by_type': bookings_by_type,
            'average_booking_amount': avg_amount,
            'upcoming_bookings': upcoming_bookings,
            'past_bookings': past_bookings
        }
        
        serializer = BookingAnalyticsSerializer(analytics_data)
        return Response(serializer.data)


class CustomerReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for customer reviews"""
    
    serializer_class = CustomerReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get reviews for the current user"""
        return CustomerReview.objects.filter(
            reviewer=self.request.user
        ).select_related('booking', 'booking__event', 'booking__showtime__movie')
    
    def perform_create(self, serializer):
        """Create review with current user as reviewer"""
        booking_id = self.request.data.get('booking_id')
        booking = get_object_or_404(Booking, id=booking_id, customer=self.request.user)
        
        # Check if review already exists
        if hasattr(booking, 'review'):
            from rest_framework import serializers
            raise serializers.ValidationError("Review already exists for this booking")
        
        serializer.save(reviewer=self.request.user, booking=booking)
    
    def perform_update(self, serializer):
        """Update review with validation"""
        review = self.get_object()
        if not review.can_be_edited:
            from rest_framework import serializers
            raise serializers.ValidationError("Review can no longer be edited")
        serializer.save()


class WaitlistViewSet(viewsets.ModelViewSet):
    """ViewSet for waitlist management"""
    
    serializer_class = WaitlistEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get waitlist entries for the current user"""
        return WaitlistEntry.objects.filter(
            customer=self.request.user
        ).select_related('event', 'showtime__movie', 'ticket_type')
    
    def perform_create(self, serializer):
        """Create waitlist entry for current user"""
        serializer.save(customer=self.request.user)
    
    @action(detail=False, methods=['post'])
    def join_event_waitlist(self, request):
        """Join waitlist for a sold-out event"""
        event_id = request.data.get('event_id')
        ticket_type_id = request.data.get('ticket_type_id')
        quantity = request.data.get('quantity', 1)
        max_price = request.data.get('max_price_willing_to_pay')
        
        event = get_object_or_404(Event, id=event_id)
        ticket_type = get_object_or_404(TicketType, id=ticket_type_id, event=event)
        
        # Check if ticket type is sold out
        if not ticket_type.is_sold_out:
            return Response({
                'error': 'Ticket type is not sold out'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is already on waitlist
        existing_entry = WaitlistEntry.objects.filter(
            customer=request.user,
            event=event,
            ticket_type=ticket_type,
            status='active'
        ).first()
        
        if existing_entry:
            return Response({
                'error': 'Already on waitlist for this ticket type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create waitlist entry
        waitlist_entry = WaitlistEntry.objects.create(
            customer=request.user,
            event=event,
            ticket_type=ticket_type,
            quantity_requested=quantity,
            max_price_willing_to_pay=max_price
        )
        
        serializer = WaitlistEntrySerializer(waitlist_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def join_showtime_waitlist(self, request):
        """Join waitlist for a sold-out showtime"""
        showtime_id = request.data.get('showtime_id')
        quantity = request.data.get('quantity', 1)
        max_price = request.data.get('max_price_willing_to_pay')
        
        showtime = get_object_or_404(Showtime, id=showtime_id)
        
        # Check if showtime is sold out
        if showtime.available_seats > 0:
            return Response({
                'error': 'Showtime is not sold out'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is already on waitlist
        existing_entry = WaitlistEntry.objects.filter(
            customer=request.user,
            showtime=showtime,
            status='active'
        ).first()
        
        if existing_entry:
            return Response({
                'error': 'Already on waitlist for this showtime'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create waitlist entry
        waitlist_entry = WaitlistEntry.objects.create(
            customer=request.user,
            showtime=showtime,
            quantity_requested=quantity,
            max_price_willing_to_pay=max_price
        )
        
        serializer = WaitlistEntrySerializer(waitlist_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def booking_history_summary(request):
    """Get a summary of customer's booking history"""
    user = request.user
    
    # Get counts by status
    bookings = Booking.objects.filter(customer=user)
    
    summary = {
        'total_bookings': bookings.count(),
        'confirmed_bookings': bookings.filter(booking_status='confirmed').count(),
        'cancelled_bookings': bookings.filter(booking_status='cancelled').count(),
        'completed_bookings': bookings.filter(booking_status='completed').count(),
        'pending_payments': bookings.filter(payment_status='pending').count(),
        'total_spent': bookings.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        'active_waitlist_entries': WaitlistEntry.objects.filter(
            customer=user, status='active'
        ).count(),
        'reviews_written': CustomerReview.objects.filter(reviewer=user).count()
    }
    
    return Response(summary)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def upcoming_bookings(request):
    """Get customer's upcoming bookings"""
    user = request.user
    now = timezone.now()
    
    # Get bookings for future events/showtimes
    upcoming = []
    
    # Event bookings
    event_bookings = Booking.objects.filter(
        customer=user,
        booking_type='event',
        booking_status__in=['confirmed', 'pending']
    ).select_related('event')
    
    for booking in event_bookings:
        if booking.event and booking.event.start_datetime > now:
            upcoming.append(booking)
    
    # Movie bookings
    movie_bookings = Booking.objects.filter(
        customer=user,
        booking_type='movie',
        booking_status__in=['confirmed', 'pending']
    ).select_related('showtime__movie')
    
    for booking in movie_bookings:
        if booking.showtime and booking.showtime.start_time > now:
            upcoming.append(booking)
    
    # Sort by datetime
    upcoming.sort(key=lambda b: b.event_or_showtime_datetime or timezone.now())
    
    serializer = BookingListSerializer(upcoming, many=True)
    return Response(serializer.data)
