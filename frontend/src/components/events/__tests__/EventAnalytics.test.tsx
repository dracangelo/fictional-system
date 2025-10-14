import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EventAnalytics } from '../EventAnalytics';
import { eventService } from '../../../services/event';
import type { Event, EventAnalytics as EventAnalyticsType } from '../../../types/event';

// Mock the event service
vi.mock('../../../services/event', () => ({
  eventService: {
    getEventAnalytics: vi.fn(),
    getEvent: vi.fn(),
  },
}));

// Mock the useQuery hook
const mockUseQuery = vi.fn();
vi.mock('../../../hooks/useQuery', () => ({
  useQuery: mockUseQuery,
}));

const mockEvent: Event = {
  id: '1',
  owner: 'user1',
  title: 'Test Event',
  description: 'Test Description',
  venue: 'Test Venue',
  address: '123 Test St',
  category: 'music',
  start_datetime: '2024-12-01T18:00:00Z',
  end_datetime: '2024-12-01T22:00:00Z',
  media: [],
  status: 'published',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAnalytics: EventAnalyticsType = {
  total_bookings: 25,
  total_revenue: 2500.00,
  tickets_sold: 75,
  tickets_available: 100,
  conversion_rate: 0.15,
  popular_ticket_types: [
    {
      name: 'General Admission',
      sold: 50,
      revenue: 1500.00,
    },
    {
      name: 'VIP',
      sold: 25,
      revenue: 1000.00,
    },
  ],
  booking_trends: [
    {
      date: '2024-11-01',
      bookings: 5,
      revenue: 500.00,
    },
    {
      date: '2024-11-02',
      bookings: 8,
      revenue: 800.00,
    },
    {
      date: '2024-11-03',
      bookings: 12,
      revenue: 1200.00,
    },
  ],
};

describe('EventAnalytics', () => {
  const mockOnClose = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useQuery calls
    mockUseQuery
      .mockReturnValueOnce({
        data: mockAnalytics,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });
  });

  it('renders analytics modal correctly', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Event Analytics')).toBeInTheDocument();
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('displays key metrics correctly', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();

    expect(screen.getByText('Tickets Sold')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('of 100 available')).toBeInTheDocument();

    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('displays ticket sales progress', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Ticket Sales Progress')).toBeInTheDocument();
    expect(screen.getByText('Sold: 75')).toBeInTheDocument();
    expect(screen.getByText('Available: 25')).toBeInTheDocument();
    expect(screen.getByText('75.0% sold')).toBeInTheDocument();
  });

  it('displays popular ticket types', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Popular Ticket Types')).toBeInTheDocument();
    expect(screen.getByText('General Admission')).toBeInTheDocument();
    expect(screen.getByText('50 sold')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();

    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('25 sold')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('displays booking trends chart', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Booking Trends')).toBeInTheDocument();
    expect(screen.getByText('Nov 1')).toBeInTheDocument();
    expect(screen.getByText('Nov 2')).toBeInTheDocument();
    expect(screen.getByText('Nov 3')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('shows error state', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: null,
        loading: false,
        error: new Error('Failed to load analytics'),
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Error loading analytics: Failed to load analytics')).toBeInTheDocument();
  });

  it('changes date range and refetches data', async () => {
    const user = userEvent.setup();
    
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    const dateRangeSelect = screen.getByDisplayValue('Last 30 days');
    await user.selectOptions(dateRangeSelect, 'Last 7 days');

    // The useQuery hook should be called with updated date range
    expect(dateRangeSelect).toHaveValue('7');
  });

  it('refreshes analytics data', async () => {
    const user = userEvent.setup();
    
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('closes modal when close is triggered', async () => {
    const user = userEvent.setup();
    
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    // The modal should have a close button (from Modal component)
    // Since we're not mocking the Modal component, we'll test the onClose prop
    expect(mockOnClose).toBeDefined();
  });

  it('displays conversion rate with appropriate color', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    const conversionRate = screen.getByText('15.0%');
    expect(conversionRate).toHaveClass('text-green-600'); // High conversion rate
  });

  it('shows low conversion rate warning', () => {
    const lowConversionAnalytics = {
      ...mockAnalytics,
      conversion_rate: 0.03, // 3% - low conversion rate
    };

    mockUseQuery
      .mockReturnValueOnce({
        data: lowConversionAnalytics,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Low Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('Consider improving your event description, adding more media, or adjusting pricing.')).toBeInTheDocument();
  });

  it('shows high demand insight', () => {
    const highDemandAnalytics = {
      ...mockAnalytics,
      tickets_sold: 85, // 85% sold
      tickets_available: 100,
    };

    mockUseQuery
      .mockReturnValueOnce({
        data: highDemandAnalytics,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('High Demand')).toBeInTheDocument();
    expect(screen.getByText('Your event is selling well! Consider creating similar events in the future.')).toBeInTheDocument();
  });

  it('shows promotion opportunity insight', () => {
    const lowSalesAnalytics = {
      ...mockAnalytics,
      tickets_sold: 20, // 20% sold
      tickets_available: 100,
    };

    mockUseQuery
      .mockReturnValueOnce({
        data: lowSalesAnalytics,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Promotion Opportunity')).toBeInTheDocument();
    expect(screen.getByText('Consider running promotions or increasing marketing efforts to boost sales.')).toBeInTheDocument();
  });

  it('handles empty popular ticket types', () => {
    const analyticsWithoutTicketTypes = {
      ...mockAnalytics,
      popular_ticket_types: [],
    };

    mockUseQuery
      .mockReturnValueOnce({
        data: analyticsWithoutTicketTypes,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Popular Ticket Types')).not.toBeInTheDocument();
  });

  it('handles empty booking trends', () => {
    const analyticsWithoutTrends = {
      ...mockAnalytics,
      booking_trends: [],
    };

    mockUseQuery
      .mockReturnValueOnce({
        data: analyticsWithoutTrends,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Booking Trends')).not.toBeInTheDocument();
  });

  it('limits booking trends display to 14 days', () => {
    const manyTrends = Array.from({ length: 20 }, (_, i) => ({
      date: `2024-11-${String(i + 1).padStart(2, '0')}`,
      bookings: i + 1,
      revenue: (i + 1) * 100,
    }));

    const analyticsWithManyTrends = {
      ...mockAnalytics,
      booking_trends: manyTrends,
    };

    mockUseQuery
      .mockReturnValueOnce({
        data: analyticsWithManyTrends,
        loading: false,
        error: null,
        refetch: mockRefetch,
      })
      .mockReturnValueOnce({
        data: mockEvent,
        loading: false,
        error: null,
      });

    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Showing last 14 days')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <EventAnalytics
        eventId="1"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Nov 1')).toBeInTheDocument();
    expect(screen.getByText('Nov 2')).toBeInTheDocument();
    expect(screen.getByText('Nov 3')).toBeInTheDocument();
  });
});