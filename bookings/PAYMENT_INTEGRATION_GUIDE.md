# Payment Integration Guide

This document explains how to use the Stripe payment integration in the Movie and Event Booking App.

## Overview

The payment system integrates with Stripe to handle:
- Payment processing for bookings
- Webhook handling for payment status updates
- Refund processing
- Payment retry logic
- Payment failure handling

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Django Settings

The following settings are automatically configured:

```python
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')

# Payment Configuration
PAYMENT_PROCESSING_FEE_RATE = 0.03  # 3% processing fee
PAYMENT_RETRY_ATTEMPTS = 3
PAYMENT_RETRY_DELAY = 1  # seconds
```

## API Endpoints

### Payment Processing

#### Create Payment Intent
```http
POST /api/bookings/{booking_id}/payment/intent/
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "payment_method_id": "pm_1234567890",  // Optional
    "confirm_immediately": false           // Optional
}
```

#### Confirm Payment Intent
```http
POST /api/bookings/{booking_id}/payment/confirm/
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "payment_method_id": "pm_1234567890"  // Optional
}
```

#### Get Payment Status
```http
GET /api/bookings/{booking_id}/payment/status/
Authorization: Bearer {jwt_token}
```

#### Request Refund
```http
POST /api/bookings/{booking_id}/payment/refund/
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "amount": "50.00",                    // Optional partial refund amount
    "reason": "requested_by_customer"     // Optional reason
}
```

#### Retry Payment
```http
POST /api/bookings/{booking_id}/payment/retry/
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "payment_method_id": "pm_1234567890"  // Required
}
```

#### Get Stripe Configuration
```http
GET /api/payment/config/
Authorization: Bearer {jwt_token}
```

### Webhook Endpoints

#### Stripe Webhook
```http
POST /api/webhooks/stripe/
Content-Type: application/json
Stripe-Signature: {stripe_signature}

{
    "type": "payment_intent.succeeded",
    "data": {
        "object": {
            "id": "pi_1234567890",
            "status": "succeeded"
        }
    }
}
```

#### Webhook Health Check
```http
GET /api/webhooks/health/
```

## Usage Examples

### Frontend Integration

#### 1. Get Stripe Configuration
```javascript
const response = await fetch('/api/payment/config/', {
    headers: {
        'Authorization': `Bearer ${jwt_token}`
    }
});
const config = await response.json();
const stripe = Stripe(config.publishable_key);
```

#### 2. Create Payment Intent
```javascript
const response = await fetch(`/api/bookings/${bookingId}/payment/intent/`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt_token}`
    },
    body: JSON.stringify({
        payment_method_id: paymentMethodId,
        confirm_immediately: true
    })
});
const result = await response.json();
```

#### 3. Handle Payment Result
```javascript
if (result.requires_action) {
    // Handle 3D Secure or other authentication
    const {error} = await stripe.confirmCardPayment(result.client_secret);
    if (error) {
        console.error('Payment failed:', error);
    }
} else if (result.status === 'succeeded') {
    console.log('Payment succeeded!');
}
```

### Backend Service Usage

#### 1. Process Payment for Booking
```python
from bookings.services import BookingService

# Process payment
result = BookingService.process_booking_payment(
    booking=booking,
    payment_method_id='pm_1234567890',
    confirm_immediately=True
)

if result['success']:
    print(f"Payment intent created: {result['payment_intent_id']}")
else:
    print(f"Payment failed: {result['error']}")
```

#### 2. Process Refund
```python
from bookings.services import BookingService
from decimal import Decimal

# Process full refund
result = BookingService.process_booking_refund(
    booking=booking,
    reason='Customer requested refund'
)

# Process partial refund
result = BookingService.process_booking_refund(
    booking=booking,
    refund_amount=Decimal('25.00'),
    reason='Partial refund requested'
)
```

#### 3. Retry Failed Payment
```python
from bookings.services import BookingService

