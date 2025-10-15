import { useEffect, useCallback, useRef } from 'react';
import { getSocketService } from '../services/notification/socketService';
import type { SeatUpdateEvent } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface UseRealTimeSeatUpdatesOptions {
  showtimeId?: string;
  onSeatUpdate?: (update: SeatUpdateEvent['data']) => void;
  onSeatLocked?: (seatNumber: string, lockedBy: string) => void;
  onSeatUnlocked?: (seatNumber: string) => void;
  onSeatBooked?: (seatNumber: string) => void;
}

export const useRealTimeSeatUpdates = (options: UseRealTimeSeatUpdatesOptions) => {
  const { showtimeId, onSeatUpdate, onSeatLocked, onSeatUnlocked, onSeatBooked } = options;
  const { user, token } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const handleSeatUpdate = useCallback((data: SeatUpdateEvent['data']) => {
    // Only process updates for the current showtime
    if (data.showtimeId !== showtimeId) {
      return;
    }

    // Call the general update handler
    onSeatUpdate?.(data);

    // Call specific handlers based on seat status
    switch (data.status) {
      case 'locked':
        if (data.lockedBy && data.lockedBy !== user?.id) {
          onSeatLocked?.(data.seatNumber, data.lockedBy);
        }
        break;
      case 'available':
        onSeatUnlocked?.(data.seatNumber);
        break;
      case 'booked':
        onSeatBooked?.(data.seatNumber);
        break;
    }
  }, [showtimeId, onSeatUpdate, onSeatLocked, onSeatUnlocked, onSeatBooked, user?.id]);

  const lockSeat = useCallback((seatNumber: string) => {
    if (!showtimeId || !user) return;

    const socketService = getSocketService();
    socketService.send('lock_seat', {
      showtimeId,
      seatNumber,
      userId: user.id
    });
  }, [showtimeId, user]);

  const unlockSeat = useCallback((seatNumber: string) => {
    if (!showtimeId || !user) return;

    const socketService = getSocketService();
    socketService.send('unlock_seat', {
      showtimeId,
      seatNumber,
      userId: user.id
    });
  }, [showtimeId, user]);

  const joinShowtimeRoom = useCallback(() => {
    if (!showtimeId) return;

    const socketService = getSocketService();
    socketService.joinRoom(`showtime_${showtimeId}`);
  }, [showtimeId]);

  const leaveShowtimeRoom = useCallback(() => {
    if (!showtimeId) return;

    const socketService = getSocketService();
    socketService.leaveRoom(`showtime_${showtimeId}`);
  }, [showtimeId]);

  useEffect(() => {
    if (!user || !token || !showtimeId) return;

    const socketService = getSocketService();

    // Join the showtime room for real-time updates
    joinShowtimeRoom();

    // Subscribe to seat updates
    unsubscribeRef.current = socketService.on('seat_update', handleSeatUpdate);

    return () => {
      // Clean up subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // Leave the showtime room
      leaveShowtimeRoom();
    };
  }, [user, token, showtimeId, handleSeatUpdate, joinShowtimeRoom, leaveShowtimeRoom]);

  return {
    lockSeat,
    unlockSeat,
    joinShowtimeRoom,
    leaveShowtimeRoom
  };
};