from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid

from movie_booking_app.managers import OptimizedTheaterManager, OptimizedMovieManager, OptimizedShowtimeManager
from movie_booking_app.cache_utils import CacheInvalidationMixin


class Theater(CacheInvalidationMixin, models.Model):
    """Theater model for managing movie theaters with seating configurations"""
    
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_theaters',
        help_text="Theater owner (must have theater_owner role)"
    )
    name = models.CharField(max_length=200, help_text="Theater name")
    address = models.TextField(help_text="Full theater address")
    city = models.CharField(max_length=100, help_text="City")
    state = models.CharField(max_length=100, help_text="State/Province")
    zip_code = models.CharField(max_length=20, help_text="ZIP/Postal code")
    phone_number = models.CharField(max_length=20, blank=True, help_text="Contact phone number")
    
    # Theater configuration
    screens = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of screens in the theater"
    )
    
    # Seating layout stored as JSON (compatible with both SQLite and PostgreSQL)
    seating_layout = models.JSONField(
        default=dict,
        blank=True,
        help_text="Seating configuration for each screen"
    )
    
    # Amenities and features
    amenities = models.JSONField(
        default=list,
        blank=True,
        help_text="List of theater amenities"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the theater is active and operational"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager
    objects = OptimizedTheaterManager()
    
    class Meta:
        db_table = 'theaters'
        verbose_name = 'Theater'
        verbose_name_plural = 'Theaters'
        ordering = ['name']
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['city']),
            models.Index(fields=['is_active']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.city}"
    
    def clean(self):
        """Validate theater data"""
        from django.core.exceptions import ValidationError
        
        # Validate seating layout structure if provided and not empty
        if self.seating_layout and self.seating_layout != {}:
            self._validate_seating_layout()
    
    def _validate_seating_layout(self):
        """Validate the seating layout JSON structure"""
        from django.core.exceptions import ValidationError
        
        if not isinstance(self.seating_layout, dict):
            raise ValidationError("Seating layout must be a dictionary")
        
        screens = self.seating_layout.get('screens', [])
        if not isinstance(screens, list):
            raise ValidationError("Screens must be a list")
        
        if len(screens) != self.screens:
            raise ValidationError(f"Seating layout must define exactly {self.screens} screen(s)")
        
        for i, screen in enumerate(screens):
            if not isinstance(screen, dict):
                raise ValidationError(f"Screen {i+1} configuration must be a dictionary")
            
            required_fields = ['screen_number', 'rows', 'seats_per_row']
            for field in required_fields:
                if field not in screen:
                    raise ValidationError(f"Screen {i+1} missing required field: {field}")
                
                if not isinstance(screen[field], int) or screen[field] <= 0:
                    raise ValidationError(f"Screen {i+1} {field} must be a positive integer")
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def get_total_seats(self, screen_number=None):
        """Get total number of seats for a specific screen or all screens"""
        if not self.seating_layout or 'screens' not in self.seating_layout:
            return 0
        
        total = 0
        for screen in self.seating_layout['screens']:
            if screen_number is None or screen['screen_number'] == screen_number:
                total += screen['rows'] * screen['seats_per_row']
        
        return total
    
    def get_screen_configuration(self, screen_number):
        """Get seating configuration for a specific screen"""
        if not self.seating_layout or 'screens' not in self.seating_layout:
            return None
        
        for screen in self.seating_layout['screens']:
            if screen['screen_number'] == screen_number:
                return screen
        
        return None


class Movie(CacheInvalidationMixin, models.Model):
    """Movie model for managing movie information"""
    
    RATING_CHOICES = [
        ('G', 'General Audiences'),
        ('PG', 'Parental Guidance'),
        ('PG-13', 'Parents Strongly Cautioned'),
        ('R', 'Restricted'),
        ('NC-17', 'Adults Only'),
        ('NR', 'Not Rated'),
    ]
    
    GENRE_CHOICES = [
        ('action', 'Action'),
        ('adventure', 'Adventure'),
        ('animation', 'Animation'),
        ('comedy', 'Comedy'),
        ('crime', 'Crime'),
        ('documentary', 'Documentary'),
        ('drama', 'Drama'),
        ('family', 'Family'),
        ('fantasy', 'Fantasy'),
        ('horror', 'Horror'),
        ('musical', 'Musical'),
        ('mystery', 'Mystery'),
        ('romance', 'Romance'),
        ('sci-fi', 'Science Fiction'),
        ('thriller', 'Thriller'),
        ('war', 'War'),
        ('western', 'Western'),
    ]
    
    # Basic movie information
    title = models.CharField(max_length=200, help_text="Movie title")
    description = models.TextField(help_text="Movie plot/description")
    genre = models.CharField(
        max_length=50,
        choices=GENRE_CHOICES,
        help_text="Primary movie genre"
    )
    duration = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Movie duration in minutes"
    )
    rating = models.CharField(
        max_length=10,
        choices=RATING_CHOICES,
        default='NR',
        help_text="Movie rating"
    )
    
    # Cast and crew information stored as JSON
    cast = models.JSONField(
        default=list,
        blank=True,
        help_text="List of main cast members"
    )
    director = models.CharField(max_length=100, help_text="Movie director")
    producer = models.CharField(max_length=100, blank=True, help_text="Movie producer")
    
    # Media
    poster_url = models.URLField(blank=True, help_text="Movie poster URL")
    trailer_url = models.URLField(blank=True, help_text="Movie trailer URL")
    
    # Release information
    release_date = models.DateField(help_text="Movie release date")
    language = models.CharField(max_length=50, default='English', help_text="Primary language")
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the movie is available for scheduling"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager
    objects = OptimizedMovieManager()
    
    class Meta:
        db_table = 'movies'
        verbose_name = 'Movie'
        verbose_name_plural = 'Movies'
        ordering = ['title']
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['genre']),
            models.Index(fields=['rating']),
            models.Index(fields=['release_date']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.release_date.year})"
    
    def clean(self):
        """Validate movie data"""
        from django.core.exceptions import ValidationError
        
        if self.release_date > timezone.now().date():
            # Allow future releases but validate they're reasonable
            pass
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def duration_formatted(self):
        """Get formatted duration (e.g., '2h 30m')"""
        hours = self.duration // 60
        minutes = self.duration % 60
        
        if hours > 0:
            if minutes > 0:
                return f"{hours}h {minutes}m"
            else:
                return f"{hours}h"
        else:
            return f"{minutes}m"