result = BookingService.retry_booking_payment(
    booking=booking,
    payment_method_id='pm_new_payment_method'
)
```

## Webhook Configuration

### Stripe Dashboard Setup

1. Go to your Stripe Dashboard
2. Navigate to Developers > Webhooks
3. Click "Add endpoint"
4. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/stripe/`
5. Select the following events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.requires_action`
   - `charge.dispute.created`

### Webhook Security

The webhook endpoint automatically verifies the Stripe signature using the `STRIPE_WEBHOOK_SECRET`. Make sure to:

1. Keep your webhook secret secure
2. Use HTTPS in production
3. Monitor webhook delivery in the Stripe Dashboard

## Error Handling

### Payment Errors

The system handles various payment errors:

- **Card Declined**: Returns appropriate error message
- **Insufficient Funds**: Returns appropriate error message
- **Authentication Required**: Returns `requires_action: true`
- **Network Errors**: Automatic retry with exponential backoff

### Webhook Errors

- **Invalid Signature**: Returns 400 Bad Request
- **Processing Errors**: Logged and returns 400 Bad Request
- **Unknown Event Types**: Ignored and returns 200 OK

## Testing

### Running Tests

```bash
# Run all payment integration tests
python manage.py test bookings.tests_payment_integration

# Run specific test class
python manage.py test bookings.tests_payment_integration.PaymentServiceTest

# Run with verbose output
python manage.py test bookings.tests_payment_integration -v 2
```

### Test Coverage

The test suite covers:
- Payment intent creation and confirmation
- Successful and failed payment processing
- Refund processing (full and partial)
- Webhook signature verification
- Webhook event processing
- API endpoint functionality
- Error handling scenarios

### Mock Testing

Tests use mocked Stripe API calls to avoid actual charges:

```python
@patch('stripe.PaymentIntent.create')
def test_payment_processing(self, mock_create):
    mock_create.return_value = Mock(id='pi_test123')
    # Test implementation
```

## Security Considerations

1. **API Keys**: Never expose secret keys in frontend code
2. **Webhook Signatures**: Always verify webhook signatures
3. **HTTPS**: Use HTTPS in production for all payment endpoints
4. **Input Validation**: All payment amounts and data are validated
5. **Rate Limiting**: Consider implementing rate limiting for payment endpoints
6. **Logging**: Payment operations are logged for audit purposes

## Monitoring and Logging

### Payment Logs

All payment operations are logged with the following information:
- Booking reference
- Payment intent ID
- Operation type (create, confirm, refund)
- Success/failure status
- Error messages (if any)

### Webhook Logs

Webhook events are logged with:
- Event type
- Processing status
- Error messages (if any)
- Timestamp

### Monitoring Recommendations

1. Monitor payment success/failure rates
2. Set up alerts for webhook delivery failures
3. Track refund processing times
4. Monitor for suspicious payment patterns

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL configuration in Stripe Dashboard
   - Verify HTTPS is working
   - Check webhook secret configuration

2. **Payment Intent Creation Fails**
   - Verify Stripe API keys are correct
   - Check booking amount is valid
   - Ensure booking is in correct status

3. **Refund Processing Fails**
   - Verify booking has completed payment
   - Check if booking is still refundable (event hasn't started)
   - Ensure sufficient funds in Stripe account

### Debug Mode

Enable debug logging in Django settings:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'bookings.payment_service': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## Production Deployment

### Checklist

- [ ] Replace test API keys with live keys
- [ ] Configure webhook endpoint with live URL
- [ ] Enable HTTPS
- [ ] Set up monitoring and alerting
- [ ] Configure backup webhook endpoints
- [ ] Test payment flows end-to-end
- [ ] Set up log aggregation
- [ ] Configure rate limiting
- [ ] Review security settings
- [ ] Test webhook delivery

### Environment Variables for Production

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

## Support

For issues related to:
- **Stripe Integration**: Check Stripe documentation and logs
- **Booking System**: Review booking models and services
- **API Endpoints**: Check Django REST Framework configuration
- **Webhooks**: Verify webhook configuration and signature validation

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Django REST Framework Documentation](https://www.django-rest-framework.org/)
- [Celery Documentation](https://docs.celeryproject.org/) (for async processing)