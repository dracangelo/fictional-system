import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookingSummaryStep } from '../BookingSummaryStep';
import { bookingService } from '../../../services/booking';
import type { CreateBookingData } from '../../../types/booking';
import type { BookingSummaryData } from '../../../types/seat';

// Mock the booking service
vi.mock('../../../services/booking', () => ({
  bookingService: {
    validateDiscountCode: vi.fn(),
  },
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

describe('BookingSummaryStep', () => {
  const mockOnNext = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders booking summary correctly', () => {
    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test Theater')).toBeInTheDocument();
    expect(screen.getByText('Selected Seats')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
  });

  it('displays price breakdown correctly', () => {
    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    // Check for specific price breakdown items
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Service Fees')).toBeInTheDocument();
    expect(screen.getByText('Taxes')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('$29.75')).toBeInTheDocument(); // Total should be unique
  });

  it('handles discount code application', async () => {
    const mockDiscountResult = {
      valid: true,
      discount_amount: 5.00,
      discount_percentage: 0,
      message: 'Discount applied successfully',
    };

    vi.mocked(bookingService.validateDiscountCode).mockResolvedValue(mockDiscountResult);

    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    const discountInput = screen.getByPlaceholderText('Enter discount code');
    const applyButton = screen.getByText('Apply');

    fireEvent.change(discountInput, { target: { value: 'SAVE5' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(bookingService.validateDiscountCode).toHaveBeenCalledWith(
        'SAVE5',
        mockBookingData.event,
        mockBookingData.showtime
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Discount Applied: SAVE5')).toBeInTheDocument();
    });
  });

  it('handles invalid discount code', async () => {
    const mockDiscountResult = {
      valid: false,
      discount_amount: 0,
      discount_percentage: 0,
      message: 'Invalid discount code',
    };

    vi.mocked(bookingService.validateDiscountCode).mockResolvedValue(mockDiscountResult);

    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    const discountInput = screen.getByPlaceholderText('Enter discount code');
    const applyButton = screen.getByText('Apply');

    fireEvent.change(discountInput, { target: { value: 'INVALID' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid discount code')).toBeInTheDocument();
    });
  });

  it('removes applied discount', async () => {
    const mockDiscountResult = {
      valid: true,
      discount_amount: 5.00,
      discount_percentage: 0,
      message: 'Discount applied successfully',
    };

    vi.mocked(bookingService.validateDiscountCode).mockResolvedValue(mockDiscountResult);

    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    // Apply discount first
    const discountInput = screen.getByPlaceholderText('Enter discount code');
    const applyButton = screen.getByText('Apply');

    fireEvent.change(discountInput, { target: { value: 'SAVE5' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('Discount Applied: SAVE5')).toBeInTheDocument();
    });

    // Remove discount
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    expect(screen.queryByText('Discount Applied: SAVE5')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter discount code')).toBeInTheDocument();
  });

  it('calls onNext when proceed button is clicked', () => {
    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mockSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    const proceedButton = screen.getByText('Proceed to Payment');
    const cancelButton = screen.getByText('Cancel');

    expect(proceedButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('groups seats by category correctly', () => {
    const mixedSummaryData: BookingSummaryData = {
      ...mockSummaryData,
      selectedSeats: [
        { id: 'A1', category: 'regular', price: 12.50, available: false },
        { id: 'A2', category: 'regular', price: 12.50, available: false },
        { id: 'B1', category: 'vip', price: 20.00, available: false },
      ],
    };

    render(
      <BookingSummaryStep
        bookingData={mockBookingData}
        summaryData={mixedSummaryData}
        onNext={mockOnNext}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('REGULAR')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });
});