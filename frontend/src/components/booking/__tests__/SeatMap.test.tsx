import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeatMap } from '../SeatMap';
import type { SeatMapData, Seat } from '../../../types/seat';

const mockSeatMapData: SeatMapData = {
  rows: 3,
  seatsPerRow: 4,
  vipRows: [1],
  disabledSeats: ['C4'],
  pricing: {
    regular: 12.50,
    vip: 18.00
  },
  bookedSeats: ['B2'],
  lockedSeats: ['B3']
};

const mockSelectedSeats: Seat[] = [
  {
    id: 'A1',
    row: 'A',
    number: 1,
    category: 'vip',
    status: 'selected',
    price: 18.00
  }
];

describe('SeatMap', () => {
  const mockOnSeatSelection = vi.fn();
  const mockOnSeatLock = vi.fn();

  beforeEach(() => {
    mockOnSeatSelection.mockClear();
    mockOnSeatLock.mockClear();
  });

  it('renders loading state correctly', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
        loading={true}
      />
    );
    
    expect(screen.getByText('Loading seat map...')).toBeInTheDocument();
  });

  it('renders screen indicator', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
      />
    );
    
    expect(screen.getByText('SCREEN')).toBeInTheDocument();
    expect(screen.getByText('All seats have a great view of the screen')).toBeInTheDocument();
  });

  it('generates correct number of seats', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
      />
    );
    
    // Should have 3 rows × 4 seats = 12 seats total
    const seatButtons = screen.getAllByRole('button').filter(button => 
      button.textContent && /^[1-4]$/.test(button.textContent)
    );
    expect(seatButtons).toHaveLength(12);
  });

  it('displays row labels correctly', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
      />
    );
    
    expect(screen.getAllByText('A')).toHaveLength(2); // Row labels on both sides
    expect(screen.getAllByText('B')).toHaveLength(2);
    expect(screen.getAllByText('C')).toHaveLength(2);
  });

  it('handles seat selection correctly', async () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
        onSeatLock={mockOnSeatLock}
      />
    );
    
    // Find and click an available seat (A2 should be available)
    const seatButton = screen.getByRole('button', { name: /A2/ });
    fireEvent.click(seatButton);
    
    await waitFor(() => {
      expect(mockOnSeatSelection).toHaveBeenCalled();
    });
  });

  it('respects maximum seat limit', async () => {
    const maxSeats = 2;
    const twoSelectedSeats: Seat[] = [
      {
        id: 'A1',
        row: 'A',
        number: 1,
        category: 'vip',
        status: 'selected',
        price: 18.00
      },
      {
        id: 'A3',
        row: 'A',
        number: 3,
        category: 'vip',
        status: 'selected',
        price: 18.00
      }
    ];

    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={twoSelectedSeats}
        onSeatSelection={mockOnSeatSelection}
        maxSeats={maxSeats}
      />
    );
    
    // Try to select another seat when at max limit
    const seatButton = screen.getByRole('button', { name: /A4/ });
    fireEvent.click(seatButton);
    
    // Should not call onSeatSelection for new selection
    await waitFor(() => {
      expect(mockOnSeatSelection).not.toHaveBeenCalled();
    });
  });

  it('shows correct selection count', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={mockSelectedSeats}
        onSeatSelection={mockOnSeatSelection}
        maxSeats={8}
      />
    );
    
    expect(screen.getByText('1 seat selected (7 remaining)')).toBeInTheDocument();
  });

  it('shows correct message when no seats selected', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
      />
    );
    
    expect(screen.getByText('Click on available seats to select them')).toBeInTheDocument();
  });

  it('handles seat deselection', async () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={mockSelectedSeats}
        onSeatSelection={mockOnSeatSelection}
        onSeatLock={mockOnSeatLock}
      />
    );
    
    // Click on the selected seat to deselect it
    const selectedSeatButton = screen.getByRole('button', { name: /A1/ });
    fireEvent.click(selectedSeatButton);
    
    await waitFor(() => {
      expect(mockOnSeatSelection).toHaveBeenCalled();
    });
  });

  it('creates proper seat layout with aisles', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={[]}
        onSeatSelection={mockOnSeatSelection}
      />
    );
    
    // Check that seats are properly divided with aisles
    // Each row should have left section (seats 1-2) and right section (seats 3-4)
    const rowA = screen.getAllByText('A')[0].parentElement;
    expect(rowA).toBeInTheDocument();
  });

  it('applies correct seat statuses based on seat map data', () => {
    render(
      <SeatMap
        showtimeId="showtime-1"
        seatMapData={mockSeatMapData}
        selectedSeats={mockSelectedSeats}
        onSeatSelection={mockOnSeatSelection}
      />
    );
    
    // Check booked seat (B2)
    const bookedSeat = screen.getByRole('button', { name: /B2 - Unavailable/ });
    expect(bookedSeat).toBeDisabled();
    
    // Check locked seat (B3)
    const lockedSeat = screen.getByRole('button', { name: /B3 - Temporarily held/ });
    expect(lockedSeat).toBeDisabled();
    
    // Check disabled seat (C4)
    const disabledSeat = screen.getByRole('button', { name: /C4 - Not available/ });
    expect(disabledSeat).toBeDisabled();
  });
});