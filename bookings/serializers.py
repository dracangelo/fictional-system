from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Avg, Count
from django.utils import timezone
from decimal import Decimal
from .models import Booking, Ticket, CustomerReview, WaitlistEntry
from events.models import Event, TicketType
from theaters.models import Showtime


class TicketSerializer(serializers.ModelSerializer):
    """Serializer for Ticket model"""
    event_or_movie_title = serializers.ReadOnlyField()
    venue_info = serializers.ReadOnlyField()
    is_valid_for_use = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'seat_number', 'price', 'status',
            'used_at', 'used_by', 'event_or_movie_title', 'venue_info',
            'is_valid_for_use', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'used_at', 'used_by', 'created_at', 'updated_at'
        ]
    
    def get_is_valid_for_use(self, obj):
        """Get ticket validation status"""
        is_valid, message = obj.is_valid_for_use()
        return {
            'valid': is_valid,
            'message': message
        }


class BookingListSerializer(serializers.ModelSerializer):
    """Serializer for Booking list view (minimal data)"""
    event_or_showtime_title = serializers.ReadOnlyField()
    event_or_showtime_datetime = serializers.ReadOnlyField()
    ticket_count = serializers.ReadOnlyField()
    is_refundable = serializers.ReadOnlyField()
    venue_info = serializers.SerializerMethodField()
    booking_type_display = serializers.CharField(source='get_booking_type_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    booking_status_display = serializers.CharField(source='get_booking_status_display', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'booking_type', 'booking_type_display',
            'event_or_showtime_title', 'event_or_showtime_datetime', 'total_amount',
            'payment_status', 'payment_status_display', 'booking_status', 
            'booking_status_display', 'ticket_count', 'is_refundable',
            'venue_info', 'created_at', 'updated_at'
        ]
    
    def get_venue_info(self, obj):
        """Get venue information based on booking type"""
        if obj.booking_type == 'event' and obj.event:
            return {
                'name': obj.event.venue,
                'address': obj.event.address
            }
        elif obj.booking_type == 'movie' and obj.showtime:
            theater = obj.showtime.theater
            return {
                'name': theater.name,
                'address': theater.address,
                'screen': obj.showtime.screen_number
            }
        return None


class BookingDetailSerializer(serializers.ModelSerializer):
    """Serializer for Booking detail view (full data)"""
    event_or_showtime_title = serializers.ReadOnlyField()
    event_or_showtime_datetime = serializers.ReadOnlyField()
    ticket_count = serializers.ReadOnlyField()
    is_refundable = serializers.ReadOnlyField()
    tickets = TicketSerializer(many=True, read_only=True)
    venue_info = serializers.SerializerMethodField()
    event_details = serializers.SerializerMethodField()
    showtime_details = serializers.SerializerMethodField()
    booking_type_display = serializers.CharField(source='get_booking_type_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    booking_status_display = serializers.CharField(source='get_booking_status_display', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'booking_type', 'booking_type_display',
            'event_or_showtime_title', 'event_or_showtime_datetime', 'subtotal',
            'discount_amount', 'fees', 'total_amount', 'payment_status',
            'payment_status_display', 'booking_status', 'booking_status_display',
            'payment_method', 'customer_email', 'customer_phone', 'special_requests',
            'ticket_count', 'is_refundable', 'tickets', 'venue_info',
            'event_details', 'showtime_details', 'created_at', 'updated_at'
        ]
    
    def get_venue_info(self, obj):
        """Get detailed venue information"""
        if obj.booking_type == 'event' and obj.event:
            return {
                'name': obj.event.venue,
                'address': obj.event.address,
                'type': 'event'
            }
        elif obj.booking_type == 'movie' and obj.showtime:
            theater = obj.showtime.theater
            return {
                'name': theater.name,
                'address': theater.address,
                'screen': obj.showtime.screen_number,
                'type': 'theater'
            }
        return None
    
    def get_event_details(self, obj):
        """Get event details if this is an event booking"""
        if obj.booking_type == 'event' and obj.event:
            return {
                'id': obj.event.id,
                'title': obj.event.title,
                'description': obj.event.description,
                'category': obj.event.category,
                'start_datetime': obj.event.start_datetime,
                'end_datetime': obj.event.end_datetime,
                'status': obj.event.status
            }
        return None
    
    def get_showtime_details(self, obj):
        """Get showtime details if this is a movie booking"""
        if obj.booking_type == 'movie' and obj.showtime:
            return {
                'id': obj.showtime.id,
                'movie_title': obj.showtime.movie.title,
                'movie_genre': obj.showtime.movie.genre,
                'movie_duration': obj.showtime.movie.duration,
                'start_time': obj.showtime.start_time,
                'end_time': obj.showtime.end_time,
                'screen_number': obj.showtime.screen_number
            }
        return None


