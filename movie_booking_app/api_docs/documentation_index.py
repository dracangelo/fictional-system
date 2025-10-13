"""
API Documentation Index and Navigation.

This module provides the main documentation index and navigation structure
for the Movie & Event Booking API documentation.
"""

API_DOCUMENTATION_INDEX = """
# Movie & Event Booking API Documentation

Welcome to the comprehensive API documentation for the Movie & Event Booking platform. This documentation provides everything you need to integrate with our API and build amazing booking experiences.

## Quick Navigation

### 🚀 Getting Started
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)

### 📚 API Reference
- [Interactive API Docs](/api/docs/) - Swagger UI
- [API Schema](/api/redoc/) - ReDoc Documentation
- [OpenAPI Schema](/api/schema/) - Raw OpenAPI 3.0 Schema

### 👥 User Role Guides
- [Customer Guide](/api/guides/customer/) - For end users booking events and movies
- [Event Owner Guide](/api/guides/event_owner/) - For event organizers
- [Theater Owner Guide](/api/guides/theater_owner/) - For theater managers
- [Admin Guide](/api/guides/admin/) - For system administrators

### 🛠️ Integration Resources
- [SDK Documentation](#sdk-documentation)
- [Code Examples](/api/guides/integration/)
- [Webhook Documentation](#webhooks)
- [Postman Collection](#postman-collection)

### 📋 API Versions
- [Version Information](/api/versions/)
- [Migration Guides](#migration-guides)
- [Changelog](#changelog)

## API Overview

The Movie & Event Booking API is a RESTful API that enables you to:

- **Manage Users**: Registration, authentication, and profile management
- **Discover Content**: Search events and movies with advanced filtering
- **Handle Bookings**: Create, manage, and process bookings with real-time seat selection
- **Process Payments**: Secure payment processing with multiple providers
- **Send Notifications**: Email and SMS notifications for booking updates
- **Access Analytics**: Comprehensive reporting and analytics

### Base URL
```
Production: https://api.moviebooking.com
Development: http://localhost:8000
```

### API Versioning
Current stable version: **v1**

All API endpoints are versioned. You can specify the version in the URL:
```
https://api.moviebooking.com/api/v1/events/
```

Or use the default (v1) without version specification:
```
https://api.moviebooking.com/api/events/
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include your token in the Authorization header:

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Getting a Token

```http
POST /api/auth/login/
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "your_password"
}
```

**Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
        "id": 1,
        "username": "user",
        "email": "user@example.com",
        "role": "customer"
    }
}
```

### Token Refresh

```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## Rate Limiting

API requests are rate limited to ensure fair usage:

- **Authenticated users**: 100 requests per minute
- **Anonymous users**: 20 requests per minute
- **Login attempts**: 5 requests per minute
- **Booking operations**: 20 requests per minute

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## Error Handling

All API errors follow a consistent format:

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "The provided data is invalid",
        "details": {
            "email": ["This field is required."],
            "password": ["Password must be at least 8 characters."]
        },
        "timestamp": "2024-01-15T10:30:00Z"
    }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BOOKING_UNAVAILABLE` | 409 | Seats/tickets no longer available |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Core Endpoints

### Authentication Endpoints
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/` - Update user profile

### Event Endpoints
- `GET /api/events/` - List events
- `POST /api/events/` - Create event (event owners)
- `GET /api/events/{id}/` - Get event details
- `PUT /api/events/{id}/` - Update event (owners)
- `GET /api/search/events/` - Search events

### Theater Endpoints
- `GET /api/theaters/` - List theaters
- `POST /api/theaters/` - Create theater (theater owners)
- `GET /api/movies/` - List movies
- `GET /api/showtimes/` - List showtimes

### Booking Endpoints
- `POST /api/customer-bookings/` - Create booking
- `GET /api/customer-bookings/` - List user bookings
- `GET /api/customer-bookings/{id}/` - Get booking details
- `POST /api/customer-bookings/{id}/cancel/` - Cancel booking

## SDK Documentation

We provide official SDKs for popular programming languages:

### Python SDK
```bash
pip install movie-booking-api-client
```

```python
from movie_booking_api import MovieBookingClient

client = MovieBookingClient('https://api.moviebooking.com')
events = client.events.search('concert')
```

### JavaScript SDK
```bash
npm install @moviebooking/api-client
```

```javascript
import { MovieBookingClient } from '@moviebooking/api-client';

const client = new MovieBookingClient({
    baseURL: 'https://api.moviebooking.com'
});
const events = await client.events.search({ query: 'concert' });
```

### Mobile SDKs
- **React Native**: `@moviebooking/react-native-sdk`
- **iOS (Swift)**: Available via Swift Package Manager
- **Android (Kotlin)**: Available via Maven Central
- **Flutter**: `movie_booking_sdk`

## Webhooks

Stay informed about important events with webhooks:

```bash
curl -X POST https://api.moviebooking.com/api/webhooks/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "url": "https://your-app.com/webhooks",
    "events": ["booking.confirmed", "payment.failed"]
  }'
```

**Supported Events:**
- `booking.created`, `booking.confirmed`, `booking.cancelled`
- `payment.succeeded`, `payment.failed`, `payment.refunded`
- `event.published`, `event.updated`, `event.cancelled`

## Postman Collection

Import our Postman collection for easy API testing:

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/moviebooking-api)

The collection includes:
- Pre-configured authentication
- All API endpoints with examples
- Environment variables for different stages
- Automated tests for common workflows

## Migration Guides

### Upgrading to v2 (Coming Soon)

API v2 will introduce several enhancements:
- OAuth2 authentication support
- Real-time notifications via WebSocket
- Enhanced search with AI recommendations
- Multi-language content support

[View detailed migration guide](/api/version-info/v2/)

## Support and Community

### Getting Help
- **Documentation Issues**: [GitHub Issues](https://github.com/moviebooking/api-docs/issues)
- **API Support**: support@moviebooking.com
- **Developer Community**: [Discord](https://discord.gg/moviebooking-dev)

### Status Page
Monitor API status and uptime: [status.moviebooking.com](https://status.moviebooking.com)

### Changelog
Stay updated with API changes: [View Changelog](#changelog)

## Terms and Compliance

- [API Terms of Service](https://moviebooking.com/api-terms)
- [Privacy Policy](https://moviebooking.com/privacy)
- [Rate Limiting Policy](https://moviebooking.com/rate-limits)
- [SLA](https://moviebooking.com/sla)

---

**Last Updated**: January 15, 2024  
**API Version**: v1.0.0  
**Documentation Version**: 1.0.0
"""

