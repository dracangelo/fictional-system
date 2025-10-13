"""
Enhanced serializers with comprehensive API documentation.
"""
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'JWT Token Response',
            summary='Successful authentication response',
            description='Response received after successful login',
            value={
                'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                'user': {
                    'id': 1,
                    'username': 'john_doe',
                    'email': 'john@example.com',
                    'role': 'customer',
                    'profile': {
                        'phone_number': '+1234567890',
                        'preferences': {
                            'notification_settings': {
                                'email': True,
                                'sms': True
                            }
                        }
                    }
                }
            },
            request_only=False,
            response_only=True,
        ),
    ]
)
class AuthResponseSerializer(serializers.Serializer):
    """Authentication response with JWT tokens and user information."""
    access = serializers.CharField(
        help_text="JWT access token (expires in 1 hour)"
    )
    refresh = serializers.CharField(
        help_text="JWT refresh token (expires in 7 days)"
    )
    user = serializers.DictField(
        help_text="User profile information"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Event Creation Request',
            summary='Create a new event',
            description='Example request to create a new event with ticket types',
            value={
                'title': 'Summer Music Festival 2024',
                'description': 'Join us for an amazing summer music festival featuring top artists.',
                'venue': 'Central Park Amphitheater',
                'address': '123 Park Avenue, New York, NY 10001',
                'category': 'music',
                'start_datetime': '2024-07-15T18:00:00Z',
                'end_datetime': '2024-07-15T23:00:00Z',
                'media': [
                    'https://example.com/event-poster.jpg',
                    'https://example.com/event-video.mp4'
                ],
                'ticket_types': [
                    {
                        'name': 'General Admission',
                        'price': '75.00',
                        'quantity_available': 1000,
                        'description': 'General admission standing area'
                    },
                    {
                        'name': 'VIP',
                        'price': '150.00',
                        'quantity_available': 100,
                        'description': 'VIP seating with complimentary drinks'
                    }
                ]
            },
            request_only=True,
        ),
    ]
)
class EventCreateSerializer(serializers.Serializer):
    """Serializer for creating events with comprehensive documentation."""
    title = serializers.CharField(
        max_length=200,
        help_text="Event title (max 200 characters)"
    )
    description = serializers.CharField(
        help_text="Detailed event description"
    )
    venue = serializers.CharField(
        max_length=200,
        help_text="Venue name"
    )
    address = serializers.CharField(
        help_text="Full venue address"
    )
    category = serializers.ChoiceField(
        choices=['music', 'sports', 'theater', 'comedy', 'conference', 'other'],
        help_text="Event category"
    )
    start_datetime = serializers.DateTimeField(
        help_text="Event start date and time (ISO 8601 format)"
    )
    end_datetime = serializers.DateTimeField(
        help_text="Event end date and time (ISO 8601 format)"
    )
    media = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        help_text="List of media URLs (images, videos)"
    )
    ticket_types = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of ticket types with pricing and availability"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Booking Request',
            summary='Create a new booking',
            description='Example request to book tickets for an event or movie',
            value={
                'booking_type': 'event',
                'event_id': 123,
                'tickets': [
                    {
                        'ticket_type_id': 1,
                        'quantity': 2
                    },
                    {
                        'ticket_type_id': 2,
                        'quantity': 1
                    }
                ],
                'payment_method': 'stripe',
                'customer_info': {
                    'email': 'customer@example.com',
                    'phone': '+1234567890'
                }
            },
            request_only=True,
        ),
        OpenApiExample(
            'Movie Booking Request',
            summary='Create a movie booking',
            description='Example request to book movie tickets with seat selection',
            value={
                'booking_type': 'movie',
                'showtime_id': 456,
                'seats': ['A1', 'A2', 'A3'],
                'payment_method': 'stripe',
                'customer_info': {
                    'email': 'customer@example.com',
                    'phone': '+1234567890'
                }
            },
            request_only=True,
        ),
    ]
)
class BookingCreateSerializer(serializers.Serializer):
    """Serializer for creating bookings with seat selection."""
    booking_type = serializers.ChoiceField(
        choices=['event', 'movie'],
        help_text="Type of booking (event or movie)"
    )
    event_id = serializers.IntegerField(
        required=False,
        help_text="Event ID (required for event bookings)"
    )
    showtime_id = serializers.IntegerField(
        required=False,
        help_text="Showtime ID (required for movie bookings)"
    )
    tickets = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="Ticket types and quantities for event bookings"
    )
    seats = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Selected seat numbers for movie bookings"
    )
    payment_method = serializers.ChoiceField(
        choices=['stripe', 'paypal'],
        help_text="Payment method"
    )
    customer_info = serializers.DictField(
        help_text="Customer contact information"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Error Response',
            summary='Standard error response',
            description='Error response format used throughout the API',
            value={
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'The provided data is invalid',
                    'details': {
                        'title': ['This field is required.'],
                        'start_datetime': ['Datetime has wrong format.']
                    },
                    'timestamp': '2024-01-15T10:30:00Z'
                }
            },
            response_only=True,
        ),
    ]
)
class ErrorResponseSerializer(serializers.Serializer):
    """Standard error response format."""
    error = serializers.DictField(
        help_text="Error information"
    )


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Analytics Response',
            summary='Analytics data response',
            description='Example analytics response for events or theaters',
            value={
                'period': {
                    'start_date': '2024-01-01',
                    'end_date': '2024-01-31'
                },
                'metrics': {
                    'total_bookings': 1250,
                    'total_revenue': 87500.00,
                    'total_tickets_sold': 3200,
                    'average_booking_value': 70.00,
                    'conversion_rate': 0.15
                },
                'trends': {
                    'daily_bookings': [
                        {'date': '2024-01-01', 'bookings': 45, 'revenue': 3150.00},
                        {'date': '2024-01-02', 'bookings': 52, 'revenue': 3640.00}
                    ],
                    'popular_events': [
                        {'event_id': 123, 'title': 'Concert A', 'bookings': 200},
                        {'event_id': 124, 'title': 'Concert B', 'bookings': 180}
                    ]
                }
            },
            response_only=True,
        ),
    ]
)
class AnalyticsResponseSerializer(serializers.Serializer):
    """Analytics response with metrics and trends."""
    period = serializers.DictField(
        help_text="Date range for analytics"
    )
    metrics = serializers.DictField(
        help_text="Key performance metrics"
    )
    trends = serializers.DictField(
        help_text="Trend data and breakdowns"
    )