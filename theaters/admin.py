from django.contrib import admin
from .models import Theater, Movie, Showtime


@admin.register(Theater)
class TheaterAdmin(admin.ModelAdmin):
    """Admin configuration for Theater model"""
    list_display = ['name', 'city', 'state', 'screens', 'owner', 'is_active', 'created_at']
    list_filter = ['city', 'state', 'screens', 'is_active', 'created_at']
    search_fields = ['name', 'address', 'city', 'state', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'owner', 'is_active')
        }),
        ('Location', {
            'fields': ('address', 'city', 'state', 'zip_code', 'phone_number')
        }),
        ('Configuration', {
            'fields': ('screens', 'seating_layout', 'amenities')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """Filter theaters based on user role"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Theater owners can only see their own theaters
        if hasattr(request.user, 'profile') and request.user.profile.role == 'theater_owner':
            return qs.filter(owner=request.user)
        return qs.none()


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    """Admin configuration for Movie model"""
    list_display = ['title', 'genre', 'rating', 'duration', 'release_date', 'is_active', 'created_at']
    list_filter = ['genre', 'rating', 'language', 'is_active', 'release_date', 'created_at']
    search_fields = ['title', 'description', 'director', 'cast']
    readonly_fields = ['created_at', 'updated_at', 'duration_formatted']
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'genre', 'rating', 'is_active')
        }),
        ('Details', {
            'fields': ('duration', 'duration_formatted', 'release_date', 'language')
        }),
        ('Cast & Crew', {
            'fields': ('director', 'producer', 'cast')
        }),
        ('Media', {
            'fields': ('poster_url', 'trailer_url')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Showtime)
class ShowtimeAdmin(admin.ModelAdmin):
    """Admin configuration for Showtime model"""
    list_display = ['movie', 'theater', 'screen_number', 'start_time', 'base_price', 'available_seats', 'is_active']
    list_filter = ['theater', 'movie__genre', 'screen_number', 'is_active', 'start_time']
    search_fields = ['movie__title', 'theater__name', 'theater__city']
    readonly_fields = ['created_at', 'updated_at', 'seats_booked', 'occupancy_percentage', 'is_sold_out', 'is_upcoming']
    fieldsets = (
        ('Basic Information', {
            'fields': ('movie', 'theater', 'screen_number', 'is_active')
        }),
        ('Schedule', {
            'fields': ('start_time', 'end_time')
        }),
        ('Pricing', {
            'fields': ('base_price', 'seat_pricing')
        }),
        ('Seating', {
            'fields': ('total_seats', 'available_seats', 'booked_seats', 'seats_booked', 'occupancy_percentage', 'is_sold_out')
        }),
        ('Status', {
            'fields': ('is_upcoming',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """Filter showtimes based on user role"""
        qs = super().get_queryset(request).select_related('theater', 'movie')
        if request.user.is_superuser:
            return qs
        # Theater owners can only see showtimes for their theaters
        if hasattr(request.user, 'profile') and request.user.profile.role == 'theater_owner':
            return qs.filter(theater__owner=request.user)
        return qs.none()
