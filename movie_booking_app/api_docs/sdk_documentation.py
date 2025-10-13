"""
SDK Documentation and Integration Examples for Movie & Event Booking API.
"""

PYTHON_SDK_DOCS = """
# Python SDK Documentation

## Installation

```bash
pip install movie-booking-api-client
```

## Quick Start

```python
from movie_booking_api import MovieBookingClient

# Initialize client
client = MovieBookingClient(
    base_url='https://api.moviebooking.com',
    api_key='your-api-key'
)

# Authenticate user
auth_response = client.auth.login('user@example.com', 'password')
client.set_token(auth_response['access'])

# Search for events
events = client.events.search(
    query='concert',
    location='New York'
)

# Create a booking
booking = client.bookings.create({
    'booking_type': 'event',
    'event_id': events['results'][0]['id'],
    'tickets': [{'ticket_type_id': 1, 'quantity': 2}]
})

print(f"Booking confirmed: {booking['booking_reference']}")
```
"""

JAVASCRIPT_SDK_DOCS = """
# JavaScript SDK Documentation

## Installation

```bash
npm install @moviebooking/api-client
```

## Quick Start

```javascript
import { MovieBookingClient } from '@moviebooking/api-client';

const client = new MovieBookingClient({
    baseURL: 'https://api.moviebooking.com'
});

// Authenticate
const authResponse = await client.auth.login('user@example.com', 'password');
client.setToken(authResponse.access);

// Search events
const events = await client.events.search({
    query: 'concert',
    location: 'New York'
});

// Create booking
const booking = await client.bookings.create({
    bookingType: 'event',
    eventId: events.results[0].id,
    tickets: [{ ticketTypeId: 1, quantity: 2 }]
});

console.log(`Booking created: ${booking.bookingReference}`);
```
"""

WEBHOOK_DOCUMENTATION = """
# Webhook Documentation

## Overview

The Movie & Event Booking API supports webhooks to notify your application about important events in real-time.

## Webhook Events

### Booking Events
- `booking.created` - New booking created
- `booking.confirmed` - Booking confirmed after payment
- `booking.cancelled` - Booking cancelled by user or system

### Payment Events
- `payment.succeeded` - Payment processed successfully
- `payment.failed` - Payment processing failed
- `payment.refunded` - Refund processed

## Webhook Payload Format

```json
{
    "id": "evt_1234567890",
    "type": "booking.confirmed",
    "created": "2024-01-15T10:30:00Z",
    "data": {
        "object": {
            "id": 123,
            "booking_reference": "BK-2024-001",
            "customer": {
                "id": 456,
                "email": "customer@example.com"
            },
            "total_amount": "150.00",
            "status": "confirmed"
        }
    },
    "api_version": "v1"
}
```

## Setting Up Webhooks

### Create Webhook Endpoint

```python
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import hmac
import hashlib

@csrf_exempt
def webhook_handler(request):
    payload = request.body
    signature = request.META.get('HTTP_X_MOVIEBOOKING_SIGNATURE')
    
    # Verify webhook signature
    if not verify_signature(payload, signature):
        return HttpResponse(status=400)
    
    # Parse webhook data
    event = json.loads(payload)
    
    # Handle different event types
    if event['type'] == 'booking.confirmed':
        handle_booking_confirmed(event['data']['object'])
    
    return HttpResponse(status=200)

def verify_signature(payload, signature):
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected_signature}", signature)
```
"""

# Combine all documentation
SDK_DOCUMENTATION = {
    'python': PYTHON_SDK_DOCS,
    'javascript': JAVASCRIPT_SDK_DOCS,
    'webhooks': WEBHOOK_DOCUMENTATION,
}