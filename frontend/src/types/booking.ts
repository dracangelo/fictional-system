export type BookingStep = 'seats' | 'summary' | 'payment' | 'confirmation';

export interface Booking {
  id: string;
  customer: string;
  booking_type: 'event' | 'movie';
  event?: string;
  showtime?: string;
  booking_reference: string;
  total_amount: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  booking_status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  tickets?: Ticket[];
  event_details?: any;
  showtime_details?: any;
}

export interface Ticket {
  id: string;
  booking: string;
  ticket_type?: string;
  seat_number?: string;
  ticket_number: string;
  qr_code: string;
  price: number;
  status: 'valid' | 'used' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateBookingData {
  booking_type: 'event' | 'movie';
  event?: string;
  showtime?: string;
  tickets: Array<{
    ticket_type?: string;
    seat_number?: string;
    quantity?: number;
  }>;
  payment_method: PaymentMethod;
  discount_code?: string;
}

export interface PaymentMethod {
  type: 'stripe' | 'paypal';
  token: string;
  billing_address?: BillingAddress;
}

export interface BillingAddress {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface BookingFilters {
  booking_type?: 'event' | 'movie';
  payment_status?: string;
  booking_status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface PaymentIntent {
  client_secret: string;
  amount: number;
  currency: string;
  booking_id: string;
}

export interface PaymentConfirmation {
  payment_intent_id: string;
  booking_id: string;
  status: 'succeeded' | 'failed';
}

export interface CancelBookingData {
  reason?: string;
  refund_requested?: boolean;
}

export interface SeatAvailability {
  showtime_id: string;
  available_seats: string[];
  booked_seats: string[];
  locked_seats: string[];
  pricing: Record<string, number>;
}

export interface Seat {
  id: string;
  row: string;
  number: string;
  seatNumber: string;
  type: 'standard' | 'premium' | 'vip';
  status: 'available' | 'booked' | 'locked' | 'unavailable';
  priceModifier?: number;
}

export interface BookingData {
  id: string;
  bookingReference: string;
  event: any;
  showTime: any;
  seats: Seat[];
  totalAmount: number;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: string;
}