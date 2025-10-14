import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bookingService } from '../bookingService';
import { apiClient } from '../../api';
import type { Booking, CreateBookingData, PaymentMethod } from '../../../types/booking';

// Mock the API client
vi.mock('../../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('BookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getBookings', () => {
    it('should fetch bookings without filters', async () => {
      const mockResponse = {
        results: [
          {
            id: '1',
            customer: 'user1',
            booking_type: 'event',
            booking_reference: 'BK001',
            total_amount: 100,
            payment_status: 'completed',
            booking_status: 'confirmed',
          },
        ],
        count: 1,
        next: null,
        previous: null,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getBookings();

      expect(mockApiClient.get).toHaveBeenCalledWith('/bookings/');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch bookings with filters', async () => {
      const filters = {
        booking_type: 'movie' as const,
        payment_status: 'completed',
        page: 1,
        page_size: 10,
      };

      mockApiClient.get.mockResolvedValue({ results: [], count: 0, next: null, previous: null });

      await bookingService.getBookings(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/bookings/?booking_type=movie&payment_status=completed&page=1&page_size=10'
      );
    });
  });

  describe('createBooking', () => {
    it('should create a new booking', async () => {
      const paymentMethod: PaymentMethod = {
        type: 'stripe',
        token: 'tok_123',
        billing_address: {
          name: 'John Doe',
          address_line_1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
      };

      const createData: CreateBookingData = {
        booking_type: 'event',
        event: 'event1',
        tickets: [
          {
            ticket_type: 'general',
            quantity: 2,
          },
        ],
        payment_method: paymentMethod,
      };

      const mockBooking: Booking = {
        id: '1',
        customer: 'user1',
        booking_type: 'event',
        event: 'event1',
        booking_reference: 'BK001',
        total_amount: 100,
        payment_status: 'completed',
        booking_status: 'confirmed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockBooking);

      const result = await bookingService.createBooking(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/bookings/', createData);
      expect(result).toEqual(mockBooking);
    });
  });

  describe('payment processing', () => {
    it('should create payment intent', async () => {
      const bookingData = {
        booking_type: 'event' as const,
        event: 'event1',
        tickets: [
          {
            ticket_type: 'general',
            quantity: 2,
          },
        ],
      };

      const mockPaymentIntent = {
        client_secret: 'pi_123_secret',
        amount: 10000,
        currency: 'usd',
        booking_id: 'booking1',
      };

      mockApiClient.post.mockResolvedValue(mockPaymentIntent);

      const result = await bookingService.createPaymentIntent(bookingData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/payments/create-intent/', bookingData);
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should confirm payment', async () => {
      const paymentConfirmation = {
        payment_intent_id: 'pi_123',
        booking_id: 'booking1',
        status: 'succeeded' as const,
      };

      const mockBooking: Booking = {
        id: 'booking1',
        customer: 'user1',
        booking_type: 'event',
        booking_reference: 'BK001',
        total_amount: 100,
        payment_status: 'completed',
        booking_status: 'confirmed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockBooking);

      const result = await bookingService.confirmPayment(paymentConfirmation);

      expect(mockApiClient.post).toHaveBeenCalledWith('/payments/confirm/', paymentConfirmation);
      expect(result).toEqual(mockBooking);
    });

    it('should process refund', async () => {
      const mockRefundResponse = {
        success: true,
        refund_id: 'ref_123',
      };

      mockApiClient.post.mockResolvedValue(mockRefundResponse);

      const result = await bookingService.processRefund('booking1', 50, 'Customer request');

      expect(mockApiClient.post).toHaveBeenCalledWith('/bookings/booking1/refund/', {
        amount: 50,
        reason: 'Customer request',
      });
      expect(result).toEqual(mockRefundResponse);
    });
  });

  describe('seat management', () => {
    it('should get seat availability', async () => {
      const mockAvailability = {
        showtime_id: 'showtime1',
        available_seats: ['A1', 'A2', 'B1'],
        booked_seats: ['A3', 'B2'],
        locked_seats: ['A4'],
        pricing: {
          regular: 15,
          vip: 25,
        },
      };

      mockApiClient.get.mockResolvedValue(mockAvailability);

      const result = await bookingService.getSeatAvailability('showtime1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/showtimes/showtime1/seats/');
      expect(result).toEqual(mockAvailability);
    });

    it('should lock seats', async () => {
      const mockLockResponse = {
        success: true,
        expires_at: '2024-01-01T00:05:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockLockResponse);

      const result = await bookingService.lockSeats('showtime1', ['A1', 'A2'], 300);

      expect(mockApiClient.post).toHaveBeenCalledWith('/showtimes/showtime1/seats/lock/', {
        seat_numbers: ['A1', 'A2'],
        duration_seconds: 300,
      });
      expect(result).toEqual(mockLockResponse);
    });

    it('should unlock seats', async () => {
      const mockUnlockResponse = {
        success: true,
      };

      mockApiClient.post.mockResolvedValue(mockUnlockResponse);

      const result = await bookingService.unlockSeats('showtime1', ['A1', 'A2']);

      expect(mockApiClient.post).toHaveBeenCalledWith('/showtimes/showtime1/seats/unlock/', {
        seat_numbers: ['A1', 'A2'],
      });
      expect(result).toEqual(mockUnlockResponse);
    });
  });

  describe('booking calculations', () => {
    it('should calculate booking price', async () => {
      const bookingData = {
        booking_type: 'event' as const,
        event: 'event1',
        tickets: [
          {
            ticket_type: 'general',
            quantity: 2,
          },
        ],
      };

      const mockPriceCalculation = {
        subtotal: 80,
        discount: 10,
        taxes: 7,
        fees: 3,
        total: 80,
        breakdown: [
          {
            item: 'General Admission',
            quantity: 2,
            unit_price: 40,
            total_price: 80,
          },
        ],
      };

      mockApiClient.post.mockResolvedValue(mockPriceCalculation);

      const result = await bookingService.calculateBookingPrice(bookingData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/bookings/calculate-price/', bookingData);
      expect(result).toEqual(mockPriceCalculation);
    });

    it('should validate discount code', async () => {
      const mockValidation = {
        valid: true,
        discount_amount: 10,
        discount_percentage: 0.1,
        message: 'Discount applied successfully',
      };

      mockApiClient.post.mockResolvedValue(mockValidation);

      const result = await bookingService.validateDiscountCode('SAVE10', 'event1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/discounts/validate/', {
        code: 'SAVE10',
        event_id: 'event1',
        showtime_id: undefined,
      });
      expect(result).toEqual(mockValidation);
    });
  });

  describe('ticket management', () => {
    it('should get booking tickets', async () => {
      const mockTickets = [
        {
          id: 'ticket1',
          booking: 'booking1',
          ticket_number: 'TK001',
          qr_code: 'qr_code_data',
          price: 50,
          status: 'valid',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValue(mockTickets);

      const result = await bookingService.getBookingTickets('booking1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/bookings/booking1/tickets/');
      expect(result).toEqual(mockTickets);
    });

    it('should validate ticket', async () => {
      const mockValidation = {
        valid: true,
        ticket: {
          id: 'ticket1',
          ticket_number: 'TK001',
          status: 'valid',
        },
        message: 'Ticket is valid',
      };

      mockApiClient.post.mockResolvedValue(mockValidation);

      const result = await bookingService.validateTicket('TK001');

      expect(mockApiClient.post).toHaveBeenCalledWith('/tickets/validate/', {
        ticket_number: 'TK001',
      });
      expect(result).toEqual(mockValidation);
    });

    it('should download tickets', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      mockApiClient.get.mockResolvedValue(mockBlob);

      const result = await bookingService.downloadTickets('booking1', 'pdf');

      expect(mockApiClient.get).toHaveBeenCalledWith('/bookings/booking1/tickets/download/', {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
      expect(result).toEqual(mockBlob);
    });

    it('should email tickets', async () => {
      const mockResponse = {
        success: true,
        message: 'Tickets sent successfully',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.emailTickets('booking1', 'user@example.com');

      expect(mockApiClient.post).toHaveBeenCalledWith('/bookings/booking1/tickets/email/', {
        email: 'user@example.com',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('waitlist management', () => {
    it('should join waitlist', async () => {
      const mockResponse = {
        success: true,
        position: 5,
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.joinWaitlist('event1', undefined, 'ticket_type1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/waitlist/join/', {
        event_id: 'event1',
        showtime_id: undefined,
        ticket_type_id: 'ticket_type1',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should get waitlist status', async () => {
      const mockStatus = {
        is_on_waitlist: true,
        position: 3,
        estimated_wait_time: 1800,
      };

      mockApiClient.get.mockResolvedValue(mockStatus);

      const result = await bookingService.getWaitlistStatus('event1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/waitlist/status/?event_id=event1');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('reviews and ratings', () => {
    it('should submit review', async () => {
      const mockResponse = {
        success: true,
        review_id: 'review1',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.submitReview('booking1', 5, 'Great event!');

      expect(mockApiClient.post).toHaveBeenCalledWith('/bookings/booking1/review/', {
        rating: 5,
        comment: 'Great event!',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should update review', async () => {
      const mockResponse = {
        success: true,
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const result = await bookingService.updateReview('review1', 4, 'Updated review');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/reviews/review1/', {
        rating: 4,
        comment: 'Updated review',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle booking creation errors', async () => {
      const createData: CreateBookingData = {
        booking_type: 'event',
        event: 'event1',
        tickets: [],
        payment_method: {
          type: 'stripe',
          token: 'invalid_token',
        },
      };

      const mockError = new Error('Payment failed');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(bookingService.createBooking(createData)).rejects.toThrow('Payment failed');
    });

    it('should handle seat locking errors', async () => {
      const mockError = new Error('Seats already taken');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(bookingService.lockSeats('showtime1', ['A1'])).rejects.toThrow('Seats already taken');
    });
  });
});