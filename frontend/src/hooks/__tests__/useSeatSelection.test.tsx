import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSeatSelection } from '../useSeatSelection';
import { bookingService } from '../../services/booking/bookingService';
import type { SeatAvailability } from '../../types/booking';

// Mock the booking service
vi.mock('../../services/booking/bookingService', () => ({
  bookingService: {
    getSeatAvailability: vi.fn(),
    lockSeats: vi.fn(),
    unlockSeats: vi.fn(),
  }
}));

// Mock the WebSocket hook
vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    connectionState: 'connected',
    sendMessage: vi.fn(),
    socket: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }))
}));

const mockSeatAvailability: SeatAvailability = {
  showtime_id: 'showtime-1',
  available_seats: ['A1', 'A2', 'A3', 'B1', 'B2'],
  booked_seats: ['A4', 'B3'],
  locked_seats: ['B4'],
  pricing: {
    regular: 12.50,
    vip: 18.00
  }
};

describe('useSeatSelection', () => {
  const mockOptions = {
    showtimeId: 'showtime-1',
    maxSeats: 4
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (bookingService.getSeatAvailability as any).mockResolvedValue(mockSeatAvailability);
    (bookingService.lockSeats as any).mockResolvedValue({
      success: true,
      expires_at: new Date(Date.now() + 600000).toISOString()
    });
    (bookingService.unlockSeats as any).mockResolvedValue({ success: true });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    expect(result.current.selectedSeats).toEqual([]);
    expect(result.current.seatMapData).toBeNull();
    expect(result.current.bookingSummary).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads seat map data on mount', async () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(bookingService.getSeatAvailability).toHaveBeenCalledWith('showtime-1');
    expect(result.current.seatMapData).toBeTruthy();
    expect(result.current.seatMapData?.bookedSeats).toEqual(['A4', 'B3']);
    expect(result.current.seatMapData?.lockedSeats).toEqual(['B4']);
  });

  it('handles seat selection', async () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const testSeat = {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    await act(async () => {
      await result.current.selectSeat(testSeat);
    });
    
    expect(result.current.selectedSeats).toHaveLength(1);
    expect(result.current.selectedSeats[0].id).toBe('A1');
    expect(bookingService.lockSeats).toHaveBeenCalledWith('showtime-1', ['A1'], 600);
  });

  it('handles seat deselection', async () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const testSeat = {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    // First select a seat
    await act(async () => {
      await result.current.selectSeat(testSeat);
    });
    
    expect(result.current.selectedSeats).toHaveLength(1);
    
    // Then deselect it
    await act(async () => {
      await result.current.deselectSeat('A1');
    });
    
    expect(result.current.selectedSeats).toHaveLength(0);
    expect(bookingService.unlockSeats).toHaveBeenCalledWith('showtime-1', ['A1']);
  });

  it('enforces maximum seat limit', async () => {
    const { result } = renderHook(() => useSeatSelection({ ...mockOptions, maxSeats: 1 }));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const seat1 = {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    const seat2 = {
      id: 'A2',
      row: 'A',
      number: 2,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    // Select first seat
    await act(async () => {
      await result.current.selectSeat(seat1);
    });
    
    expect(result.current.selectedSeats).toHaveLength(1);
    
    // Try to select second seat (should fail)
    await expect(async () => {
      await act(async () => {
        await result.current.selectSeat(seat2);
      });
    }).rejects.toThrow('Maximum 1 seats can be selected');
  });

  it('clears all selections', async () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const testSeat = {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    // Select a seat first
    await act(async () => {
      await result.current.selectSeat(testSeat);
    });
    
    expect(result.current.selectedSeats).toHaveLength(1);
    
    // Clear selection
    await act(async () => {
      await result.current.clearSelection();
    });
    
    expect(result.current.selectedSeats).toHaveLength(0);
    expect(result.current.bookingSummary).toBeNull();
    expect(bookingService.unlockSeats).toHaveBeenCalledWith('showtime-1', ['A1']);
  });

  it('updates booking summary when seats are selected', async () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const testSeat = {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    await act(async () => {
      await result.current.selectSeat(testSeat);
    });
    
    expect(result.current.bookingSummary).toBeTruthy();
    expect(result.current.bookingSummary?.selectedSeats).toHaveLength(1);
    expect(result.current.bookingSummary?.subtotal).toBe(12.50);
    expect(result.current.bookingSummary?.total).toBeGreaterThan(12.50); // Should include fees and taxes
  });

  it('handles API errors gracefully', async () => {
    (bookingService.getSeatAvailability as any).mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.error).toBe('API Error');
    expect(result.current.seatMapData).toBeNull();
  });

  it('refreshes seat map data', async () => {
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Clear the mock call count
    (bookingService.getSeatAvailability as any).mockClear();
    
    await act(async () => {
      await result.current.refreshSeatMap();
    });
    
    expect(bookingService.getSeatAvailability).toHaveBeenCalledWith('showtime-1');
  });

  it('sets lock expiration when seats are locked', async () => {
    const futureDate = new Date(Date.now() + 600000);
    (bookingService.lockSeats as any).mockResolvedValue({
      success: true,
      expires_at: futureDate.toISOString()
    });
    
    const { result } = renderHook(() => useSeatSelection(mockOptions));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const testSeat = {
      id: 'A1',
      row: 'A',
      number: 1,
      category: 'regular' as const,
      status: 'available' as const,
      price: 12.50
    };
    
    await act(async () => {
      await result.current.selectSeat(testSeat);
    });
    
    expect(result.current.lockExpiration).toBeTruthy();
    expect(result.current.lockExpiration?.getTime()).toBeCloseTo(futureDate.getTime(), -3);
  });
});