import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket, type WebSocketMessage } from './useWebSocket';
import { bookingService } from '../services/booking/bookingService';
import type { Seat, SeatMapData, SeatLockResponse, BookingSummaryData } from '../types/seat';

export interface UseSeatSelectionOptions {
  showtimeId: string;
  maxSeats?: number;
  lockDuration?: number; // in seconds
  onSeatLockExpired?: (seats: Seat[]) => void;
  onSeatUnavailable?: (seats: Seat[]) => void;
}

export interface UseSeatSelectionReturn {
  selectedSeats: Seat[];
  seatMapData: SeatMapData | null;
  bookingSummary: BookingSummaryData | null;
  loading: boolean;
  error: string | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  selectSeat: (seat: Seat) => Promise<void>;
  deselectSeat: (seatId: string) => Promise<void>;
  clearSelection: () => Promise<void>;
  refreshSeatMap: () => Promise<void>;
  lockExpiration: Date | null;
}

export const useSeatSelection = (options: UseSeatSelectionOptions): UseSeatSelectionReturn => {
  const { showtimeId, maxSeats = 8, lockDuration = 600, onSeatLockExpired, onSeatUnavailable } = options;
  
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [bookingSummary, setBookingSummary] = useState<BookingSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockExpiration, setLockExpiration] = useState<Date | null>(null);
  
  const lockTimeoutRef = useRef<NodeJS.Timeout>();
  
  // WebSocket connection for real-time updates
  const websocketUrl = `${import.meta.env.VITE_WS_URL}/showtimes/${showtimeId}/seats/`;
  
  const { connectionState, sendMessage } = useWebSocket(websocketUrl, {
    onMessage: handleWebSocketMessage,
    onError: (event) => {
      console.error('WebSocket error:', event);
    }
  });

  function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'seat_availability_update':
        handleSeatAvailabilityUpdate(message.data);
        break;
      case 'seat_locked':
        handleSeatLocked(message.data);
        break;
      case 'seat_unlocked':
        handleSeatUnlocked(message.data);
        break;
      case 'seat_booked':
        handleSeatBooked(message.data);
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  const handleSeatAvailabilityUpdate = (data: any) => {
    setSeatMapData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        bookedSeats: data.booked_seats || prev.bookedSeats,
        lockedSeats: data.locked_seats || prev.lockedSeats
      };
    });
  };

  const handleSeatLocked = (data: any) => {
    const { seat_ids, locked_by_user } = data;
    
    if (!locked_by_user) {
      // Another user locked these seats
      setSeatMapData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lockedSeats: [...new Set([...prev.lockedSeats, ...seat_ids])]
        };
      });
    }
  };

  const handleSeatUnlocked = (data: any) => {
    const { seat_ids } = data;
    
    setSeatMapData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        lockedSeats: prev.lockedSeats.filter(id => !seat_ids.includes(id))
      };
    });
  };

  const handleSeatBooked = (data: any) => {
    const { seat_ids } = data;
    
    setSeatMapData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        bookedSeats: [...new Set([...prev.bookedSeats, ...seat_ids])],
        lockedSeats: prev.lockedSeats.filter(id => !seat_ids.includes(id))
      };
    });
    
    // Remove booked seats from selection
    setSelectedSeats(prev => prev.filter(seat => !seat_ids.includes(seat.id)));
    
    // Notify about unavailable seats
    const unavailableSeats = selectedSeats.filter(seat => seat_ids.includes(seat.id));
    if (unavailableSeats.length > 0) {
      onSeatUnavailable?.(unavailableSeats);
    }
  };

  const refreshSeatMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const availability = await bookingService.getSeatAvailability(showtimeId);
      
      setSeatMapData({
        rows: 15, // This should come from theater configuration
        seatsPerRow: 20, // This should come from theater configuration
        vipRows: [1, 2, 3], // This should come from theater configuration
        disabledSeats: [], // This should come from theater configuration
        pricing: availability.pricing,
        bookedSeats: availability.booked_seats,
        lockedSeats: availability.locked_seats
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seat map');
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  const lockSeats = useCallback(async (seatIds: string[]): Promise<SeatLockResponse> => {
    const response = await bookingService.lockSeats(showtimeId, seatIds, lockDuration);
    
    if (response.success) {
      setLockExpiration(new Date(response.expires_at));
      
      // Set up expiration timer
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      
      const expirationTime = new Date(response.expires_at).getTime() - Date.now();
      lockTimeoutRef.current = setTimeout(() => {
        onSeatLockExpired?.(selectedSeats);
        setLockExpiration(null);
      }, expirationTime);
    }
    
    return response;
  }, [showtimeId, lockDuration, selectedSeats, onSeatLockExpired]);

  const unlockSeats = useCallback(async (seatIds: string[]) => {
    await bookingService.unlockSeats(showtimeId, seatIds);
    
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    setLockExpiration(null);
  }, [showtimeId]);

  const updateBookingSummary = useCallback(async (seats: Seat[]) => {
    if (seats.length === 0) {
      setBookingSummary(null);
      return;
    }

    try {
      const subtotal = seats.reduce((sum, seat) => sum + seat.price, 0);
      const fees = subtotal * 0.1; // 10% service fee
      const taxes = subtotal * 0.08; // 8% tax
      const total = subtotal + fees + taxes;

      setBookingSummary({
        selectedSeats: seats,
        subtotal,
        fees,
        taxes,
        total,
        showtimeId
      });
    } catch (err) {
      console.error('Failed to calculate booking summary:', err);
    }
  }, [showtimeId]);

  const selectSeat = useCallback(async (seat: Seat) => {
    if (selectedSeats.length >= maxSeats) {
      throw new Error(`Maximum ${maxSeats} seats can be selected`);
    }

    const newSelectedSeats = [...selectedSeats, { ...seat, status: 'selected' as const }];
    setSelectedSeats(newSelectedSeats);
    
    try {
      await lockSeats([seat.id]);
      await updateBookingSummary(newSelectedSeats);
      
      // Notify WebSocket about selection
      sendMessage({
        type: 'seat_selected',
        data: { seat_id: seat.id, showtime_id: showtimeId }
      });
    } catch (err) {
      // Revert selection on error
      setSelectedSeats(selectedSeats);
      throw err;
    }
  }, [selectedSeats, maxSeats, lockSeats, updateBookingSummary, sendMessage, showtimeId]);

  const deselectSeat = useCallback(async (seatId: string) => {
    const newSelectedSeats = selectedSeats.filter(seat => seat.id !== seatId);
    setSelectedSeats(newSelectedSeats);
    
    try {
      await unlockSeats([seatId]);
      await updateBookingSummary(newSelectedSeats);
      
      // Notify WebSocket about deselection
      sendMessage({
        type: 'seat_deselected',
        data: { seat_id: seatId, showtime_id: showtimeId }
      });
    } catch (err) {
      console.error('Failed to unlock seat:', err);
    }
  }, [selectedSeats, unlockSeats, updateBookingSummary, sendMessage, showtimeId]);

  const clearSelection = useCallback(async () => {
    const seatIds = selectedSeats.map(seat => seat.id);
    setSelectedSeats([]);
    setBookingSummary(null);
    
    if (seatIds.length > 0) {
      try {
        await unlockSeats(seatIds);
        
        // Notify WebSocket about clearing selection
        sendMessage({
          type: 'selection_cleared',
          data: { seat_ids: seatIds, showtime_id: showtimeId }
        });
      } catch (err) {
        console.error('Failed to unlock seats:', err);
      }
    }
  }, [selectedSeats, unlockSeats, sendMessage, showtimeId]);

  // Load initial seat map
  useEffect(() => {
    refreshSeatMap();
  }, [refreshSeatMap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      
      // Unlock seats when component unmounts
      const seatIds = selectedSeats.map(seat => seat.id);
      if (seatIds.length > 0) {
        bookingService.unlockSeats(showtimeId, seatIds).catch(console.error);
      }
    };
  }, []);

  return {
    selectedSeats,
    seatMapData,
    bookingSummary,
    loading,
    error,
    connectionState,
    selectSeat,
    deselectSeat,
    clearSelection,
    refreshSeatMap,
    lockExpiration
  };
};