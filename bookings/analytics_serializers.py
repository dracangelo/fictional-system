from rest_framework import serializers


class SystemAnalyticsSerializer(serializers.Serializer):
    """Serializer for system-wide analytics data"""
    
    period = serializers.DictField()
    overview = serializers.DictField()
    users = serializers.DictField()
    breakdowns = serializers.DictField()


class EventAnalyticsSerializer(serializers.Serializer):
    """Serializer for event analytics data"""
    
    event = serializers.DictField()
    bookings = serializers.DictField()
    tickets = serializers.DictField()
    revenue = serializers.DictField()
    ticket_types = serializers.ListField()
    daily_sales = serializers.ListField()
    reviews = serializers.DictField()
    waitlist = serializers.DictField()


class TheaterAnalyticsSerializer(serializers.Serializer):
    """Serializer for theater analytics data"""
    
    theater = serializers.DictField()
    showtimes = serializers.DictField()
    bookings = serializers.DictField()
    revenue = serializers.DictField()
    occupancy = serializers.DictField()
    screen_performance = serializers.ListField()
    popular_movies = serializers.ListField()
    monthly_revenue = serializers.ListField()


class TrendAnalysisSerializer(serializers.Serializer):
    """Serializer for trend analysis data"""
    
    period = serializers.DictField()
    trends = serializers.DictField()


class RecommendationInsightsSerializer(serializers.Serializer):
    """Serializer for recommendation insights data"""
    
    popular_events = serializers.ListField()
    trending_movies = serializers.ListField()
    optimal_pricing = serializers.DictField()
    peak_times = serializers.DictField()


class TicketTypePerformanceSerializer(serializers.Serializer):
    """Serializer for ticket type performance data"""
    
    name = serializers.CharField()
    price = serializers.FloatField()
    available = serializers.IntegerField()
    sold = serializers.IntegerField()
    remaining = serializers.IntegerField()
    revenue = serializers.FloatField()
    sell_through_rate = serializers.FloatField()


class ScreenPerformanceSerializer(serializers.Serializer):
    """Serializer for screen performance data"""
    
    screen_number = serializers.IntegerField()
    showtimes = serializers.IntegerField()
    bookings = serializers.IntegerField()
    occupancy_rate = serializers.FloatField()
    revenue = serializers.FloatField()


class DailySalesSerializer(serializers.Serializer):
    """Serializer for daily sales data"""
    
    date = serializers.DateField()
    tickets_sold = serializers.IntegerField()
    revenue = serializers.FloatField()


class PopularEventSerializer(serializers.Serializer):
    """Serializer for popular event data"""
    
    id = serializers.IntegerField()
    title = serializers.CharField()
    booking_count = serializers.IntegerField()
    revenue = serializers.FloatField()
    start_datetime = serializers.DateTimeField()


class TrendingMovieSerializer(serializers.Serializer):
    """Serializer for trending movie data"""
    
    id = serializers.IntegerField()
    title = serializers.CharField()
    recent_bookings = serializers.IntegerField()
    genre = serializers.CharField()


class PopularMovieSerializer(serializers.Serializer):
    """Serializer for popular movie data in theaters"""
    
    booking__showtime__movie__title = serializers.CharField()
    booking__showtime__movie__id = serializers.IntegerField()
    tickets_sold = serializers.IntegerField()
    revenue = serializers.FloatField()
    showtimes = serializers.IntegerField()


class MonthlyRevenueSerializer(serializers.Serializer):
    """Serializer for monthly revenue data"""
    
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    revenue = serializers.FloatField()
    tickets_sold = serializers.IntegerField()


class PeakTimesSerializer(serializers.Serializer):
    """Serializer for peak times analysis"""
    
    hourly_distribution = serializers.DictField()
    peak_hour = serializers.IntegerField(allow_null=True)


class AnalyticsOverviewSerializer(serializers.Serializer):
    """Serializer for analytics overview data"""
    
    total_bookings = serializers.IntegerField()
    total_tickets_sold = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    total_discount_amount = serializers.FloatField()
    total_fees = serializers.FloatField()
    net_revenue = serializers.FloatField()
    avg_booking_value = serializers.FloatField()
    avg_tickets_per_booking = serializers.FloatField()


class UserMetricsSerializer(serializers.Serializer):
    """Serializer for user metrics data"""
    
    total_users = serializers.IntegerField()
    new_users = serializers.IntegerField()
    active_customers = serializers.IntegerField()


class BookingBreakdownSerializer(serializers.Serializer):
    """Serializer for booking breakdown data"""
    
    booking_status = serializers.DictField()
    payment_status = serializers.DictField()
    booking_type = serializers.DictField()


class ReportExportSerializer(serializers.Serializer):
    """Serializer for report export parameters"""
    
    format = serializers.ChoiceField(choices=['csv', 'pdf'], default='csv')
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    
    def validate(self, data):
        """Validate date range"""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError("date_from must be before date_to")
        
        return data