import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchResults } from '../SearchResults';

// Mock the hooks
vi.mock('../../../hooks/useSearch', () => ({
  useSearchInterface: vi.fn(() => ({
    searchResults: {
      results: [
        {
          id: '1',
          title: 'Test Event',
          description: 'Test Description',
          start_datetime: '2024-01-01T10:00:00Z',
          venue: 'Test Venue',
          category: 'music',
        },
      ],
      count: 1,
    },
    isSearching: false,
    hasResults: true,
    totalResults: 1,
    searchError: null,
    handleFiltersChange: vi.fn(),
    highlightSearchTerms: vi.fn((text) => text),
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search results header', () => {
    renderWithProviders(
      <SearchResults query="test query" />
    );
    
    expect(screen.getByText('Search Results')).toBeInTheDocument();
  });

  it('displays result count', () => {
    renderWithProviders(
      <SearchResults query="test query" />
    );
    
    expect(screen.getByText(/found 1 results/i)).toBeInTheDocument();
  });

  it('shows sort options', () => {
    renderWithProviders(
      <SearchResults query="test query" />
    );
    
    expect(screen.getByDisplayValue('Relevance')).toBeInTheDocument();
  });

  it('renders view mode toggle', () => {
    renderWithProviders(
      <SearchResults query="test query" />
    );
    
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it('displays smart search indicator for relevance sort', () => {
    renderWithProviders(
      <SearchResults 
        query="test query" 
        filters={{ sort_by: 'relevance' }}
      />
    );
    
    expect(screen.getByText('Smart Search Results')).toBeInTheDocument();
  });
});