class Showtime(CacheInvalidationMixin, models.Model):
    """Showtime model for managing movie showtimes at theaters"""
    
    theater = models.ForeignKey(
        Theater,
        on_delete=models.CASCADE,
        related_name='showtimes',
        help_text="Theater where the movie is shown"
    )
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name='showtimes',
        help_text="Movie being shown"
    )
    screen_number = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Screen number within the theater"
    )
    
    # Showtime scheduling
    start_time = models.DateTimeField(help_text="Showtime start date and time")
    end_time = models.DateTimeField(help_text="Showtime end date and time")
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Base ticket price for this showtime"
    )
    
    # Seat pricing configuration (JSON for different seat categories)
    seat_pricing = models.JSONField(
        default=dict,
        blank=True,
        help_text="Pricing for different seat categories"
    )
    
    # Seat management
    total_seats = models.PositiveIntegerField(
        help_text="Total number of seats available for this showtime"
    )
    available_seats = models.PositiveIntegerField(
        help_text="Number of seats currently available"
    )
    booked_seats = models.JSONField(
        default=list,
        blank=True,
        help_text="List of booked seat identifiers"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this showtime is available for booking"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager
    objects = OptimizedShowtimeManager()
    
    class Meta:
        db_table = 'showtimes'
        verbose_name = 'Showtime'
        verbose_name_plural = 'Showtimes'
        ordering = ['start_time']
        unique_together = ['theater', 'screen_number', 'start_time']
        indexes = [
            models.Index(fields=['theater']),
            models.Index(fields=['movie']),
            models.Index(fields=['start_time']),
            models.Index(fields=['screen_number']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.movie.title} at {self.theater.name} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    def clean(self):
        """Validate showtime data"""
        from django.core.exceptions import ValidationError
        
        # Validate start and end times
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time")
        
        # Validate that showtime is not in the past
        if self.start_time < timezone.now():
            raise ValidationError("Showtime cannot be scheduled in the past")
        
        # Validate screen number exists in theater
        if self.theater_id:
            theater_config = self.theater.get_screen_configuration(self.screen_number)
            if not theater_config:
                raise ValidationError(f"Screen {self.screen_number} does not exist in {self.theater.name}")
            
            # Set total seats based on theater configuration
            if not self.total_seats:
                self.total_seats = theater_config['rows'] * theater_config['seats_per_row']
        
        # Validate available seats
        if self.available_seats > self.total_seats:
            raise ValidationError("Available seats cannot exceed total seats")
        
        # Check for scheduling conflicts
        if self.theater_id and self.screen_number and self.start_time and self.end_time:
            self._check_scheduling_conflicts()
    
    def _check_scheduling_conflicts(self):
        """Check for scheduling conflicts with other showtimes"""
        from django.core.exceptions import ValidationError
        
        conflicting_showtimes = Showtime.objects.filter(
            theater=self.theater,
            screen_number=self.screen_number,
            is_active=True
        ).exclude(pk=self.pk if self.pk else None)
        
        for showtime in conflicting_showtimes:
            # Check if there's any overlap
            if (self.start_time < showtime.end_time and self.end_time > showtime.start_time):
                raise ValidationError(
                    f"Scheduling conflict with {showtime.movie.title} "
                    f"({showtime.start_time.strftime('%Y-%m-%d %H:%M')} - "
                    f"{showtime.end_time.strftime('%H:%M')})"
                )
    
    def save(self, *args, **kwargs):
        """Override save to run validation and set defaults"""
        # Set end time based on movie duration if not provided
        if not self.end_time and self.movie_id and self.start_time:
            from datetime import timedelta
            self.end_time = self.start_time + timedelta(minutes=self.movie.duration + 30)  # 30 min buffer
        
        # Set available seats to total seats if not provided
        if self.available_seats is None:
            self.available_seats = self.total_seats
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def seats_booked(self):
        """Get number of seats booked"""
        return self.total_seats - self.available_seats
    
    @property
    def is_sold_out(self):
        """Check if showtime is sold out"""
        return self.available_seats <= 0
    
    @property
    def is_upcoming(self):
        """Check if showtime is upcoming"""
        return self.start_time > timezone.now()
    
    @property
    def occupancy_percentage(self):
        """Get occupancy percentage"""
        if self.total_seats == 0:
            return 0
        return round((self.seats_booked / self.total_seats) * 100, 2)
    
    def get_seat_price(self, seat_identifier):
        """Get price for a specific seat based on seat category"""
        if not self.seat_pricing:
            return self.base_price
        
        # Extract seat category from identifier (e.g., 'A1' -> row 'A')
        row = seat_identifier[0] if seat_identifier else 'A'
        
        # Check if this row has special pricing
        for category, config in self.seat_pricing.items():
            if 'rows' in config and row in config['rows']:
                return Decimal(str(config.get('price', self.base_price)))
        
        return self.base_price
