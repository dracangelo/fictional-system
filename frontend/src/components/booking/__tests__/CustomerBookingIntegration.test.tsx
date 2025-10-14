import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CustomerDashboard } from '../../../pages/dashboard/CustomerDashboard';
import { useAuth } from '../../../contexts';
import { useQuery } from '../../../hooks';

// Mock the auth context
vi.mock('../../../contexts', () => ({
  useAuth: vi.fn(),
}));

// Mock the useQuery hook
vi.mock('../../../hooks', () => ({
  useQuery: vi.fn(),
}));

const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'customer' as const,
  preferences: {
    notificationSettings: {
      email: true,
      sms: true,
      push: true,
    },
    favoriteGenres: ['music'],
    preferredLocations: ['downtown'],
    accessibilityNeeds: [],
  },
};

const mockBookings = [
  {
    id: '1',
    customer: 'user1',
    booking_type: 'event' as const,
    booking_reference: 'BK001',
    total_amount: 50.00,
    payment_status: 'completed' as const,
    booking_status: 'confirmed' as const,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    event_details: {
      id: 'event1',
      title: 'Concert Night',
      venue: 'Music Hall',
      start_datetime: '2024-02-15T20:00:00Z',
    },
    tickets: [
      {
        id: 'ticket1',
        booking: '1',
        ticket_number: 'TK001',
        qr_code: 'base64qrcode',
        price: 50.00,
        status: 'valid' as const,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      },
    ],
  },
];

describe('Customer Booking Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuth as any).mockReturnValue({
      user: mockUser,
    });

    // Mock all useQuery calls
    (useQuery as any)
      .mockReturnValue({
        data: mockBookings,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
  });

  it('integrates customer dashboard with booking components', async () => {
    render(<CustomerDashboard />);

    // Should render dashboard
    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();

    // Should show booking in upcoming events
    expect(screen.getByText('Concert Night')).toBeInTheDocument();
    expect(screen.getByText('Music Hall')).toBeInTheDocument();

    // Switch to bookings tab
    fireEvent.click(screen.getByText('My Bookings'));

    // Should show booking history section
    expect(screen.getByText('Booking History')).toBeInTheDocument();
  });

  it('handles booking interactions correctly', async () => {
    render(<CustomerDashboard />);

    // Find and click view details button
    const viewDetailsButtons = screen.getAllByText('View Details');
    expect(viewDetailsButtons.length).toBeGreaterThan(0);

    fireEvent.click(viewDetailsButtons[0]);

    // Should open booking details modal
    // (In a real test, we'd verify the modal content)
  });

  it('shows correct booking counts and statistics', () => {
    render(<CustomerDashboard />);

    // Check stats
    expect(screen.getByText('1')).toBeInTheDocument(); // Upcoming events count
  });

  it('handles empty states correctly', () => {
    // Mock empty bookings
    (useQuery as any)
      .mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('handles loading states across components', () => {
    // Mock loading state
    (useQuery as any)
      .mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    // Should show loading indicators
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('handles error states gracefully', () => {
    // Mock error state
    (useQuery as any)
      .mockReturnValueOnce({
        data: null,
        loading: false,
        error: new Error('Network error'),
        refetch: vi.fn(),
      })
      .mockReturnValue({
        data: mockBookings,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    expect(screen.getByText('Error loading bookings')).toBeInTheDocument();
  });
});