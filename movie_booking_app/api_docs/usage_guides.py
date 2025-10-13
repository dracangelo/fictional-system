"""
API usage guides for different user roles.

This module contains comprehensive guides for integrating with the Movie & Event Booking API
for different types of users and use cases.
"""

CUSTOMER_USAGE_GUIDE = """
# Customer API Usage Guide

This guide covers the most common API operations for customers booking events and movies.

## Authentication

### 1. Register a New Account
```http
POST /api/auth/register/
Content-Type: application/json

{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secure_password123",
    "role": "customer",
    "phone_number": "+1234567890"
}
```

### 2. Login and Get JWT Token
```http
POST /api/auth/login/
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "secure_password123"
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "role": "customer"
    }
}
```

### 3. Use Token in Subsequent Requests
Include the access token in the Authorization header:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Discovering Events and Movies

### 1. Search Events
```http
GET /api/search/events/?q=concert&location=new+york&date_from=2024-07-01&date_to=2024-07-31
Authorization: Bearer <your-token>
```

### 2. Browse by Category
```http
GET /api/browse/events/music/
Authorization: Bearer <your-token>
```

### 3. Get Event Details
```http
GET /api/events/123/
Authorization: Bearer <your-token>
```

### 4. Search Movies and Showtimes
```http
GET /api/search/movies/?q=action&theater_location=downtown
Authorization: Bearer <your-token>
```

## Making Bookings

### 1. Book Event Tickets
```http
POST /api/customer-bookings/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "booking_type": "event",
    "event_id": 123,
    "tickets": [
        {
            "ticket_type_id": 1,
            "quantity": 2
        }
    ],
    "payment_method": "stripe"
}
```

### 2. Book Movie Tickets with Seat Selection
```http
POST /api/customer-bookings/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "booking_type": "movie",
    "showtime_id": 456,
    "seats": ["A1", "A2"],
    "payment_method": "stripe"
}
```

### 3. Process Payment
After creating a booking, you'll receive a payment intent:
```http
POST /api/bookings/789/payment/confirm/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "payment_method_id": "pm_1234567890"
}
```

## Managing Bookings

### 1. View Booking History
```http
GET /api/customer-bookings/
Authorization: Bearer <your-token>
```

### 2. Get Booking Details
```http
GET /api/customer-bookings/789/
Authorization: Bearer <your-token>
```

### 3. Cancel a Booking
```http
POST /api/customer-bookings/789/cancel/
Authorization: Bearer <your-token>
```

### 4. Download Tickets
```http
GET /api/bookings/789/tickets/pdf/
Authorization: Bearer <your-token>
```

## Profile Management

### 1. Update Profile
```http
PUT /api/auth/profile/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "phone_number": "+1234567890",
    "preferences": {
        "notification_settings": {
            "email": true,
            "sms": false
        },
        "favorite_genres": ["action", "comedy"]
    }
}
```

### 2. Change Password
```http
POST /api/auth/password/change/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "old_password": "current_password",
    "new_password": "new_secure_password"
}
```

## Error Handling

All API errors follow a consistent format:
```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "The provided data is invalid",
        "details": {
            "seats": ["Selected seats are no longer available"]
        },
        "timestamp": "2024-01-15T10:30:00Z"
    }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_REQUIRED`: Missing or invalid token
- `PERMISSION_DENIED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BOOKING_UNAVAILABLE`: Seats/tickets no longer available
- `PAYMENT_FAILED`: Payment processing error
"""

EVENT_OWNER_USAGE_GUIDE = """
# Event Owner API Usage Guide

This guide covers API operations for event owners to create and manage events.

## Authentication

Event owners must register with the "event_owner" role:
```http
POST /api/auth/register/
Content-Type: application/json

{
    "username": "event_organizer",
    "email": "organizer@example.com",
    "password": "secure_password123",
    "role": "event_owner",
    "phone_number": "+1234567890"
}
```

## Event Management

### 1. Create a New Event
```http
POST /api/events/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "title": "Summer Music Festival 2024",
    "description": "Amazing summer music festival with top artists",
    "venue": "Central Park Amphitheater",
    "address": "123 Park Avenue, New York, NY 10001",
    "category": "music",
    "start_datetime": "2024-07-15T18:00:00Z",
    "end_datetime": "2024-07-15T23:00:00Z",
    "media": [
        "https://example.com/poster.jpg"
    ]
}
```

### 2. Add Ticket Types
```http
POST /api/ticket-types/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "event": 123,
    "name": "VIP",
    "price": "150.00",
    "quantity_available": 100,
    "description": "VIP seating with complimentary drinks"
}
```

### 3. Create Discounts
```http
POST /api/discounts/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "event": 123,
    "code": "EARLY2024",
    "discount_type": "percentage",
    "value": 20.00,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-06-01T23:59:59Z",
    "usage_limit": 100
}
```

### 4. Update Event
```http
PUT /api/events/123/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "title": "Updated Event Title",
    "description": "Updated description"
}
```

### 5. Publish Event
```http
PATCH /api/events/123/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "status": "published"
}
```

## Analytics and Reporting

### 1. Get Event Analytics
```http
GET /api/events/123/analytics/?date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer <your-token>
```

### 2. Export Booking Report
```http
GET /api/events/123/analytics/export/?format=csv
Authorization: Bearer <your-token>
```

## Managing Bookings

### 1. View Event Bookings
```http
GET /api/events/123/bookings/
Authorization: Bearer <your-token>
```

### 2. Process Refunds
```http
POST /api/bookings/789/payment/refund/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "reason": "Event cancelled",
    "amount": "75.00"
}
```

## Best Practices

1. **Event Status Management**: Always start with "draft" status and publish when ready
2. **Ticket Pricing**: Set competitive prices and use discounts strategically
3. **Media Upload**: Provide high-quality images and videos for better engagement
4. **Analytics Monitoring**: Regularly check analytics to optimize performance
5. **Customer Communication**: Use the notification system for updates
"""

