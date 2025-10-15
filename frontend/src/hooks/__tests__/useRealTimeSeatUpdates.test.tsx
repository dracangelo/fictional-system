import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealTimeSeatUpdates } from '../useRealTimeSeatUpdates';
import { getSocketService } from '../../services/notification/socketService';
import { useAuth } from '../../contexts/AuthContext';

// Mock dependencies
vi.mock('../../services/notification/socketService');
vi.mock('../../contexts/AuthContext');

const mockSocketService = {
  send: vi.fn(),
  on: vi.fn(() => vi.fn()), // Return unsubscribe function
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
};

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  role: 'customer'
};

describe('useRealTimeSeatUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSocketService as any).mockReturnValue(mockSocketService);
    (useAuth as any).mockReturnValue({
      user: mockUser,
      token: 'mock-token'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should join showtime room on mount', () => {
    const showtimeId = 'showtime123';
    
    renderHook(() => useRealTimeSeatUpdates({ showtimeId }));

    expect(mockSocketService.joinRoom).toHaveBeenCalledWith(`showtime_${showtimeId}`);
  });

  it('should subscribe to seat updates', () => {
    const showtimeId = 'showtime123';
    const onSeatUpdate = vi.fn();
    
    renderHook(() => useRealTimeSeatUpdates({ 
      showtimeId, 
      onSeatUpdate 
    }));

    expect(mockSocketService.on).toHaveBeenCalledWith('seat_update', expect.any(Function));
  });

  it('should call onSeatUpdate when seat update is received', () => {
    const showtimeId = 'showtime123';
    const onSeatUpdate = vi.fn();
    let seatUpdateHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'seat_update') {
        seatUpdateHandler = handler;
      }
      return vi.fn();
    });

    renderHook(() => useRealTimeSeatUpdates({ 
      showtimeId, 
      onSeatUpdate 
    }));

    const seatUpdateData = {
      showtimeId: 'showtime123',
      seatNumber: 'A1',
      status: 'locked',
      lockedBy: 'user456'
    };

    act(() => {
      seatUpdateHandler!(seatUpdateData);
    });

    expect(onSeatUpdate).toHaveBeenCalledWith(seatUpdateData);
  });

  it('should call onSeatLocked when seat is locked by another user', () => {
    const showtimeId = 'showtime123';
    const onSeatLocked = vi.fn();
    let seatUpdateHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'seat_update') {
        seatUpdateHandler = handler;
      }
      return vi.fn();
    });

    renderHook(() => useRealTimeSeatUpdates({ 
      showtimeId, 
      onSeatLocked 
    }));

    const seatUpdateData = {
      showtimeId: 'showtime123',
      seatNumber: 'A1',
      status: 'locked',
      lockedBy: 'user456' // Different from current user
    };

    act(() => {
      seatUpdateHandler!(seatUpdateData);
    });

    expect(onSeatLocked).toHaveBeenCalledWith('A1', 'user456');
  });

  it('should not call onSeatLocked when seat is locked by current user', () => {
    const showtimeId = 'showtime123';
    const onSeatLocked = vi.fn();
    let seatUpdateHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'seat_update') {
        seatUpdateHandler = handler;
      }
      return vi.fn();
    });

    renderHook(() => useRealTimeSeatUpdates({ 
      showtimeId, 
      onSeatLocked 
    }));

    const seatUpdateData = {
      showtimeId: 'showtime123',
      seatNumber: 'A1',
      status: 'locked',
      lockedBy: 'user123' // Same as current user
    };

    act(() => {
      seatUpdateHandler!(seatUpdateData);
    });

    expect(onSeatLocked).not.toHaveBeenCalled();
  });

  it('should send lock_seat message when lockSeat is called', () => {
    const showtimeId = 'showtime123';
    
    const { result } = renderHook(() => useRealTimeSeatUpdates({ showtimeId }));

    act(() => {
      result.current.lockSeat('A1');
    });

    expect(mockSocketService.send).toHaveBeenCalledWith('lock_seat', {
      showtimeId: 'showtime123',
      seatNumber: 'A1',
      userId: 'user123'
    });
  });

  it('should send unlock_seat message when unlockSeat is called', () => {
    const showtimeId = 'showtime123';
    
    const { result } = renderHook(() => useRealTimeSeatUpdates({ showtimeId }));

    act(() => {
      result.current.unlockSeat('A1');
    });

    expect(mockSocketService.send).toHaveBeenCalledWith('unlock_seat', {
      showtimeId: 'showtime123',
      seatNumber: 'A1',
      userId: 'user123'
    });
  });

  it('should leave showtime room on unmount', () => {
    const showtimeId = 'showtime123';
    
    const { unmount } = renderHook(() => useRealTimeSeatUpdates({ showtimeId }));

    unmount();

    expect(mockSocketService.leaveRoom).toHaveBeenCalledWith(`showtime_${showtimeId}`);
  });

  it('should ignore seat updates for different showtimes', () => {
    const showtimeId = 'showtime123';
    const onSeatUpdate = vi.fn();
    let seatUpdateHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'seat_update') {
        seatUpdateHandler = handler;
      }
      return vi.fn();
    });

    renderHook(() => useRealTimeSeatUpdates({ 
      showtimeId, 
      onSeatUpdate 
    }));

    const seatUpdateData = {
      showtimeId: 'showtime456', // Different showtime
      seatNumber: 'A1',
      status: 'locked',
      lockedBy: 'user456'
    };

    act(() => {
      seatUpdateHandler!(seatUpdateData);
    });

    expect(onSeatUpdate).not.toHaveBeenCalled();
  });

  it('should not initialize when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      token: null
    });

    const showtimeId = 'showtime123';
    
    renderHook(() => useRealTimeSeatUpdates({ showtimeId }));

    expect(mockSocketService.joinRoom).not.toHaveBeenCalled();
    expect(mockSocketService.on).not.toHaveBeenCalled();
  });
});