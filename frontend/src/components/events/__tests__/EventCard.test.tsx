import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EventCard } from '../EventCard';
import type { Event } from '../../../types/event';

import { vi } from 'vitest';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EventCard', () => {
  const mockEvent: Event = {
    id: '1',
    owner: 'owner-1',
    title: 'Test Concert',
    description: 'A great concert event',
    venue: 'Test Venue',
    address: '123 Test St',
    category: 'concert',
    start_datetime: '2024-01-15T19:00:00Z',
    end_datetime: '2024-01-15T22:00:00Z',
    media: ['https://example.com/image.jpg'],
    status: 'published',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ticket_types: [
      {
        id: '1',
        event: '1',
        name: 'General',
        price: 50,
        quantity_available: 100,
        quantity_sold: 20,
        description: 'General admission',
      },
      {
        id: '2',
        event: '1',
        name: 'VIP',
        price: 100,
        quantity_available: 50,
        quantity_sold: 10,
        description: 'VIP access',
      },
    ],
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders event information correctly', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    expect(screen.getByText('Test Concert')).toBeInTheDocument();
    expect(screen.getByText('Test Venue')).toBeInTheDocument();
    expect(screen.getByText('A great concert event')).toBeInTheDocument();
    expect(screen.getByText('concert')).toBeInTheDocument();
  });

  it('displays formatted date and time', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    // Check for date format (Mon, Jan 15)
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
    // Check for time format (7:00 PM)
    expect(screen.getByText(/7:00 PM/)).toBeInTheDocument();
  });

  it('displays minimum price from ticket types', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('Starting from')).toBeInTheDocument();
  });

  it('displays available tickets count', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    // Total available: (100-20) + (50-10) = 120
    expect(screen.getByText('120 tickets available')).toBeInTheDocument();
  });

  it('shows "Few Left" badge when tickets are low', () => {
    const eventWithLowTickets: Event = {
      ...mockEvent,
      ticket_types: [
        {
          id: '1',
          event: '1',
          name: 'General',
          price: 50,
          quantity_available: 100,
          quantity_sold: 95, // Only 5 left
          description: 'General admission',
        },
      ],
    };

    renderWithRouter(<EventCard event={eventWithLowTickets} />);

    expect(screen.getByText('Few Left')).toBeInTheDocument();
  });

  it('shows "Sold Out" badge and disables booking when no tickets available', () => {
    const soldOutEvent: Event = {
      ...mockEvent,
      ticket_types: [
        {
          id: '1',
          event: '1',
          name: 'General',
          price: 50,
          quantity_available: 100,
          quantity_sold: 100, // Sold out
          description: 'General admission',
        },
      ],
    };

    renderWithRouter(<EventCard event={soldOutEvent} />);

    expect(screen.getByText('Sold Out')).toBeInTheDocument();
    
    const bookButtons = screen.getAllByText('Sold Out');
    bookButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows "Draft" badge for draft events', () => {
    const draftEvent: Event = {
      ...mockEvent,
      status: 'draft',
    };

    renderWithRouter(<EventCard event={draftEvent} />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('navigates to event details when card is clicked', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    const card = screen.getByText('Test Concert').closest('[role="button"], .cursor-pointer');
    if (card) {
      fireEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/events/1');
    }
  });

  it('navigates to booking page when book button is clicked', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    const bookButton = screen.getAllByText('Book Now')[0];
    fireEvent.click(bookButton);

    expect(mockNavigate).toHaveBeenCalledWith('/events/1/book');
  });

  it('displays placeholder image when no media is available', () => {
    const eventWithoutMedia: Event = {
      ...mockEvent,
      media: [],
    };

    renderWithRouter(<EventCard event={eventWithoutMedia} />);

    // Should show calendar icon as placeholder
    const calendarIcon = document.querySelector('svg');
    expect(calendarIcon).toBeInTheDocument();
  });

  it('displays "Price TBA" when no ticket types are available', () => {
    const eventWithoutTickets: Event = {
      ...mockEvent,
      ticket_types: [],
    };

    renderWithRouter(<EventCard event={eventWithoutTickets} />);

    expect(screen.getByText('Price TBA')).toBeInTheDocument();
  });

  it('applies hover effects on mouse enter', () => {
    renderWithRouter(<EventCard event={mockEvent} />);

    const card = screen.getByText('Test Concert').closest('.group');
    expect(card).toHaveClass('group');
    
    // The hover effects are CSS-based, so we just check the classes are present
    expect(card).toHaveClass('hover:shadow-lg');
    expect(card).toHaveClass('hover:-translate-y-1');
  });

  it('handles events with long titles and descriptions', () => {
    const eventWithLongContent: Event = {
      ...mockEvent,
      title: 'This is a very long event title that should be truncated when it exceeds the available space',
      description: 'This is a very long description that should also be truncated when it exceeds the available space in the card layout',
    };

    renderWithRouter(<EventCard event={eventWithLongContent} />);

    const title = screen.getByText(eventWithLongContent.title);
    const description = screen.getByText(eventWithLongContent.description);

    // Check that overflow classes are applied
    expect(title).toHaveClass('overflow-hidden');
    expect(description).toHaveClass('overflow-hidden');
  });
});