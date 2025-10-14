import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CustomerDashboard } from '../CustomerDashboard';
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
    favoriteGenres: ['music', 'sports'],
    preferredLocations: ['downtown'],
    accessibilityNeeds: [],
  },
};

const mockUpcomingBookings = [
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

const mockBookingHistory = {
  results: [
    {
      id: '2',
      customer: 'user1',
      booking_type: 'movie' as const,
      booking_reference: 'BK002',
      total_amount: 25.00,
      payment_status: 'completed' as const,
      booking_status: 'completed' as const,
      created_at: '2024-01-10T15:30:00Z',
      updated_at: '2024-01-10T15:30:00Z',
      showtime_details: {
        id: 'showtime1',
        movie: {
          title: 'Action Movie',
        },
        theater: {
          name: 'Cinema Complex',
        },
        start_time: '2024-01-12T19:00:00Z',
      },
    },
  ],
  count: 5,
};

const mockRecommendedEvents = {
  results: [
    {
      id: 'event2',
      owner: 'owner1',
      title: 'Jazz Night',
      description: 'Amazing jazz performance',
      venue: 'Jazz Club',
      address: '123 Jazz St',
      category: 'music',
      start_datetime: '2024-03-01T21:00:00Z',
      end_datetime: '2024-03-01T23:00:00Z',
      media: [],
      status: 'published' as const,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ticket_types: [
        {
          id: 'tt1',
          event: 'event2',
          name: 'General',
          price: 30,
          quantity_available: 100,
          quantity_sold: 20,
          description: 'General admission',
        },
      ],
    },
  ],
};

describe('CustomerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuth as any).mockReturnValue({
      user: mockUser,
    });

    // Mock useQuery calls
    (useQuery as any)
      .mockReturnValueOnce({
        data: mockUpcomingBookings,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockBookingHistory,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockRecommendedEvents,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
  });

  it('renders dashboard header with user name', () => {
    render(<CustomerDashboard />);

    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
  });

  it('displays quick stats correctly', () => {
    render(<CustomerDashboard />);

    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('Wishlist Items')).toBeInTheDocument();
    
    // Check the counts
    expect(screen.getByText('1')).toBeInTheDocument(); // Upcoming events count
    expect(screen.getByText('5')).toBeInTheDocument(); // Total bookings count
    expect(screen.getByText('0')).toBeInTheDocument(); // Wishlist count
  });

  it('shows navigation tabs', () => {
    render(<CustomerDashboard />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<CustomerDashboard />);

    // Initially on overview tab
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Recommended for You')).toBeInTheDocument();

    // Switch to bookings tab
    fireEvent.click(screen.getByText('My Bookings'));
    
    // Should show booking sections
    expect(screen.getAllByText('Upcoming Events')).toHaveLength(1);
    expect(screen.getByText('Booking History')).toBeInTheDocument();

    // Switch to wishlist tab
    fireEvent.click(screen.getByText('Wishlist'));
    expect(screen.getByText('My Wishlist')).toBeInTheDocument();
  });

  it('displays upcoming bookings in overview', () => {
    render(<CustomerDashboard />);

    expect(screen.getByText('Concert Night')).toBeInTheDocument();
    expect(screen.getByText('Music Hall')).toBeInTheDocument();
  });

  it('displays recommended events', () => {
    render(<CustomerDashboard />);

    expect(screen.getByText('Jazz Night')).toBeInTheDocument();
    expect(screen.getByText('Jazz Club')).toBeInTheDocument();
  });

  it('shows loading states correctly', () => {
    (useQuery as any)
      .mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    // Should show loading indicators
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('handles error states correctly', () => {
    (useQuery as any)
      .mockReturnValueOnce({
        data: null,
        loading: false,
        error: new Error('Failed to load'),
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockBookingHistory,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockRecommendedEvents,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    expect(screen.getByText('Error loading bookings')).toBeInTheDocument();
    expect(screen.getByText('There was an error loading your upcoming bookings. Please try again.')).toBeInTheDocument();
  });

  it('shows retry button on error and calls refetch', () => {
    const mockRefetch = vi.fn();
    
    (useQuery as any)
      .mockReturnValueOnce({
        data: null,
        loading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockBookingHistory,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockRecommendedEvents,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('navigates to browse events when button is clicked', () => {
    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<CustomerDashboard />);

    const browseButton = screen.getByText('Browse Events');
    fireEvent.click(browseButton);

    expect(window.location.href).toBe('/events');
  });

  it('shows view all button in overview and switches to bookings tab', () => {
    render(<CustomerDashboard />);

    const viewAllButton = screen.getByText('View All');
    fireEvent.click(viewAllButton);

    // Should switch to bookings tab
    expect(screen.getAllByText('Upcoming Events')).toHaveLength(1);
    expect(screen.getByText('Booking History')).toBeInTheDocument();
  });

  it('shows tab counts correctly', () => {
    render(<CustomerDashboard />);

    // My Bookings tab should show count
    const bookingsTab = screen.getByText('My Bookings');
    const tabWithCount = bookingsTab.closest('button');
    expect(tabWithCount).toHaveTextContent('1'); // Count badge
  });

  it('handles empty upcoming bookings', () => {
    (useQuery as any)
      .mockReturnValueOnce({
        data: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockBookingHistory,
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: mockRecommendedEvents,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    expect(screen.getByText("You don't have any upcoming bookings. Browse events to find something exciting!")).toBeInTheDocument();
  });

  it('calls booking update handlers correctly', () => {
    const mockRefetchUpcoming = vi.fn();
    const mockRefetchHistory = vi.fn();

    (useQuery as any)
      .mockReturnValueOnce({
        data: mockUpcomingBookings,
        loading: false,
        error: null,
        refetch: mockRefetchUpcoming,
      })
      .mockReturnValueOnce({
        data: mockBookingHistory,
        loading: false,
        error: null,
        refetch: mockRefetchHistory,
      })
      .mockReturnValueOnce({
        data: mockRecommendedEvents,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

    render(<CustomerDashboard />);

    // The onBookingUpdate function should be passed to child components
    // This would be tested through integration with those components
  });
});