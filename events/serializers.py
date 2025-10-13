from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Sum, Count
from django.utils import timezone
from .models import Event, TicketType, Discount


class TicketTypeSerializer(serializers.ModelSerializer):
    """Serializer for TicketType model"""
    tickets_remaining = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_on_sale = serializers.ReadOnlyField()
    
    class Meta:
        model = TicketType
        fields = [
            'id', 'name', 'description', 'price', 'quantity_available',
            'quantity_sold', 'is_active', 'sale_start_datetime',
            'sale_end_datetime', 'tickets_remaining', 'is_sold_out',
            'is_on_sale', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'quantity_sold', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate ticket type data"""
        if data.get('sale_start_datetime') and data.get('sale_end_datetime'):
            if data['sale_start_datetime'] >= data['sale_end_datetime']:
                raise serializers.ValidationError(
                    "Sale end datetime must be after sale start datetime"
                )
        
        # Check if sale end is before event start (if event is available)
        if hasattr(self, 'context') and 'event' in self.context:
            event = self.context['event']
            if data.get('sale_end_datetime') and event.start_datetime:
                if data['sale_end_datetime'] > event.start_datetime:
                    raise serializers.ValidationError(
                        "Ticket sales must end before event starts"
                    )
        
        return data


class DiscountSerializer(serializers.ModelSerializer):
    """Serializer for Discount model"""
    is_valid = serializers.ReadOnlyField()
    
    class Meta:
        model = Discount
        fields = [
            'id', 'name', 'description', 'discount_type', 'discount_value',
            'category', 'promo_code', 'max_uses', 'current_uses',
            'valid_from', 'valid_until', 'is_active', 'is_valid',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_uses', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate discount data"""
        if data.get('valid_from') and data.get('valid_until'):
            if data['valid_from'] >= data['valid_until']:
                raise serializers.ValidationError(
                    "Valid until must be after valid from"
                )
        
        if data.get('discount_type') == 'percentage' and data.get('discount_value', 0) > 100:
            raise serializers.ValidationError(
                "Percentage discount cannot exceed 100%"
            )
        
        if data.get('category') == 'promo_code' and not data.get('promo_code'):
            raise serializers.ValidationError(
                "Promo code is required for promo code discounts"
            )
        
        return data


class EventListSerializer(serializers.ModelSerializer):
    """Serializer for Event list view (minimal data)"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    total_tickets_available = serializers.ReadOnlyField()
    total_tickets_sold = serializers.ReadOnlyField()
    tickets_remaining = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'venue', 'address', 'category', 'start_datetime',
            'end_datetime', 'status', 'is_active', 'owner_name', 'owner_username',
            'total_tickets_available', 'total_tickets_sold', 'tickets_remaining',
            'is_upcoming', 'is_ongoing', 'is_past', 'created_at', 'updated_at'
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    """Serializer for Event detail view (full data)"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    discounts = DiscountSerializer(many=True, read_only=True)
    total_tickets_available = serializers.ReadOnlyField()
    total_tickets_sold = serializers.ReadOnlyField()
    tickets_remaining = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'venue', 'address', 'category',
            'start_datetime', 'end_datetime', 'media', 'status', 'is_active',
            'owner_name', 'owner_username', 'ticket_types', 'discounts',
            'total_tickets_available', 'total_tickets_sold', 'tickets_remaining',
            'is_upcoming', 'is_ongoing', 'is_past', 'created_at', 'updated_at'
        ]


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for Event creation and updates"""
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'venue', 'address', 'category',
            'start_datetime', 'end_datetime', 'media', 'status', 'is_active'
        ]
        read_only_fields = ['id']
    
    def validate(self, data):
        """Validate event data"""
        if data.get('start_datetime') and data.get('end_datetime'):
            if data['start_datetime'] >= data['end_datetime']:
                raise serializers.ValidationError(
                    "End datetime must be after start datetime"
                )
            
            # Only validate future dates for new events
            if not self.instance and data['start_datetime'] < timezone.now():
                raise serializers.ValidationError(
                    "Event cannot be scheduled in the past"
                )
        
        return data
    
    def create(self, validated_data):
        """Create event with owner set to current user"""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class EventAnalyticsSerializer(serializers.Serializer):
    """Serializer for event analytics data"""
    event_id = serializers.IntegerField()
    event_title = serializers.CharField()
    total_bookings = serializers.IntegerField()
    total_tickets_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    tickets_by_type = serializers.DictField()
    revenue_by_type = serializers.DictField()
    booking_trends = serializers.ListField()
    status = serializers.CharField()
    days_until_event = serializers.IntegerField()
    
    class Meta:
        fields = [
            'event_id', 'event_title', 'total_bookings', 'total_tickets_sold',
            'total_revenue', 'tickets_by_type', 'revenue_by_type',
            'booking_trends', 'status', 'days_until_event'
        ]


class EventStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating event status"""
    status = serializers.ChoiceField(choices=Event.STATUS_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_status(self, value):
        """Validate status transition"""
        if self.instance:
            current_status = self.instance.status
            
            # Define allowed status transitions
            allowed_transitions = {
                'draft': ['published', 'cancelled'],
                'published': ['cancelled', 'completed'],
                'cancelled': [],  # Cannot change from cancelled
                'completed': []   # Cannot change from completed
            }
            
            if value not in allowed_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f"Cannot change status from {current_status} to {value}"
                )
        
        return value


class PromoCodeValidationSerializer(serializers.Serializer):
    """Serializer for validating promo codes"""
    promo_code = serializers.CharField(max_length=50)


class TicketSelectionSerializer(serializers.Serializer):
    """Serializer for ticket selection in price calculation"""
    ticket_type_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class PriceCalculationSerializer(serializers.Serializer):
    """Serializer for price calculation requests"""
    ticket_selections = TicketSelectionSerializer(many=True)
    promo_code = serializers.CharField(max_length=50, required=False, allow_blank=True)


class DiscountAnalyticsSerializer(serializers.Serializer):
    """Serializer for discount analytics data"""
    total_discounts = serializers.IntegerField()
    active_discounts = serializers.IntegerField()
    expired_discounts = serializers.IntegerField()
    discount_usage = serializers.DictField()
    total_discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    bookings_with_discounts = serializers.IntegerField()