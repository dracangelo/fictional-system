import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EventForm } from '../EventForm';
import { eventService } from '../../../services/event';
import type { Event } from '../../../types/event';

// Mock the event service
vi.mock('../../../services/event', () => ({
  eventService: {
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    getTicketTypes: vi.fn(),
    uploadEventMedia: vi.fn(),
  },
}));

// Mock the child components
vi.mock('../TicketTypesSection', () => ({
  TicketTypesSection: ({ eventId }: { eventId: string }) => (
    <div data-testid="ticket-types-section">Ticket Types for {eventId}</div>
  ),
}));

vi.mock('../MediaUpload', () => ({
  MediaUpload: ({ onMediaUpdate }: { onMediaUpdate: (media: string[]) => void }) => (
    <div data-testid="media-upload">
      <button onClick={() => onMediaUpdate(['test-image.jpg'])}>
        Add Media
      </button>
    </div>
  ),
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
  media: ['image1.jpg'],
  status: 'draft',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('EventForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form correctly', () => {
    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Event')).toBeInTheDocument();
    expect(screen.getByLabelText('Event Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Venue Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date & Time')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date & Time')).toBeInTheDocument();
  });

  it('renders edit form with existing event data', () => {
    render(
      <EventForm
        event={mockEvent}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Venue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByText('Create Event');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Venue is required')).toBeInTheDocument();
      expect(screen.getByText('Address is required')).toBeInTheDocument();
      expect(screen.getByText('Category is required')).toBeInTheDocument();
    });
  });

  it('validates date fields', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText('Event Title'), 'Test Event');
    await user.type(screen.getByLabelText('Description'), 'Test Description');
    await user.type(screen.getByLabelText('Venue Name'), 'Test Venue');
    await user.type(screen.getByLabelText('Address'), 'Test Address');
    
    // Set end date before start date
    const startDate = '2024-12-01T20:00';
    const endDate = '2024-12-01T18:00';
    
    await user.type(screen.getByLabelText('Start Date & Time'), startDate);
    await user.type(screen.getByLabelText('End Date & Time'), endDate);

    const submitButton = screen.getByText('Create Event');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });
  });

  it('creates new event successfully', async () => {
    const user = userEvent.setup();
    const mockCreateEvent = vi.mocked(eventService.createEvent);
    mockCreateEvent.mockResolvedValue(mockEvent);

    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in the form
    await user.type(screen.getByLabelText('Event Title'), 'Test Event');
    await user.type(screen.getByLabelText('Description'), 'Test Description');
    await user.type(screen.getByLabelText('Venue Name'), 'Test Venue');
    await user.type(screen.getByLabelText('Address'), 'Test Address');
    await user.selectOptions(screen.getByLabelText('Category'), 'music');
    await user.type(screen.getByLabelText('Start Date & Time'), '2024-12-01T18:00');
    await user.type(screen.getByLabelText('End Date & Time'), '2024-12-01T22:00');

    const submitButton = screen.getByText('Create Event');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith({
        title: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        address: 'Test Address',
        category: 'music',
        start_datetime: '2024-12-01T18:00:00.000Z',
        end_datetime: '2024-12-01T22:00:00.000Z',
        media: [],
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('updates existing event successfully', async () => {
    const user = userEvent.setup();
    const mockUpdateEvent = vi.mocked(eventService.updateEvent);
    mockUpdateEvent.mockResolvedValue(mockEvent);

    render(
      <EventForm
        event={mockEvent}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Update the title
    const titleInput = screen.getByDisplayValue('Test Event');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Event');

    const submitButton = screen.getByText('Update Event');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith('1', expect.objectContaining({
        title: 'Updated Event',
      }));
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockCreateEvent = vi.mocked(eventService.createEvent);
    mockCreateEvent.mockRejectedValue(new Error('API Error'));

    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in the form
    await user.type(screen.getByLabelText('Event Title'), 'Test Event');
    await user.type(screen.getByLabelText('Description'), 'Test Description');
    await user.type(screen.getByLabelText('Venue Name'), 'Test Venue');
    await user.type(screen.getByLabelText('Address'), 'Test Address');
    await user.selectOptions(screen.getByLabelText('Category'), 'music');
    await user.type(screen.getByLabelText('Start Date & Time'), '2024-12-01T18:00');
    await user.type(screen.getByLabelText('End Date & Time'), '2024-12-01T22:00');

    const submitButton = screen.getByText('Create Event');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        event={mockEvent}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Check initial tab
    expect(screen.getByLabelText('Event Title')).toBeInTheDocument();

    // Switch to tickets tab
    await user.click(screen.getByText('Ticket Types'));
    expect(screen.getByTestId('ticket-types-section')).toBeInTheDocument();

    // Switch to media tab
    await user.click(screen.getByText('Media'));
    expect(screen.getByTestId('media-upload')).toBeInTheDocument();

    // Switch back to details tab
    await user.click(screen.getByText('Event Details'));
    expect(screen.getByLabelText('Event Title')).toBeInTheDocument();
  });

  it('handles media updates correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Switch to media tab
    await user.click(screen.getByText('Media'));
    
    // Add media
    await user.click(screen.getByText('Add Media'));

    // Switch back to details and submit
    await user.click(screen.getByText('Event Details'));
    
    // Fill in required fields
    await user.type(screen.getByLabelText('Event Title'), 'Test Event');
    await user.type(screen.getByLabelText('Description'), 'Test Description');
    await user.type(screen.getByLabelText('Venue Name'), 'Test Venue');
    await user.type(screen.getByLabelText('Address'), 'Test Address');
    await user.selectOptions(screen.getByLabelText('Category'), 'music');
    await user.type(screen.getByLabelText('Start Date & Time'), '2024-12-01T18:00');
    await user.type(screen.getByLabelText('End Date & Time'), '2024-12-01T22:00');

    const mockCreateEvent = vi.mocked(eventService.createEvent);
    mockCreateEvent.mockResolvedValue(mockEvent);

    const submitButton = screen.getByText('Create Event');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({
        media: ['test-image.jpg'],
      }));
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <EventForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});