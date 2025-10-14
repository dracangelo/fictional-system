export interface Seat {
  id: string;
  row: string;
  number: number;
  category: 'regular' | 'vip' | 'disabled';
  status: 'available' | 'booked' | 'selected' | 'locked';
  price: number;
}

export interface SeatSelection {
  seat: Seat;
  selected: boolean;
}

export interface SeatMapData {
  rows: number;
  seatsPerRow: number;
  vipRows: number[];
  disabledSeats: string[];
  pricing: {
    regular: number;
    vip: number;
  };
  bookedSeats: string[];
  lockedSeats: string[];
}

export interface SeatLockResponse {
  success: boolean;
  expiresAt: string;
  lockedSeats: string[];
}

export interface BookingSummaryData {
  selectedSeats: Seat[];
  subtotal: number;
  fees: number;
  taxes: number;
  total: number;
  showtimeId: string;
  movieTitle?: string;
  theaterName?: string;
  showtime?: string;
}