import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EventOwnerDashboard } from '../EventOwnerDashboard';
import { eventService } from '../../../services/event';
import type { Event, TicketType } from '../../../types/event';

// Mock the event service
vi.mock('../../../services/event', () => ({
  eventService: {
    getEvents: vi.fn(),
  },
}));

// Mock the useQuery hook
const mockUseQuery = vi.fn();
vi.mock('../../../hooks/useQuery', () => ({
  useQuery: mockUseQuery,
}));

// Mock child components
vi.mock('../../../components/events/EventForm', () => ({
  EventForm: ({ event, onClose, onSuccess }: any) => (
    <div data-testid="event-form">
      <div>Event Form - {event ? 'Edit' : 'Create'}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Success</button>
    </div>
  ),
}));

vi.mock('../../../components/events/EventAnalytics', () => ({
  EventAnalytics: ({ eventId, onClose }: any) => (
    <div data-testid="event-analytics">
      <div>Analytics for {eventId}</div>
      <button onClick={onClose}>Close Analytics</button>
    </div>
  ),
}));

const mockTicketTypes: TicketType[] = [
  {
    id: '1',
    event: 'event1',
    name: 'General',
    price: 50,
    quantity_available: 100,
    quantity_sold: 30,
    description: 'General admission',
  },
  {
    id: '2',
    event: 'event1',
    name: 'VIP',
    price: 150,
    quantity_available: 20,
    quantity_sold: 5,
    description: 'VIP access',
  },
];

const mockEvents: Event[] = [
  {
    id: '1',
    owner: 'user1',
    title: 'Music Concert',
    description: 'Great music event',
    venue: 'Concert Hall',
    address: '123 Music St',
    category: 'music',
    start_datetime: '2024-12-01T19:00:00Z',
    end_datetime: '2024-12-01T23:00:00Z',
    media: ['image1.jpg'],
    status: 'published',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ticket_types: mockTicketTypes,
  },
  {
    id: '2',
    owner: 'user1',
    title: 'Comedy Show',
    description: 'Funny comedy show',
    venue: 'Comedy Club',
    address: '456 Laugh Ave',
    category: 'comedy',
    start_datetime: '2024-12-15T20:00:00Z',
    end_datetime: '2024-12-15T22:00:00Z',
    media: [],
    status: 'draft',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ticket_types: [],
  },
];

describe('EventOwnerDashboard', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useQuery to return events
    mockUseQuery.mockReturnValue({
      data: { results: mockEvents },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('renders dashboard with events correctly', () => {
    render(<EventOwnerDashboard />);

    expect(screen.getByText('Event Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage your events and track performance')).toBeInTheDocument();
    expect(screen.getByText('Create New Event')).toBeInTheDocument();
    
    // Check overview cards
    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Total events count
    
    expect(screen.getByText('Published Events')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Published events count
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$2,250')).toBeInTheDocument(); // Revenue calculation
    
    expect(screen.getByText('Tickets Sold')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument(); // Tickets sold count
  });

  it('displays events list with correct information', () => {
    render(<EventOwnerDashboard />);

    // Check first event
    expect(screen.getByText('Music Concert')).toBeInTheDocument();
    expect(screen.getByText('Concert Hall')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('Tickets Sold: 35')).toBeInTheDocument();
    expect(screen.getByText('Revenue: $2,250')).toBeInTheDocument();

    // Check second event
    expect(screen.getByText('Comedy Show')).toBeInTheDocument();
    expect(screen.getByText('Comedy Club')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<EventOwnerDashboard />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Failed to load events'),
      refetch: mockRefetch,
    });

    render(<EventOwnerDashboard />);

    expect(screen.getByText('Error loading events: Failed to load events')).toBeInTheDocument();
  });

  it('shows empty state when no events exist', () => {
    mockUseQuery.mockReturnValue({
      data: { results: [] },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<EventOwnerDashboard />);

    expect(screen.getByText('No events yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first event to get started')).toBeInTheDocument();
  });

  it('opens create event form', async () => {
    const user = userEvent.setup();
    
    render(<EventOwnerDashboard />);

    const createButton = screen.getByText('Create New Event');
    await user.click(createButton);

    expect(screen.getByTestId('event-form')).toBeInTheDocument();
    expect(screen.getByText('Event Form - Create')).toBeInTheDocument();
  });

  it('opens edit event form', async () => {
    const user = userEvent.setup();
    
    render(<EventOwnerDashboard />);

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(screen.getByTestId('event-form')).toBeInTheDocument();
    expect(screen.getByText('Event Form - Edit')).toBeInTheDocument();
  });

  it('opens event analytics', async () => {
    const user = userEvent.setup();
    
    render(<EventOwnerDashboard />);

    const analyticsButtons = screen.getAllByText('Analytics');
    await user.click(analyticsButtons[0]);

    expect(screen.getByTestId('event-analytics')).toBeInTheDocument();
    expect(screen.getByText('Analytics for 1')).toBeInTheDocument();
  });

  it('closes event form and refetches data', async () => {
    const user = userEvent.setup();
    
    render(<EventOwnerDashboard />);

    // Open form
    await user.click(screen.getByText('Create New Event'));
    expect(screen.getByTestId('event-form')).toBeInTheDocument();

    // Close form
    await user.click(screen.getByText('Close'));
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles form success and refetches data', async () => {
    const user = userEvent.setup();
    
    render(<EventOwnerDashboard />);

    // Open form
    await user.click(screen.getByText('Create New Event'));
    
    // Trigger success
    await user.click(screen.getByText('Success'));
    
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('closes analytics modal', async () => {
    const user = userEvent.setup();
    
    render(<EventOwnerDashboard />);

    // Open analytics
    const analyticsButtons = screen.getAllByText('Analytics');
    await user.click(analyticsButtons[0]);
    expect(screen.getByTestId('event-analytics')).toBeInTheDocument();

    // Close analytics
    await user.click(screen.getByText('Close Analytics'));
    expect(screen.queryByTestId('event-analytics')).not.toBeInTheDocument();
  });

  it('calculates revenue correctly', () => {
    render(<EventOwnerDashboard />);

    // Revenue should be: (30 * 50) + (5 * 150) = 1500 + 750 = 2250
    expect(screen.getByText('$2,250')).toBeInTheDocument();
  });

  it('calculates tickets sold correctly', () => {
    render(<EventOwnerDashboard />);

    // Tickets sold should be: 30 + 5 = 35
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<EventOwnerDashboard />);

    const publishedBadge = screen.getByText('published');
    const draftBadge = screen.getByText('draft');

    expect(publishedBadge).toBeInTheDocument();
    expect(draftBadge).toBeInTheDocument();
  });

  it('shows inactive badge for inactive events', () => {
    const inactiveEvent = {
      ...mockEvents[0],
      is_active: false,
    };

    mockUseQuery.mockReturnValue({
      data: { results: [inactiveEvent] },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<EventOwnerDashboard />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<EventOwnerDashboard />);

    // Check if dates are formatted (exact format may vary based on locale)
    expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Dec 15, 2024/)).toBeInTheDocument();
  });

  it('handles events without ticket types', () => {
    const eventWithoutTickets = {
      ...mockEvents[1],
      ticket_types: undefined,
    };

    mockUseQuery.mockReturnValue({
      data: { results: [eventWithoutTickets] },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<EventOwnerDashboard />);

    // Should not show tickets sold or revenue for events without ticket types
    expect(screen.queryByText('Tickets Sold:')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue:')).not.toBeInTheDocument();
  });
});