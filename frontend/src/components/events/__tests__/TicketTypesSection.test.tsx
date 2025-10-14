import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TicketTypesSection } from '../TicketTypesSection';
import { eventService } from '../../../services/event';
import type { TicketType } from '../../../types/event';

// Mock the event service
vi.mock('../../../services/event', () => ({
  eventService: {
    getTicketTypes: vi.fn(),
    createTicketType: vi.fn(),
    updateTicketType: vi.fn(),
    deleteTicketType: vi.fn(),
  },
}));

// Mock the useQuery hook
const mockUseQuery = vi.fn();
vi.mock('../../../hooks/useQuery', () => ({
  useQuery: mockUseQuery,
}));

const mockTicketTypes: TicketType[] = [
  {
    id: '1',
    event: 'event1',
    name: 'General Admission',
    price: 50.00,
    quantity_available: 100,
    quantity_sold: 25,
    description: 'Standard entry ticket',
  },
  {
    id: '2',
    event: 'event1',
    name: 'VIP',
    price: 150.00,
    quantity_available: 20,
    quantity_sold: 5,
    description: 'VIP access with premium amenities',
  },
];

describe('TicketTypesSection', () => {
  const mockRefetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useQuery to return ticket types
    mockUseQuery.mockReturnValue({
      data: mockTicketTypes,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('renders ticket types list correctly', () => {
    render(<TicketTypesSection eventId="event1" />);

    expect(screen.getByText('Ticket Types')).toBeInTheDocument();
    expect(screen.getByText('General Admission')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('displays ticket availability and sales data', () => {
    render(<TicketTypesSection eventId="event1" />);

    // Check General Admission data
    expect(screen.getByText('75 / 100')).toBeInTheDocument(); // Available
    expect(screen.getByText('25')).toBeInTheDocument(); // Sold
    expect(screen.getByText('$1250.00')).toBeInTheDocument(); // Revenue (25 * 50)

    // Check VIP data
    expect(screen.getByText('15 / 20')).toBeInTheDocument(); // Available
    expect(screen.getByText('5')).toBeInTheDocument(); // Sold
    expect(screen.getByText('$750.00')).toBeInTheDocument(); // Revenue (5 * 150)
  });

  it('shows empty state when no ticket types exist', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<TicketTypesSection eventId="event1" />);

    expect(screen.getByText('No ticket types yet')).toBeInTheDocument();
    expect(screen.getByText('Create ticket types to start selling tickets for your event')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<TicketTypesSection eventId="event1" />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Failed to load ticket types'),
      refetch: mockRefetch,
    });

    render(<TicketTypesSection eventId="event1" />);

    expect(screen.getByText('Error loading ticket types: Failed to load ticket types')).toBeInTheDocument();
  });

  it('opens add ticket type form', async () => {
    const user = userEvent.setup();
    
    render(<TicketTypesSection eventId="event1" />);

    const addButton = screen.getByText('Add Ticket Type');
    await user.click(addButton);

    expect(screen.getByText('Add New Ticket Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticket Type Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Price ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity Available')).toBeInTheDocument();
  });

  it('creates new ticket type successfully', async () => {
    const user = userEvent.setup();
    const mockCreateTicketType = vi.mocked(eventService.createTicketType);
    mockCreateTicketType.mockResolvedValue(mockTicketTypes[0]);

    render(<TicketTypesSection eventId="event1" />);

    // Open form
    await user.click(screen.getByText('Add Ticket Type'));

    // Fill form
    await user.type(screen.getByLabelText('Ticket Type Name'), 'Early Bird');
    await user.type(screen.getByLabelText('Price ($)'), '40');
    await user.type(screen.getByLabelText('Quantity Available'), '50');
    await user.type(screen.getByLabelText('Description (Optional)'), 'Discounted early bird tickets');

    // Submit form
    await user.click(screen.getByText('Add Ticket Type'));

    await waitFor(() => {
      expect(mockCreateTicketType).toHaveBeenCalledWith('event1', {
        name: 'Early Bird',
        price: 40,
        quantity_available: 50,
        description: 'Discounted early bird tickets',
      });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('validates form fields', async () => {
    const user = userEvent.setup();
    
    render(<TicketTypesSection eventId="event1" />);

    // Open form
    await user.click(screen.getByText('Add Ticket Type'));

    // Submit empty form
    await user.click(screen.getByText('Add Ticket Type'));

    await waitFor(() => {
      expect(screen.getByText('Ticket type name is required')).toBeInTheDocument();
      expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
      expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument();
    });
  });

  it('prevents duplicate ticket type names', async () => {
    const user = userEvent.setup();
    
    render(<TicketTypesSection eventId="event1" />);

    // Open form
    await user.click(screen.getByText('Add Ticket Type'));

    // Try to create ticket type with existing name
    await user.type(screen.getByLabelText('Ticket Type Name'), 'General Admission');
    await user.type(screen.getByLabelText('Price ($)'), '60');
    await user.type(screen.getByLabelText('Quantity Available'), '30');

    // Submit form
    await user.click(screen.getByText('Add Ticket Type'));

    await waitFor(() => {
      expect(screen.getByText('A ticket type with this name already exists')).toBeInTheDocument();
    });
  });

  it('opens edit ticket type form', async () => {
    const user = userEvent.setup();
    
    render(<TicketTypesSection eventId="event1" />);

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(screen.getByText('Edit Ticket Type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('General Admission')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('updates ticket type successfully', async () => {
    const user = userEvent.setup();
    const mockUpdateTicketType = vi.mocked(eventService.updateTicketType);
    mockUpdateTicketType.mockResolvedValue(mockTicketTypes[0]);

    render(<TicketTypesSection eventId="event1" />);

    // Open edit form
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Update price
    const priceInput = screen.getByDisplayValue('50');
    await user.clear(priceInput);
    await user.type(priceInput, '55');

    // Submit form
    await user.click(screen.getByText('Update Ticket Type'));

    await waitFor(() => {
      expect(mockUpdateTicketType).toHaveBeenCalledWith('event1', '1', {
        name: 'General Admission',
        price: 55,
        quantity_available: 100,
        description: 'Standard entry ticket',
      });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('deletes ticket type with confirmation', async () => {
    const user = userEvent.setup();
    const mockDeleteTicketType = vi.mocked(eventService.deleteTicketType);
    mockDeleteTicketType.mockResolvedValue();

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TicketTypesSection eventId="event1" />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this ticket type?');

    await waitFor(() => {
      expect(mockDeleteTicketType).toHaveBeenCalledWith('event1', '1');
      expect(mockRefetch).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('cancels delete when confirmation is rejected', async () => {
    const user = userEvent.setup();
    const mockDeleteTicketType = vi.mocked(eventService.deleteTicketType);

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<TicketTypesSection eventId="event1" />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteTicketType).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('disables delete button for tickets with sales', () => {
    render(<TicketTypesSection eventId="event1" />);

    const deleteButtons = screen.getAllByText('Delete');
    
    // Both ticket types have sales, so delete buttons should be disabled
    deleteButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockCreateTicketType = vi.mocked(eventService.createTicketType);
    mockCreateTicketType.mockRejectedValue(new Error('API Error'));

    render(<TicketTypesSection eventId="event1" />);

    // Open form and fill it
    await user.click(screen.getByText('Add Ticket Type'));
    await user.type(screen.getByLabelText('Ticket Type Name'), 'Test Ticket');
    await user.type(screen.getByLabelText('Price ($)'), '25');
    await user.type(screen.getByLabelText('Quantity Available'), '10');

    // Submit form
    await user.click(screen.getByText('Add Ticket Type'));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('cancels form and resets state', async () => {
    const user = userEvent.setup();
    
    render(<TicketTypesSection eventId="event1" />);

    // Open form and fill it
    await user.click(screen.getByText('Add Ticket Type'));
    await user.type(screen.getByLabelText('Ticket Type Name'), 'Test Ticket');

    // Cancel form
    await user.click(screen.getByText('Cancel'));

    // Form should be hidden
    expect(screen.queryByText('Add New Ticket Type')).not.toBeInTheDocument();

    // Open form again - should be empty
    await user.click(screen.getByText('Add Ticket Type'));
    expect(screen.getByLabelText('Ticket Type Name')).toHaveValue('');
  });
});