class BookingCancellationSerializer(serializers.Serializer):
    """Serializer for booking cancellation requests"""
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    refund_requested = serializers.BooleanField(default=True)
    
    def validate(self, data):
        """Validate cancellation request"""
        booking = self.context.get('booking')
        if not booking:
            raise serializers.ValidationError("Booking not found")
        
        if booking.booking_status == 'cancelled':
            raise serializers.ValidationError("Booking is already cancelled")
        
        if booking.booking_status == 'completed':
            raise serializers.ValidationError("Cannot cancel completed booking")
        
        if not booking.is_refundable and data.get('refund_requested', True):
            raise serializers.ValidationError(
                "This booking is not eligible for refund. Event/showtime has already started."
            )
        
        return data


class CustomerReviewSerializer(serializers.ModelSerializer):
    """Serializer for customer reviews and ratings"""
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    
    class Meta:
        model = CustomerReview
        fields = [
            'id', 'rating', 'review_text', 'reviewer_name', 'reviewer_username',
            'is_verified_purchase', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reviewer_name', 'reviewer_username', 'is_verified_purchase', 'created_at', 'updated_at']
    
    def validate_rating(self, value):
        """Validate rating is between 1 and 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value


class WaitlistEntrySerializer(serializers.ModelSerializer):
    """Serializer for waitlist entries"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    
    class Meta:
        model = WaitlistEntry
        fields = [
            'id', 'customer_name', 'customer_email', 'ticket_type_name',
            'quantity_requested', 'max_price_willing_to_pay', 'notification_sent',
            'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'customer_name', 'customer_email', 'notification_sent', 'created_at']


class BookingHistoryFilterSerializer(serializers.Serializer):
    """Serializer for booking history filtering"""
    booking_type = serializers.ChoiceField(
        choices=[('event', 'Event'), ('movie', 'Movie')],
        required=False
    )
    payment_status = serializers.ChoiceField(
        choices=Booking.PAYMENT_STATUS_CHOICES,
        required=False
    )
    booking_status = serializers.ChoiceField(
        choices=Booking.BOOKING_STATUS_CHOICES,
        required=False
    )
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    min_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    
    def validate(self, data):
        """Validate filter parameters"""
        if data.get('date_from') and data.get('date_to'):
            if data['date_from'] > data['date_to']:
                raise serializers.ValidationError("date_from must be before date_to")
        
        if data.get('min_amount') and data.get('max_amount'):
            if data['min_amount'] > data['max_amount']:
                raise serializers.ValidationError("min_amount must be less than max_amount")
        
        return data


class BookingAnalyticsSerializer(serializers.Serializer):
    """Serializer for customer booking analytics"""
    total_bookings = serializers.IntegerField()
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_tickets = serializers.IntegerField()
    favorite_category = serializers.CharField()
    bookings_by_month = serializers.DictField()
    bookings_by_type = serializers.DictField()
    average_booking_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    upcoming_bookings = serializers.IntegerField()
    past_bookings = serializers.IntegerField()