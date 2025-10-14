import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CheckoutModal } from '../CheckoutModal';
import { bookingService } from '../../../services/booking';
import type { CreateBookingData } from '../../../types/booking';
import type { BookingSummaryData } from '../../../types/seat';

// Mock the booking service
vi.mock('../../../services/booking', () => ({
  bookingService: {
    createPaymentIntent: vi.fn(),
    confirmPayment: vi.fn(),
    validateDiscountCode: vi.fn(),
    downloadTickets: vi.fn(),
    emailTickets: vi.fn(),
  },
}));

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    confirmCardPayment: vi.fn(),
  })),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
  useStripe: () => ({
    confirmCardPayment: vi.fn(() => Promise.resolve({
      error: null,
      paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
    })),
  }),
  useElements: () => ({
    getElement: vi.fn(() => ({})),
  }),
}));

const mockBookingData: CreateBookingData = {
  booking_type: 'movie',
  showtime: 'showtime-123',
  tickets: [
    { seat_number: 'A1', ticket_type: 'regular' },
    { seat_number: 'A2', ticket_type: 'regular' },
  ],
  payment_method: {
    type: 'stripe',
    token: '',
  },
};

const mockSummaryData: BookingSummaryData = {
  selectedSeats: [
    { id: 'A1', category: 'regular', price: 12.50, available: false },
    { id: 'A2', category: 'regular', price: 12.50, available: false },
  ],
  subtotal: 25.00,
  fees: 2.50,
  taxes: 2.25,
  total: 29.75,
  movieTitle: 'Test Movie',
  theaterName: 'Test Theater',
  showtime: '2024-01-15T19:30:00Z',
};

describe('Checkout Flow Integration', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full checkout flow successfully', async () => {
    // Mock successful payment intent creation
    const mockPaymentIntent = {
      client_secret: 'pi_test_123_secret',
      amount: 2975,
      currency: 'usd',
      booking_id: 'booking-123',
    };

    // Mock successful booking confirmation
    const mockBooking = {
      id: 'booking-123',
      customer: 'user-123',
      booking_type: 'movie' as const,
      booking_reference: 'BK123456',
      total_amount: 29.75,
      payment_status: 'completed' as const,
      booking_status: 'confirmed' as const,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      tickets: [
        {
          id: 'ticket-1',
          booking: 'booking-123',
          seat_number: 'A1',
          ticket_number: 'TK123456789',
          qr_code: 'mock-qr-code',
          price: 14.875,
          status: 'valid' as const,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ],
    };

    vi.mocked(bookingService.createPaymentIntent).mockResolvedValue(mockPaymentIntent);
    vi.mocked(bookingService.confirmPayment).mockResolvedValue(mockBooking);

    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    // Step 1: Verify summary step is shown
    expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();

    // Step 2: Proceed to payment
    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(bookingService.createPaymentIntent).toHaveBeenCalledWith(mockBookingData);
    });

    // Step 3: Verify payment step is shown
    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });

    // Step 4: Fill in billing information
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    const addressInput = screen.getByLabelText('Address Line 1');
    const cityInput = screen.getByLabelText('City');
    const stateInput = screen.getByLabelText('State');
    const zipInput = screen.getByLabelText('ZIP Code');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(addressInput, { target: { value: '123 Main St' } });
    fireEvent.change(cityInput, { target: { value: 'New York' } });
    fireEvent.change(stateInput, { target: { value: 'NY' } });
    fireEvent.change(zipInput, { target: { value: '10001' } });

    // Step 5: Submit payment
    const payButton = screen.getByText(/Pay \$29\.75/);
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(bookingService.confirmPayment).toHaveBeenCalled();
    });

    // Step 6: Verify confirmation step
    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
    });

    expect(screen.getByText('BK123456')).toBeInTheDocument();
  });

  it('handles payment failure gracefully', async () => {
    const mockPaymentIntent = {
      client_secret: 'pi_test_123_secret',
      amount: 2975,
      currency: 'usd',
      booking_id: 'booking-123',
    };

    vi.mocked(bookingService.createPaymentIntent).mockResolvedValue(mockPaymentIntent);

    // Mock Stripe error
    const mockStripe = {
      confirmCardPayment: vi.fn(() => Promise.resolve({
        error: { message: 'Your card was declined.' },
        paymentIntent: null,
      })),
    };

    vi.mocked(require('@stripe/react-stripe-js').useStripe).mockReturnValue(mockStripe);

    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    // Navigate to payment step
    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Address Line 1'), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'NY' } });
    fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '10001' } });

    // Submit payment
    const payButton = screen.getByText(/Pay \$29\.75/);
    fireEvent.click(payButton);

    // Verify error is shown
    await waitFor(() => {
      expect(screen.getByText('Payment Error')).toBeInTheDocument();
      expect(screen.getByText('Your card was declined.')).toBeInTheDocument();
    });
  });

  it('allows going back from payment to summary', async () => {
    const mockPaymentIntent = {
      client_secret: 'pi_test_123_secret',
      amount: 2975,
      currency: 'usd',
      booking_id: 'booking-123',
    };

    vi.mocked(bookingService.createPaymentIntent).mockResolvedValue(mockPaymentIntent);

    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    // Go to payment step
    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });

    // Go back to summary
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
  });
});