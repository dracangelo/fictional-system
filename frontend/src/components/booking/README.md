# Checkout Flow Implementation

This directory contains the complete checkout flow implementation for the movie and event booking application.

## Components

### CheckoutModal
The main modal component that orchestrates the entire checkout process. It manages the flow between different steps and handles state management.

**Features:**
- Multi-step checkout process with progress indicators
- Error handling and validation
- State management across steps
- Integration with payment processing

### CheckoutProgress
A visual progress indicator that shows the current step in the checkout process.

**Steps:**
1. **Review** - Booking summary and details
2. **Payment** - Secure payment processing
3. **Complete** - Confirmation and ticket download

### BookingSummaryStep
The first step of checkout that displays booking details and allows discount code application.

**Features:**
- Event/movie information display
- Selected seats/tickets summary
- Price breakdown with taxes and fees
- Discount code validation and application
- Terms and conditions

### PaymentStep
Secure payment processing step using Stripe Elements.

**Features:**
- Stripe Elements integration for secure card input
- Billing information collection
- Payment validation and error handling
- Real-time payment processing
- Security indicators

### ConfirmationStep
Final step showing booking confirmation and ticket management options.

**Features:**
- Booking confirmation display
- Ticket information and QR codes
- Ticket download (PDF) functionality
- Email tickets option
- Important booking information
- Support contact details

## Usage

```tsx
import { CheckoutModal } from './components/booking';

const MyComponent = () => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const bookingData = {
    booking_type: 'movie',
    showtime: 'showtime-123',
    tickets: [
      { seat_number: 'A1', ticket_type: 'regular' },
    ],
    payment_method: { type: 'stripe', token: '' },
  };

  const summaryData = {
    selectedSeats: [
      { id: 'A1', category: 'regular', price: 12.50, available: false },
    ],
    subtotal: 12.50,
    fees: 1.25,
    taxes: 1.00,
    total: 14.75,
    movieTitle: 'Avengers: Endgame',
    theaterName: 'AMC Empire 25',
    showtime: '2024-01-15T19:30:00Z',
  };

  const handleSuccess = (booking) => {
    console.log('Booking successful:', booking);
    // Redirect or update UI
  };

  return (
    <CheckoutModal
      isOpen={isCheckoutOpen}
      onClose={() => setIsCheckoutOpen(false)}
      bookingData={bookingData}
      summaryData={summaryData}
      onSuccess={handleSuccess}
    />
  );
};
```

## Environment Setup

Add your Stripe publishable key to your environment variables:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Testing

The checkout flow includes comprehensive tests:

- **Unit tests** for individual components
- **Integration tests** for the complete flow
- **Error scenario tests** for payment failures
- **User interaction tests** for form validation

Run tests with:
```bash
npm test src/components/booking/__tests__/
```

## Demo

Visit `/checkout-demo` to see the complete checkout flow in action with test data and Stripe test mode.

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC.

## Security

- All payment processing is handled securely through Stripe
- No sensitive payment data is stored locally
- PCI compliance through Stripe's secure infrastructure
- Input validation and sanitization
- HTTPS required for production

## Error Handling

The checkout flow handles various error scenarios:

- Network connectivity issues
- Payment processing failures
- Invalid discount codes
- Form validation errors
- Session timeouts
- Seat availability changes

## Accessibility

- Full keyboard navigation support
- Screen reader compatibility with ARIA labels
- High contrast color schemes
- Focus management for modal interactions
- Semantic HTML structure

## Performance

- Lazy loading of Stripe Elements
- Optimized re-renders with React.memo
- Efficient state management
- Image optimization for confirmation step
- Minimal bundle size impact