CHANGELOG = """
# API Changelog

All notable changes to the Movie & Event Booking API will be documented here.

## [1.0.0] - 2024-01-15

### Added
- Initial stable release of API v1
- JWT authentication system
- Event management endpoints
- Theater and movie management
- Booking system with real-time seat selection
- Payment processing with Stripe integration
- Notification system (email and SMS)
- Search and discovery features
- Analytics and reporting endpoints
- Admin system management
- Comprehensive API documentation
- SDK support for Python and JavaScript
- Webhook system for real-time notifications

### Security
- Rate limiting implementation
- Input validation and sanitization
- CORS configuration
- Audit logging system

## [0.9.0] - 2024-01-01

### Added
- Beta release for testing
- Core booking functionality
- Basic authentication
- Event and theater management

### Changed
- Improved error handling
- Enhanced validation

## [0.8.0] - 2023-12-15

### Added
- Alpha release
- Basic API structure
- User management
- Event creation

---

## Upcoming in v2.0.0

### Planned Features
- OAuth2 authentication
- WebSocket real-time notifications
- AI-powered recommendations
- Multi-language support
- Enhanced analytics
- GraphQL endpoint support
- Improved mobile SDKs

### Breaking Changes
- Authentication endpoint modifications
- Response format updates
- New required fields in some requests

**Expected Release**: Q2 2024
"""

POSTMAN_COLLECTION_INFO = """
# Postman Collection

## Overview

Our Postman collection provides a complete set of API requests for testing and development. It includes all endpoints with proper authentication, example requests, and automated tests.

## Import Collection

### Method 1: Direct Import
1. Open Postman
2. Click "Import" button
3. Use this URL: `https://api.moviebooking.com/postman/collection.json`

### Method 2: Run in Postman Button
[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/moviebooking-api)

## Collection Structure

### 📁 Authentication
- Register User
- Login User
- Refresh Token
- Get Profile
- Update Profile

### 📁 Events
- List Events
- Create Event
- Get Event Details
- Update Event
- Delete Event
- Search Events

### 📁 Theaters & Movies
- List Theaters
- Create Theater
- List Movies
- Create Movie
- List Showtimes
- Create Showtime

### 📁 Bookings
- Create Booking
- List Bookings
- Get Booking Details
- Cancel Booking
- Download Tickets

### 📁 Admin
- System Analytics
- User Management
- Audit Logs

## Environment Variables

The collection uses environment variables for easy configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `https://api.moviebooking.com` |
| `access_token` | JWT access token | Auto-set after login |
| `refresh_token` | JWT refresh token | Auto-set after login |
| `user_id` | Current user ID | Auto-set after login |

## Pre-request Scripts

The collection includes pre-request scripts that:
- Automatically refresh expired tokens
- Set authentication headers
- Generate test data
- Validate environment setup

## Test Scripts

Each request includes test scripts that verify:
- Response status codes
- Response structure
- Data validation
- Authentication state
- Rate limiting headers

## Usage Examples

### 1. Quick Setup
1. Import the collection
2. Set the `base_url` environment variable
3. Run the "Login User" request
4. All subsequent requests will use the authentication token automatically

### 2. Running Tests
- Use the Collection Runner to execute all tests
- Set up different environments (dev, staging, production)
- Generate test reports

### 3. Custom Workflows
Create custom workflows by chaining requests:
1. Register → Login → Create Event → Create Booking → Process Payment

## Advanced Features

### Mock Server
Use Postman's mock server feature with our collection to:
- Test frontend applications without backend
- Simulate different response scenarios
- Test error handling

### Monitoring
Set up Postman monitoring to:
- Check API health regularly
- Monitor response times
- Get alerts for failures

### Documentation
Generate API documentation directly from the collection:
- Automatic documentation from request examples
- Markdown export for integration into your docs
- Shareable documentation links
"""