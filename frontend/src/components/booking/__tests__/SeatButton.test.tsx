import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeatButton } from '../SeatButton';
import type { Seat } from '../../../types/seat';

const mockSeat: Seat = {
  id: 'A1',
  row: 'A',
  number: 1,
  category: 'regular',
  status: 'available',
  price: 12.50
};

const mockVipSeat: Seat = {
  id: 'A2',
  row: 'A',
  number: 2,
  category: 'vip',
  status: 'available',
  price: 18.00
};

describe('SeatButton', () => {
  const mockOnSeatClick = vi.fn();

  beforeEach(() => {
    mockOnSeatClick.mockClear();
  });

  it('renders seat number correctly', () => {
    render(<SeatButton seat={mockSeat} onSeatClick={mockOnSeatClick} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onSeatClick when available seat is clicked', () => {
    render(<SeatButton seat={mockSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnSeatClick).toHaveBeenCalledWith(mockSeat);
  });

  it('does not call onSeatClick when booked seat is clicked', () => {
    const bookedSeat = { ...mockSeat, status: 'booked' as const };
    render(<SeatButton seat={bookedSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnSeatClick).not.toHaveBeenCalled();
  });

  it('displays VIP indicator for VIP seats', () => {
    render(<SeatButton seat={mockVipSeat} onSeatClick={mockOnSeatClick} />);
    
    const vipIndicator = document.querySelector('.bg-amber-400');
    expect(vipIndicator).toBeInTheDocument();
  });

  it('shows correct tooltip text for available seat', () => {
    render(<SeatButton seat={mockSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'A1 - REGULAR - $12.50');
  });

  it('shows correct tooltip text for VIP seat', () => {
    render(<SeatButton seat={mockVipSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'A2 - VIP - $18.00');
  });

  it('shows correct tooltip text for booked seat', () => {
    const bookedSeat = { ...mockSeat, status: 'booked' as const };
    render(<SeatButton seat={bookedSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'A1 - Unavailable');
  });

  it('applies correct CSS classes for different seat statuses', () => {
    const { rerender } = render(<SeatButton seat={mockSeat} onSeatClick={mockOnSeatClick} />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100', 'border-gray-300');
    
    const selectedSeat = { ...mockSeat, status: 'selected' as const };
    rerender(<SeatButton seat={selectedSeat} onSeatClick={mockOnSeatClick} />);
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600', 'border-blue-700');
    
    const bookedSeat = { ...mockSeat, status: 'booked' as const };
    rerender(<SeatButton seat={bookedSeat} onSeatClick={mockOnSeatClick} />);
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-100', 'border-red-300');
  });

  it('is disabled for non-clickable seat statuses', () => {
    const bookedSeat = { ...mockSeat, status: 'booked' as const };
    render(<SeatButton seat={bookedSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is enabled for clickable seat statuses', () => {
    render(<SeatButton seat={mockSeat} onSeatClick={mockOnSeatClick} />);
    
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    
    const selectedSeat = { ...mockSeat, status: 'selected' as const };
    const { rerender } = render(<SeatButton seat={selectedSeat} onSeatClick={mockOnSeatClick} />);
    
    rerender(<SeatButton seat={selectedSeat} onSeatClick={mockOnSeatClick} />);
    const buttons = screen.getAllByRole('button');
    const selectedButton = buttons[buttons.length - 1]; // Get the last rendered button
    expect(selectedButton).not.toBeDisabled();
  });

  it('can hide tooltip when showTooltip is false', () => {
    render(<SeatButton seat={mockSeat} onSeatClick={mockOnSeatClick} showTooltip={false} />);
    
    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('title');
  });
});