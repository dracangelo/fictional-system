import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConfirmationStep } from '../ConfirmationStep';
import { bookingService } from '../../../services/booking';
import type { Booking } from '../../../types/booking';

// Mock the booking service
vi.mock('../../../services/booking', () => ({
  bookingService: {
    downloadTickets: vi.fn(),
    emailTickets: vi.fn(),
  },
}));

// Mock URL.createObjectURL and related APIs
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

const mockBooking: Booking = {
  id: 'booking-123',
  customer: 'user-123',
  booking_type: 'movie',
  booking_reference: 'BK123456',
  total_amount: 29.75,
  payment_status: 'completed',
  booking_status: 'confirmed',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  tickets: [
    {
      id: 'ticket-1',
      booking: 'booking-123',
      seat_number: 'A1',
      ticket_number: 'TK123456789',
      qr_code: 'mock-qr-code',
      price: 14.875,
      status: 'valid',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'ticket-2',
      booking: 'booking-123',
      seat_number: 'A2',
      ticket_number: 'TK123456790',
      qr_code: 'mock-qr-code-2',
      price: 14.875,
      status: 'valid',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
  ],
  showtime_details: {
    movie: {
      title: 'Test Movie',
    },
    theater: {
      name: 'Test Theater',
    },
    start_time: '2024-01-15T19:30:00Z',
  },
};

describe('ConfirmationStep', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirmation message and booking details', () => {
    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test Theater')).toBeInTheDocument();
    expect(screen.getByText('BK123456')).toBeInTheDocument();
    expect(screen.getByText('$29.75')).toBeInTheDocument();
  });

  it('displays ticket information correctly', () => {
    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Your Tickets')).toBeInTheDocument();
    expect(screen.getByText('Ticket #1')).toBeInTheDocument();
    expect(screen.getByText('Ticket #2')).toBeInTheDocument();
    expect(screen.getByText('Seat: A1')).toBeInTheDocument();
    expect(screen.getByText('Seat: A2')).toBeInTheDocument();
  });

  it('handles ticket download', async () => {
    const mockBlob = new Blob(['mock pdf content'], { type: 'application/pdf' });
    vi.mocked(bookingService.downloadTickets).mockResolvedValue(mockBlob);

    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    const downloadButton = screen.getByText('Download Tickets');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(bookingService.downloadTickets).toHaveBeenCalledWith('booking-123', 'pdf');
    });

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('tickets-BK123456.pdf');
    expect(mockLink.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('handles email tickets', async () => {
    vi.mocked(bookingService.emailTickets).mockResolvedValue({
      success: true,
      message: 'Tickets emailed successfully',
    });

    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    const emailButton = screen.getByText('Email Tickets');
    fireEvent.click(emailButton);

    await waitFor(() => {
      expect(bookingService.emailTickets).toHaveBeenCalledWith('booking-123');
    });
  });

  it('shows loading state for download tickets', async () => {
    vi.mocked(bookingService.downloadTickets).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(new Blob()), 100))
    );

    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    const downloadButton = screen.getByText('Download Tickets');
    fireEvent.click(downloadButton);

    // Button should show loading state
    expect(downloadButton).toBeDisabled();
  });

  it('shows loading state for email tickets', async () => {
    vi.mocked(bookingService.emailTickets).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, message: '' }), 100))
    );

    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    const emailButton = screen.getByText('Email Tickets');
    fireEvent.click(emailButton);

    // Button should show loading state
    expect(emailButton).toBeDisabled();
  });

  it('calls onComplete when view bookings button is clicked', () => {
    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    const viewBookingsButton = screen.getByText('View My Bookings');
    fireEvent.click(viewBookingsButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('displays important information section', () => {
    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Important Information:')).toBeInTheDocument();
    expect(screen.getByText(/Please arrive at least 15 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Bring a valid ID/)).toBeInTheDocument();
  });

  it('displays contact support information', () => {
    render(
      <ConfirmationStep
        booking={mockBooking}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Need help? Contact our support team at')).toBeInTheDocument();
    expect(screen.getByText('support@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
  });

  it('handles booking without tickets', () => {
    const bookingWithoutTickets: Booking = {
      ...mockBooking,
      tickets: [],
    };

    render(
      <ConfirmationStep
        booking={bookingWithoutTickets}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument(); // Number of tickets
  });

  it('handles event booking (not movie)', () => {
    const eventBooking: Booking = {
      ...mockBooking,
      booking_type: 'event',
      event_details: {
        title: 'Test Event',
        venue: 'Test Venue',
        start_datetime: '2024-01-15T19:30:00Z',
      },
      showtime_details: undefined,
    };

    render(
      <ConfirmationStep
        booking={eventBooking}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Venue')).toBeInTheDocument();
  });
});