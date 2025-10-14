import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FilterPanel } from '../FilterPanel';
import type { EventFilters } from '../../../types/event';

describe('FilterPanel', () => {
  const mockOnChange = vi.fn();
  
  const defaultFilters: EventFilters = {
    search: '',
    category: '',
    location: '',
    date_from: '',
    date_to: '',
    price_min: undefined,
    price_max: undefined,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all filter sections', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
        totalResults={100}
      />
    );

    expect(screen.getByLabelText(/search events/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByText(/date range/i)).toBeInTheDocument();
    expect(screen.getByText(/price range/i)).toBeInTheDocument();
  });

  it('displays total results count', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
        totalResults={42}
      />
    );

    expect(screen.getByText('42 events found')).toBeInTheDocument();
  });

  it('calls onChange when search input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
      />
    );

    const searchInput = screen.getByLabelText(/search events/i);
    await user.type(searchInput, 'concert');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({ search: 'concert' });
    });
  });

  it('calls onChange when category changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
      />
    );

    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'concert');

    expect(mockOnChange).toHaveBeenCalledWith({ category: 'concert' });
  });

  it('calls onChange when location changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
      />
    );

    const locationSelect = screen.getByLabelText(/location/i);
    await user.selectOptions(locationSelect, 'downtown');

    expect(mockOnChange).toHaveBeenCalledWith({ location: 'downtown' });
  });

  it('calls onChange when date range changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
      />
    );

    const fromDateInput = screen.getByLabelText(/from/i);
    await user.type(fromDateInput, '2024-01-15');

    expect(mockOnChange).toHaveBeenCalledWith({ date_from: '2024-01-15' });
  });

  it('calls onChange when price range changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
      />
    );

    const minPriceInput = screen.getByLabelText(/min price/i);
    await user.type(minPriceInput, '50');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        price_min: 50,
        price_max: undefined,
      });
    });
  });

  it('displays active filters count', () => {
    const filtersWithValues: EventFilters = {
      search: 'concert',
      category: 'music',
      location: 'downtown',
      date_from: '2024-01-15',
      date_to: '',
      price_min: 50,
      price_max: undefined,
    };

    render(
      <FilterPanel
        filters={filtersWithValues}
        onChange={mockOnChange}
      />
    );

    // Should show badge with count of active filters
    expect(screen.getByText('4')).toBeInTheDocument(); // search, category, location, date_from, price_min
  });

  it('displays active filter badges', () => {
    const filtersWithValues: EventFilters = {
      search: 'concert',
      category: 'concert',
      location: 'downtown',
      date_from: '2024-01-15',
      date_to: '2024-01-20',
      price_min: 50,
      price_max: 200,
    };

    render(
      <FilterPanel
        filters={filtersWithValues}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Search: concert')).toBeInTheDocument();
    expect(screen.getByText('Concerts')).toBeInTheDocument();
    expect(screen.getByText('Downtown')).toBeInTheDocument();
    expect(screen.getByText(/Date:/)).toBeInTheDocument();
    expect(screen.getByText(/Price:/)).toBeInTheDocument();
  });

  it('removes individual filters when badge remove button is clicked', async () => {
    const user = userEvent.setup();
    const filtersWithValues: EventFilters = {
      search: 'concert',
      category: 'concert',
    };

    render(
      <FilterPanel
        filters={filtersWithValues}
        onChange={mockOnChange}
      />
    );

    // Find and click the remove button for search filter
    const searchBadge = screen.getByText('Search: concert');
    const removeButton = searchBadge.parentElement?.querySelector('button');
    
    if (removeButton) {
      await user.click(removeButton);
      expect(mockOnChange).toHaveBeenCalledWith({ search: '' });
    }
  });

  it('clears all filters when clear all button is clicked', async () => {
    const user = userEvent.setup();
    const filtersWithValues: EventFilters = {
      search: 'concert',
      category: 'concert',
      location: 'downtown',
    };

    render(
      <FilterPanel
        filters={filtersWithValues}
        onChange={mockOnChange}
      />
    );

    const clearAllButton = screen.getByText('Clear all');
    await user.click(clearAllButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      search: '',
      category: '',
      location: '',
      date_from: '',
      date_to: '',
      price_min: undefined,
      price_max: undefined,
    });
  });

  it('toggles filter panel visibility on mobile', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={mockOnChange}
      />
    );

    const toggleButton = screen.getByText('Hide');
    await user.click(toggleButton);

    expect(screen.getByText('Show')).toBeInTheDocument();
  });
});