THEATER_OWNER_USAGE_GUIDE = """
# Theater Owner API Usage Guide

This guide covers API operations for theater owners to manage theaters and showtimes.

## Authentication

Theater owners must register with the "theater_owner" role:
```http
POST /api/auth/register/
Content-Type: application/json

{
    "username": "theater_manager",
    "email": "manager@theater.com",
    "password": "secure_password123",
    "role": "theater_owner",
    "phone_number": "+1234567890"
}
```

## Theater Management

### 1. Create a Theater
```http
POST /api/theaters/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "name": "Downtown Cinema",
    "address": "456 Main Street, Downtown, NY 10001",
    "screens": 8,
    "seating_layout": {
        "screens": [
            {
                "screen_number": 1,
                "rows": 15,
                "seats_per_row": 20,
                "vip_rows": [1, 2, 3],
                "pricing": {
                    "regular": 12.00,
                    "vip": 18.00
                }
            }
        ]
    },
    "amenities": ["parking", "concessions", "wheelchair_accessible"]
}
```

### 2. Add Movies
```http
POST /api/movies/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "title": "Action Movie 2024",
    "genre": "action",
    "duration": 120,
    "cast": ["Actor A", "Actor B"],
    "director": "Director Name",
    "rating": "PG-13",
    "description": "An exciting action movie",
    "poster_url": "https://example.com/poster.jpg",
    "trailer_url": "https://example.com/trailer.mp4"
}
```

### 3. Schedule Showtimes
```http
POST /api/showtimes/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "theater": 123,
    "movie": 456,
    "screen_number": 1,
    "start_time": "2024-07-15T19:00:00Z",
    "base_price": "12.00"
}
```

### 4. Update Pricing
```http
PATCH /api/showtimes/789/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "base_price": "15.00"
}
```

## Seat Management

### 1. Check Seat Availability
```http
GET /api/showtimes/789/seats/
Authorization: Bearer <your-token>
```

### 2. Block Seats for Maintenance
```http
POST /api/showtimes/789/block-seats/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "seats": ["A1", "A2"],
    "reason": "maintenance"
}
```

## Analytics and Reporting

### 1. Get Theater Analytics
```http
GET /api/theaters/123/analytics/?date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer <your-token>
```

### 2. Movie Performance Report
```http
GET /api/movies/456/analytics/
Authorization: Bearer <your-token>
```

### 3. Occupancy Reports
```http
GET /api/theaters/123/occupancy/?date=2024-07-15
Authorization: Bearer <your-token>
```

## Best Practices

1. **Showtime Scheduling**: Avoid conflicts and allow buffer time between shows
2. **Dynamic Pricing**: Adjust prices based on demand and time slots
3. **Seat Layout**: Design layouts for optimal viewing and accessibility
4. **Movie Selection**: Choose popular movies and monitor performance
5. **Maintenance**: Regular seat blocking for maintenance and cleaning
"""

