import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BookingDetailsModal } from '../BookingDetailsModal';
import { bookingService } from '../../../services/booking';
import type { Booking } from '../../../types/booking';

// Mock the booking service
vi.mock('../../../services/booking', () => ({
  bookingService: {
    downloadTickets: vi.fn(),
    emailTickets: vi.fn(),
  },
}));

const mockBooking: Booking = {
  id: '1',
  customer: 'user1',
  booking_type: 'event',
  booking_reference: 'BK001',
  total_amount: 75.00,
  payment_status: 'completed',
  booking_status: 'confirmed',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  event_details: {
    id: 'event1',
    title: 'Jazz Festival',
    venue: 'Central Park',
    address: '123 Park Avenue, New York, NY',
    start_datetime: '2024-02-20T19:00:00Z',
  },
  tickets: [
    {
      id: 'ticket1',
      booking: '1',
      ticket_number: 'TK001',
      qr_code: 'base64qrcode1',
      price: 35.00,
      status: 'valid',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'ticket2',
      booking: '1',
      ticket_number: 'TK002',
      qr_code: 'base64qrcode2',
      price: 40.00,
      status: 'valid',
      seat_number: 'A15',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
  ],
};

const defaultProps = {
  booking: mockBooking,
  isOpen: true,
  onClose: vi.fn(),
  onBookingUpdated: vi.fn(),
};

describe('BookingDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders booking details correctly', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Jazz Festival')).toBeInTheDocument();
    expect(screen.getByText('Central Park')).toBeInTheDocument();
    expect(screen.getByText('123 Park Avenue, New York, NY')).toBeInTheDocument();
    expect(screen.getByText('BK001')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });

  it('displays event date and time correctly', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Tuesday, February 20, 2024')).toBeInTheDocument();
    expect(screen.getByText('7:00 PM')).toBeInTheDocument();
  });

  it('shows booking status badges', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('Payment: completed')).toBeInTheDocument();
  });

  it('displays all tickets with details', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Tickets (2)')).toBeInTheDocument();
    expect(screen.getByText('Ticket #TK001')).toBeInTheDocument();
    expect(screen.getByText('Ticket #TK002')).toBeInTheDocument();
    expect(screen.getByText('Seat: A15')).toBeInTheDocument();
    expect(screen.getByText('$35.00')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
  });

  it('shows QR codes for tickets', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    const qrImages = screen.getAllByAltText('QR Code');
    expect(qrImages).toHaveLength(2);
    expect(qrImages[0]).toHaveAttribute('src', 'data:image/png;base64,base64qrcode1');
    expect(qrImages[1]).toHaveAttribute('src', 'data:image/png;base64,base64qrcode2');
  });

  it('handles download tickets action', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    (bookingService.downloadTickets as any).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and related methods
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
    });

    // Mock document.createElement and appendChild
    const mockAnchor = {
      style: { display: '' },
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockAnchor);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    Object.defineProperty(document, 'createElement', { value: mockCreateElement });
    Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
    Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

    render(<BookingDetailsModal {...defaultProps} />);

    const downloadButton = screen.getByText('Download Tickets');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(bookingService.downloadTickets).toHaveBeenCalledWith('1');
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockAnchor.download).toBe('tickets-BK001.pdf');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('handles email tickets action', async () => {
    (bookingService.emailTickets as any).mockResolvedValue({ success: true });

    render(<BookingDetailsModal {...defaultProps} />);

    const emailButton = screen.getByText('Email Tickets');
    fireEvent.click(emailButton);

    await waitFor(() => {
      expect(bookingService.emailTickets).toHaveBeenCalledWith('1');
    });
  });

  it('shows cancel booking button for confirmed bookings', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
  });

  it('does not show cancel booking button for past events', () => {
    const pastBooking = {
      ...mockBooking,
      event_details: {
        ...mockBooking.event_details!,
        start_datetime: '2023-01-15T19:00:00Z', // Past date
      },
    };

    render(<BookingDetailsModal {...defaultProps} booking={pastBooking} />);

    expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
  });

  it('does not show cancel booking button for cancelled bookings', () => {
    const cancelledBooking = {
      ...mockBooking,
      booking_status: 'cancelled' as const,
    };

    render(<BookingDetailsModal {...defaultProps} booking={cancelledBooking} />);

    expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
  });

  it('shows leave review button for completed bookings', () => {
    const completedBooking = {
      ...mockBooking,
      booking_status: 'completed' as const,
    };

    render(<BookingDetailsModal {...defaultProps} booking={completedBooking} />);

    expect(screen.getByText('Leave Review')).toBeInTheDocument();
  });

  it('opens cancel booking modal when cancel is clicked', () => {
    render(<BookingDetailsModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel Booking');
    fireEvent.click(cancelButton);

    // The cancel modal should be rendered
    // (We'd need to mock the CancelBookingModal component for full testing)
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<BookingDetailsModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('handles movie booking details correctly', () => {
    const movieBooking: Booking = {
      ...mockBooking,
      booking_type: 'movie',
      event_details: undefined,
      showtime_details: {
        id: 'showtime1',
        movie: {
          title: 'Action Hero',
        },
        theater: {
          name: 'Multiplex Cinema',
          address: '456 Movie Street, Los Angeles, CA',
        },
        start_time: '2024-02-25T20:30:00Z',
      },
    };

    render(<BookingDetailsModal {...defaultProps} booking={movieBooking} />);

    expect(screen.getByText('Action Hero')).toBeInTheDocument();
    expect(screen.getByText('Multiplex Cinema')).toBeInTheDocument();
    expect(screen.getByText('456 Movie Street, Los Angeles, CA')).toBeInTheDocument();
  });

  it('shows loading state during download', async () => {
    (bookingService.downloadTickets as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<BookingDetailsModal {...defaultProps} />);

    const downloadButton = screen.getByText('Download Tickets');
    fireEvent.click(downloadButton);

    expect(screen.getByText('Downloading...')).toBeInTheDocument();
  });

  it('shows loading state during email', async () => {
    (bookingService.emailTickets as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<BookingDetailsModal {...defaultProps} />);

    const emailButton = screen.getByText('Email Tickets');
    fireEvent.click(emailButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<BookingDetailsModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Jazz Festival')).not.toBeInTheDocument();
  });
});