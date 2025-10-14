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
    confirmCardPayment: vi.fn(),
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

describe('CheckoutModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders checkout modal when open', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CheckoutModal
        isOpen={false}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Review Your Booking')).not.toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('proceeds to payment step when next is clicked', async () => {
    const mockPaymentIntent = {
      client_secret: 'pi_test_123',
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

    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(bookingService.createPaymentIntent).toHaveBeenCalledWith(mockBookingData);
    });
  });

  it('handles payment intent creation error', async () => {
    const errorMessage = 'Payment initialization failed';
    vi.mocked(bookingService.createPaymentIntent).mockRejectedValue({
      response: { data: { message: errorMessage } },
    });

    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(screen.getByText('Payment Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets state when modal opens', () => {
    const { rerender } = render(
      <CheckoutModal
        isOpen={false}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    rerender(
      <CheckoutModal
        isOpen={true}
        onClose={mockOnClose}
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
  });
});