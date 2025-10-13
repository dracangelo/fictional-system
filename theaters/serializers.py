from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from decimal import Decimal
from .models import Theater, Movie, Showtime


class MovieSerializer(serializers.ModelSerializer):
    """Serializer for Movie model with CRUD operations"""
    duration_formatted = serializers.ReadOnlyField()
    
    class Meta:
        model = Movie
        fields = [
            'id', 'title', 'description', 'genre', 'duration', 'duration_formatted',
            'rating', 'cast', 'director', 'producer', 'poster_url', 'trailer_url',
            'release_date', 'language', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_duration(self, value):
        """Validate movie duration"""
        if value < 1:
            raise serializers.ValidationError("Duration must be at least 1 minute")
        if value > 600:  # 10 hours
            raise serializers.ValidationError("Duration cannot exceed 10 hours")
        return value
    
    def validate_cast(self, value):
        """Validate cast list format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Cast must be a list")
        
        for cast_member in value:
            if not isinstance(cast_member, str):
                raise serializers.ValidationError("Each cast member must be a string")
        
        return value


class TheaterListSerializer(serializers.ModelSerializer):
    """Serializer for Theater list view (minimal data)"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    total_seats = serializers.SerializerMethodField()
    active_showtimes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Theater
        fields = [
            'id', 'name', 'address', 'city', 'state', 'zip_code', 'phone_number',
            'screens', 'is_active', 'owner_name', 'owner_username', 'total_seats',
            'active_showtimes_count', 'created_at', 'updated_at'
        ]
    
    def get_total_seats(self, obj):
        """Get total seats across all screens"""
        return obj.get_total_seats()
    
    def get_active_showtimes_count(self, obj):
        """Get count of active upcoming showtimes"""
        return obj.showtimes.filter(
            is_active=True,
            start_time__gt=timezone.now()
        ).count()


class TheaterDetailSerializer(serializers.ModelSerializer):
    """Serializer for Theater detail view (full data)"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    total_seats = serializers.SerializerMethodField()
    upcoming_showtimes = serializers.SerializerMethodField()
    
    class Meta:
        model = Theater
        fields = [
            'id', 'name', 'address', 'city', 'state', 'zip_code', 'phone_number',
            'screens', 'seating_layout', 'amenities', 'is_active', 'owner_name',
            'owner_username', 'total_seats', 'upcoming_showtimes', 'created_at', 'updated_at'
        ]
    
    def get_total_seats(self, obj):
        """Get total seats across all screens"""
        return obj.get_total_seats()
    
    def get_upcoming_showtimes(self, obj):
        """Get upcoming showtimes for this theater"""
        upcoming = obj.showtimes.filter(
            is_active=True,
            start_time__gt=timezone.now()
        ).select_related('movie').order_by('start_time')[:10]
        
        return ShowtimeListSerializer(upcoming, many=True).data


class TheaterCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for Theater creation and updates"""
    
    class Meta:
        model = Theater
        fields = [
            'name', 'address', 'city', 'state', 'zip_code', 'phone_number',
            'screens', 'seating_layout', 'amenities', 'is_active'
        ]
    
    def validate_seating_layout(self, value):
        """Validate seating layout structure"""
        if not value:
            return value
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("Seating layout must be a dictionary")
        
        screens = value.get('screens', [])
        if not isinstance(screens, list):
            raise serializers.ValidationError("Screens must be a list")
        
        # Validate each screen configuration
        for i, screen in enumerate(screens):
            if not isinstance(screen, dict):
                raise serializers.ValidationError(f"Screen {i+1} configuration must be a dictionary")
            
            required_fields = ['screen_number', 'rows', 'seats_per_row']
            for field in required_fields:
                if field not in screen:
                    raise serializers.ValidationError(f"Screen {i+1} missing required field: {field}")
                
                if not isinstance(screen[field], int) or screen[field] <= 0:
                    raise serializers.ValidationError(f"Screen {i+1} {field} must be a positive integer")
            
            # Validate pricing if provided
            if 'pricing' in screen:
                pricing = screen['pricing']
                if not isinstance(pricing, dict):
                    raise serializers.ValidationError(f"Screen {i+1} pricing must be a dictionary")
                
                for category, price in pricing.items():
                    try:
                        float(price)
                    except (ValueError, TypeError):
                        raise serializers.ValidationError(f"Screen {i+1} pricing for {category} must be a number")
        
        return value
    
    def create(self, validated_data):
        """Create theater with owner set to current user"""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class ShowtimeListSerializer(serializers.ModelSerializer):
    """Serializer for Showtime list view"""
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    movie_duration = serializers.CharField(source='movie.duration_formatted', read_only=True)
    movie_rating = serializers.CharField(source='movie.rating', read_only=True)
    theater_name = serializers.CharField(source='theater.name', read_only=True)
    occupancy_percentage = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    seats_booked = serializers.ReadOnlyField()
    
    class Meta:
        model = Showtime
        fields = [
            'id', 'screen_number', 'start_time', 'end_time', 'base_price',
            'total_seats', 'available_seats', 'seats_booked', 'occupancy_percentage',
            'is_sold_out', 'is_upcoming', 'is_active', 'movie_title', 'movie_duration',
            'movie_rating', 'theater_name', 'created_at', 'updated_at'
        ]


class ShowtimeDetailSerializer(serializers.ModelSerializer):
    """Serializer for Showtime detail view"""
    movie = MovieSerializer(read_only=True)
    theater = TheaterListSerializer(read_only=True)
    occupancy_percentage = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    seats_booked = serializers.ReadOnlyField()
    
    class Meta:
        model = Showtime
        fields = [
            'id', 'movie', 'theater', 'screen_number', 'start_time', 'end_time',
            'base_price', 'seat_pricing', 'total_seats', 'available_seats',
            'booked_seats', 'seats_booked', 'occupancy_percentage', 'is_sold_out',
            'is_upcoming', 'is_active', 'created_at', 'updated_at'
        ]


class ShowtimeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for Showtime creation and updates"""
    
    class Meta:
        model = Showtime
        fields = [
            'movie', 'theater', 'screen_number', 'start_time', 'end_time',
            'base_price', 'seat_pricing', 'is_active'
        ]
    
    def validate(self, data):
        """Validate showtime data"""
        # Validate start and end times
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError("End time must be after start time")
        
        # Validate that showtime is not in the past (for new showtimes)
        if not self.instance and data.get('start_time'):
            if data['start_time'] < timezone.now():
                raise serializers.ValidationError("Showtime cannot be scheduled in the past")
        
        # Validate theater ownership for current user
        if data.get('theater'):
            request = self.context.get('request')
            if request and request.user:
                # Check if user owns the theater (unless admin)
                if hasattr(request.user, 'profile') and request.user.profile.role != 'admin':
                    if data['theater'].owner != request.user:
                        raise serializers.ValidationError("You can only create showtimes for your own theaters")
        
        # Validate screen number exists in theater
        if data.get('theater') and data.get('screen_number'):
            theater_config = data['theater'].get_screen_configuration(data['screen_number'])
            if not theater_config:
                raise serializers.ValidationError(
                    f"Screen {data['screen_number']} does not exist in {data['theater'].name}"
                )
        
        # Validate seat pricing structure
        if data.get('seat_pricing'):
            seat_pricing = data['seat_pricing']
            if not isinstance(seat_pricing, dict):
                raise serializers.ValidationError("Seat pricing must be a dictionary")
            
            for category, config in seat_pricing.items():
                if not isinstance(config, dict):
                    raise serializers.ValidationError(f"Pricing config for {category} must be a dictionary")
                
                if 'price' not in config:
                    raise serializers.ValidationError(f"Price is required for {category}")
                
                try:
                    float(config['price'])
                except (ValueError, TypeError):
                    raise serializers.ValidationError(f"Price for {category} must be a number")
        
        return data
    
    def create(self, validated_data):
        """Create showtime with proper validation"""
        # Set total_seats based on theater configuration
        theater = validated_data['theater']
        screen_number = validated_data['screen_number']
        screen_config = theater.get_screen_configuration(screen_number)
        
        if screen_config:
            validated_data['total_seats'] = screen_config['rows'] * screen_config['seats_per_row']
        
        return super().create(validated_data)


class TheaterAnalyticsSerializer(serializers.Serializer):
    """Serializer for theater analytics data"""
    theater_id = serializers.IntegerField()
    theater_name = serializers.CharField()
    total_screens = serializers.IntegerField()
    total_seats = serializers.IntegerField()
    total_showtimes = serializers.IntegerField()
    upcoming_showtimes = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_occupancy = serializers.FloatField()
    occupancy_by_screen = serializers.DictField()
    revenue_by_month = serializers.ListField()
    popular_movies = serializers.ListField()
    peak_hours = serializers.DictField()
    
    class Meta:
        fields = [
            'theater_id', 'theater_name', 'total_screens', 'total_seats',
            'total_showtimes', 'upcoming_showtimes', 'total_bookings',
            'total_revenue', 'average_occupancy', 'occupancy_by_screen',
            'revenue_by_month', 'popular_movies', 'peak_hours'
        ]


class ShowtimePricingSerializer(serializers.Serializer):
    """Serializer for dynamic pricing configuration"""
    time_slot = serializers.CharField()
    price_multiplier = serializers.FloatField()
    seat_category = serializers.CharField()
    base_price = serializers.DecimalField(max_digits=8, decimal_places=2)
    final_price = serializers.DecimalField(max_digits=8, decimal_places=2)
    
    def validate_price_multiplier(self, value):
        """Validate price multiplier is reasonable"""
        if value < 0.1:
            raise serializers.ValidationError("Price multiplier cannot be less than 0.1")
        if value > 10.0:
            raise serializers.ValidationError("Price multiplier cannot exceed 10.0")
        return value