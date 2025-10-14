import { apiClient } from '../api';
import type { PaginatedResponse } from '../../types/api';
import type {
  Booking,
  CreateBookingData,
  BookingFilters,
  PaymentIntent,
  PaymentConfirmation,
  CancelBookingData,
  Ticket,
  SeatAvailability,
} from '../../types/booking';

class BookingService {
  // Booking CRUD operations
  async getBookings(filters?: BookingFilters): Promise<PaginatedResponse<Booking>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/bookings/?${queryString}` : '/bookings/';
    
    return apiClient.get<PaginatedResponse<Booking>>(url);
  }

  async getBooking(id: string): Promise<Booking> {
    return apiClient.get<Booking>(`/bookings/${id}/`);
  }

  async createBooking(data: CreateBookingData): Promise<Booking> {
    return apiClient.post<Booking>('/bookings/', data);
  }

  async cancelBooking(id: string, data?: CancelBookingData): Promise<Booking> {
    return apiClient.post<Booking>(`/bookings/${id}/cancel/`, data || {});
  }

  // Ticket management
  async getBookingTickets(bookingId: string): Promise<Ticket[]> {
    return apiClient.get<Ticket[]>(`/bookings/${bookingId}/tickets/`);
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    return apiClient.get<Ticket>(`/tickets/${ticketId}/`);
  }

  async validateTicket(ticketNumber: string): Promise<{ valid: boolean; ticket?: Ticket; message: string }> {
    return apiClient.post<{ valid: boolean; ticket?: Ticket; message: string }>('/tickets/validate/', {
      ticket_number: ticketNumber,
    });
  }

  // Payment processing
  async createPaymentIntent(bookingData: Omit<CreateBookingData, 'payment_method'>): Promise<PaymentIntent> {
    return apiClient.post<PaymentIntent>('/payments/create-intent/', bookingData);
  }

  async confirmPayment(data: PaymentConfirmation): Promise<Booking> {
    return apiClient.post<Booking>('/payments/confirm/', data);
  }

  async processRefund(bookingId: string, amount?: number, reason?: string): Promise<{ success: boolean; refund_id: string }> {
    return apiClient.post<{ success: boolean; refund_id: string }>(`/bookings/${bookingId}/refund/`, {
      amount,
      reason,
    });
  }

  // Seat availability and selection
  async getSeatAvailability(showtimeId: string): Promise<SeatAvailability> {
    return apiClient.get<SeatAvailability>(`/showtimes/${showtimeId}/seats/`);
  }

  async lockSeats(showtimeId: string, seatNumbers: string[], duration: number = 300): Promise<{ success: boolean; expires_at: string }> {
    return apiClient.post<{ success: boolean; expires_at: string }>(`/showtimes/${showtimeId}/seats/lock/`, {
      seat_numbers: seatNumbers,
      duration_seconds: duration,
    });
  }

  async unlockSeats(showtimeId: string, seatNumbers: string[]): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`/showtimes/${showtimeId}/seats/unlock/`, {
      seat_numbers: seatNumbers,
    });
  }

  // Booking calculations
  async calculateBookingPrice(data: Omit<CreateBookingData, 'payment_method'>): Promise<{
    subtotal: number;
    discount: number;
    taxes: number;
    fees: number;
    total: number;
    breakdown: Array<{
      item: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  }> {
    return apiClient.post('/bookings/calculate-price/', data);
  }

  async validateDiscountCode(code: string, eventId?: string, showtimeId?: string): Promise<{
    valid: boolean;
    discount_amount: number;
    discount_percentage: number;
    message: string;
  }> {
    return apiClient.post('/discounts/validate/', {
      code,
      event_id: eventId,
      showtime_id: showtimeId,
    });
  }

  // Booking history and management
  async getUserBookings(userId?: string, filters?: BookingFilters): Promise<PaginatedResponse<Booking>> {
    const params = new URLSearchParams();
    
    if (userId) {
      params.append('customer', userId);
    }
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/bookings/?${queryString}` : '/bookings/';
    
    return apiClient.get<PaginatedResponse<Booking>>(url);
  }

  async getUpcomingBookings(userId?: string): Promise<Booking[]> {
    const now = new Date().toISOString();
    const response = await this.getUserBookings(userId, {
      booking_status: 'confirmed',
      date_from: now,
    });
    return response.results;
  }

  async getPastBookings(userId?: string): Promise<Booking[]> {
    const now = new Date().toISOString();
    const response = await this.getUserBookings(userId, {
      date_to: now,
    });
    return response.results;
  }

  // Ticket generation and download
  async downloadTickets(bookingId: string, format: 'pdf' | 'png' = 'pdf'): Promise<Blob> {
    const response = await apiClient.get(`/bookings/${bookingId}/tickets/download/`, {
      params: { format },
      responseType: 'blob',
    });
    return response;
  }

  async emailTickets(bookingId: string, email?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(`/bookings/${bookingId}/tickets/email/`, {
      email,
    });
  }

  // Waitlist management
  async joinWaitlist(eventId?: string, showtimeId?: string, ticketTypeId?: string): Promise<{ success: boolean; position: number }> {
    return apiClient.post<{ success: boolean; position: number }>('/waitlist/join/', {
      event_id: eventId,
      showtime_id: showtimeId,
      ticket_type_id: ticketTypeId,
    });
  }

  async leaveWaitlist(waitlistId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/waitlist/${waitlistId}/`);
  }

  async getWaitlistStatus(eventId?: string, showtimeId?: string): Promise<{
    is_on_waitlist: boolean;
    position?: number;
    estimated_wait_time?: number;
  }> {
    const params = new URLSearchParams();
    if (eventId) params.append('event_id', eventId);
    if (showtimeId) params.append('showtime_id', showtimeId);
    
    const queryString = params.toString();
    const url = queryString ? `/waitlist/status/?${queryString}` : '/waitlist/status/';
    
    return apiClient.get(url);
  }

  // Reviews and ratings
  async submitReview(bookingId: string, rating: number, comment?: string): Promise<{ success: boolean; review_id: string }> {
    return apiClient.post<{ success: boolean; review_id: string }>(`/bookings/${bookingId}/review/`, {
      rating,
      comment,
    });
  }

  async updateReview(reviewId: string, rating: number, comment?: string): Promise<{ success: boolean }> {
    return apiClient.patch<{ success: boolean }>(`/reviews/${reviewId}/`, {
      rating,
      comment,
    });
  }

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/reviews/${reviewId}/`);
  }
}

export const bookingService = new BookingService();