ADMIN_USAGE_GUIDE = """
# Admin API Usage Guide

This guide covers administrative operations for system management.

## Authentication

Admins have access to all system functions:
```http
POST /api/auth/login/
Content-Type: application/json

{
    "email": "admin@moviebooking.com",
    "password": "admin_password"
}
```

## User Management

### 1. List All Users
```http
GET /api/admin/users/?role=customer&status=active
Authorization: Bearer <your-token>
```

### 2. Update User Status
```http
PATCH /api/admin/users/123/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "is_active": false,
    "reason": "Terms violation"
}
```

### 3. View User Activity
```http
GET /api/admin/users/123/activity/
Authorization: Bearer <your-token>
```

## Content Moderation

### 1. Review Pending Events
```http
GET /api/admin/events/pending/
Authorization: Bearer <your-token>
```

### 2. Approve/Reject Events
```http
POST /api/admin/events/123/moderate/
Authorization: Bearer <your-token>
Content-Type: application/json

{
    "action": "approve",
    "notes": "Event meets all guidelines"
}
```

## System Analytics

### 1. System-wide Metrics
```http
GET /api/admin/analytics/system/
Authorization: Bearer <your-token>
```

### 2. Revenue Reports
```http
GET /api/admin/analytics/revenue/?period=monthly&year=2024
Authorization: Bearer <your-token>
```

### 3. User Growth Analytics
```http
GET /api/admin/analytics/users/growth/
Authorization: Bearer <your-token>
```

## Audit Logs

### 1. View Audit Logs
```http
GET /api/admin/audit-logs/?user_id=123&action=booking_created
Authorization: Bearer <your-token>
```

### 2. Export Audit Report
```http
GET /api/admin/audit-logs/export/?format=csv&date_from=2024-01-01
Authorization: Bearer <your-token>
```

## System Health

### 1. Health Check
```http
GET /api/admin/health/
Authorization: Bearer <your-token>
```

### 2. Performance Metrics
```http
GET /api/admin/performance/
Authorization: Bearer <your-token>
```

## Best Practices

1. **Regular Monitoring**: Check system health and performance daily
2. **Content Review**: Moderate new content within 24 hours
3. **User Support**: Respond to user issues promptly
4. **Security**: Monitor for suspicious activities
5. **Backup**: Ensure regular data backups are performed
"""

INTEGRATION_EXAMPLES = """
# Integration Examples

## JavaScript/React Integration

### Setup API Client
```javascript
class MovieBookingAPI {
    constructor(baseURL = 'http://localhost:8000/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('access_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        return response.json();
    }

    async login(email, password) {
        const response = await this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        this.token = response.access;
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        
        return response;
    }

    async searchEvents(query, filters = {}) {
        const params = new URLSearchParams({ q: query, ...filters });
        return this.request(`/search/events/?${params}`);
    }

    async createBooking(bookingData) {
        return this.request('/customer-bookings/', {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    }
}

// Usage
const api = new MovieBookingAPI();

// Login
await api.login('user@example.com', 'password');

// Search events
const events = await api.searchEvents('concert', { location: 'new york' });

// Create booking
const booking = await api.createBooking({
    booking_type: 'event',
    event_id: 123,
    tickets: [{ ticket_type_id: 1, quantity: 2 }]
});
```

## Python Integration

### Setup API Client
```python
import requests
from typing import Dict, Any, Optional

class MovieBookingAPI:
    def __init__(self, base_url: str = 'http://localhost:8000/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None

    def set_token(self, token: str):
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})

    def request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        
        if not response.ok:
            error_data = response.json()
            raise Exception(error_data.get('error', {}).get('message', 'API request failed'))
        
        return response.json()

    def login(self, email: str, password: str) -> Dict[str, Any]:
        data = {'email': email, 'password': password}
        response = self.request('POST', '/auth/login/', json=data)
        
        self.set_token(response['access'])
        return response

    def search_events(self, query: str, **filters) -> Dict[str, Any]:
        params = {'q': query, **filters}
        return self.request('GET', '/search/events/', params=params)

    def create_booking(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.request('POST', '/customer-bookings/', json=booking_data)

# Usage
api = MovieBookingAPI()

# Login
login_response = api.login('user@example.com', 'password')

# Search events
events = api.search_events('concert', location='new york')

# Create booking
booking = api.create_booking({
    'booking_type': 'event',
    'event_id': 123,
    'tickets': [{'ticket_type_id': 1, 'quantity': 2}]
})
```

## Mobile App Integration (React Native)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileBookingAPI {
    constructor() {
        this.baseURL = 'https://api.moviebooking.com/api';
    }

    async getToken() {
        return await AsyncStorage.getItem('access_token');
    }

    async setToken(token) {
        await AsyncStorage.setItem('access_token', token);
    }

    async apiCall(endpoint, options = {}) {
        const token = await this.getToken();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        if (!response.ok) {
            throw new Error('Network request failed');
        }

        return response.json();
    }

    async getNearbyEvents(latitude, longitude, radius = 10) {
        return this.apiCall(`/search/nearby/?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    }

    async getRecommendations() {
        return this.apiCall('/recommendations/');
    }
}
```
"""

# Combine all guides
API_USAGE_GUIDES = {
    'customer': CUSTOMER_USAGE_GUIDE,
    'event_owner': EVENT_OWNER_USAGE_GUIDE,
    'theater_owner': THEATER_OWNER_USAGE_GUIDE,
    'admin': ADMIN_USAGE_GUIDE,
    'integration': INTEGRATION_EXAMPLES,
}