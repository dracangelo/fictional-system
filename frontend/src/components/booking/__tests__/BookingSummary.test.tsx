import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookingSummary } from '../BookingSummary';
import type { BookingSummaryData } from '../../../types/seat';

const mockBookingSummaryData: BookingSummaryData = {
  selectedSeats: [
    {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'vip',
      status: 'selected',
      price: 18.00
    },
    {
      id: 'A2',
      row: 'A',
      number: 2,
      category: 'regular',
      status: 'selected',
      price: 12.50
    }
  ],
  subtotal: 30.50,
  fees: 3.05,
  taxes: 2.44,
  total: 35.99,
  showtimeId: 'showtime-1',
  movieTitle: 'Test Movie',
  theaterName: 'Test Theater',
  showtime: '2024-01-15T19:30:00Z'
};

describe('BookingSummary', () => {
  const mockOnProceedToPayment = vi.fn();
  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    mockOnProceedToPayment.mockClear();
    mockOnClearSelection.mockClear();
  });

  it('renders movie and theater information', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test Theater')).toBeInTheDocument();
  });

  it('displays selected seats correctly', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('REGULAR')).toBeInTheDocument();
  });

  it('shows correct price breakdown', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('$30.50')).toBeInTheDocument(); // Subtotal
    expect(screen.getByText('$3.05')).toBeInTheDocument();  // Fees
    expect(screen.getByText('$2.44')).toBeInTheDocument();  // Taxes
    expect(screen.getByText('$35.99')).toBeInTheDocument(); // Total
  });

  it('groups seats by category correctly', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    // Should show VIP section with 1 seat
    expect(screen.getAllByText('1 seat')).toHaveLength(2); // VIP and regular sections
    
    // Should show calculation for VIP seat
    expect(screen.getByText('$18.00 × 1 = $18.00')).toBeInTheDocument();
    
    // Should show calculation for regular seat
    expect(screen.getByText('$12.50 × 1 = $12.50')).toBeInTheDocument();
  });

  it('calls onProceedToPayment when proceed button is clicked', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    const proceedButton = screen.getByText('Proceed to Payment');
    fireEvent.click(proceedButton);
    
    expect(mockOnProceedToPayment).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSelection when clear button is clicked', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    const clearButtons = screen.getAllByText('Clear All');
    fireEvent.click(clearButtons[0]); // Click the first clear button
    
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no seats selected', () => {
    const emptyData = {
      ...mockBookingSummaryData,
      selectedSeats: [],
      subtotal: 0,
      fees: 0,
      taxes: 0,
      total: 0
    };

    render(
      <BookingSummary
        data={emptyData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('No seats selected')).toBeInTheDocument();
    expect(screen.getByText('Choose your seats from the map above')).toBeInTheDocument();
    expect(screen.getByText('Select Seats to Continue')).toBeInTheDocument();
  });

  it('disables proceed button when no seats selected', () => {
    const emptyData = {
      ...mockBookingSummaryData,
      selectedSeats: [],
      subtotal: 0,
      fees: 0,
      taxes: 0,
      total: 0
    };

    render(
      <BookingSummary
        data={emptyData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    const proceedButton = screen.getByText('Select Seats to Continue');
    expect(proceedButton).toBeDisabled();
  });

  it('shows loading state correctly', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
        loading={true}
      />
    );
    
    const proceedButton = screen.getByRole('button', { name: /Proceed to Payment/ });
    expect(proceedButton).toBeDisabled();
  });

  it('formats currency correctly', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    // Check that prices are formatted as currency
    expect(screen.getByText('$30.50')).toBeInTheDocument();
    expect(screen.getByText('$35.99')).toBeInTheDocument();
  });

  it('formats datetime correctly', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    // Should format the datetime string into readable format
    // The exact format depends on locale, but should contain date/time info
    const datetimeElement = screen.getByText(/Mon, Jan 15/);
    expect(datetimeElement).toBeInTheDocument();
  });

  it('shows additional booking information', () => {
    render(
      <BookingSummary
        data={mockBookingSummaryData}
        onProceedToPayment={mockOnProceedToPayment}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('• Seats are held for 10 minutes during selection')).toBeInTheDocument();
    expect(screen.getByText('• All sales are final - no refunds after purchase')).toBeInTheDocument();
    expect(screen.getByText('• Please arrive 15 minutes before showtime')).toBeInTheDocument();
  });
});