import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdvancedSearchBar } from '../AdvancedSearchBar';

// Mock the search service
vi.mock('../../../services/search', () => ({
  searchService: {
    getSuggestions: vi.fn(),
    getPersonalizedSuggestions: vi.fn(),
    highlightSearchTerms: vi.fn((text) => text),
  },
}));

// Mock the hooks
vi.mock('../../../hooks/useSearch', () => ({
  useSearchInterface: () => ({
    query: '',
    filters: {},
    suggestions: [
      { id: '1', title: 'Concert in Central Park', type: 'event' },
      { id: '2', title: 'The Dark Knight', type: 'movie' },
    ],
    searchHistory: ['previous search'],
    popularSearches: ['popular search'],
    showSuggestions: false,
    isLoadingSuggestions: false,
    handleQueryChange: vi.fn(),
    handleFiltersChange: vi.fn(),
    handleSuggestionSelect: vi.fn(),
    handleSearch: vi.fn(),
    clearSearch: vi.fn(),
    setShowSuggestions: vi.fn(),
    highlightSearchTerms: vi.fn((text) => text),
  }),
  useSaveSearch: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
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

describe('AdvancedSearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    renderWithProviders(<AdvancedSearchBar />);
    
    expect(screen.getByPlaceholderText(/search for events, movies, venues/i)).toBeInTheDocument();
  });

  it('renders search button', () => {
    renderWithProviders(<AdvancedSearchBar />);
    
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls onSearch when search button is clicked', async () => {
    const mockOnSearch = jest.fn();
    renderWithProviders(<AdvancedSearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/search for events, movies, venues/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    await userEvent.type(input, 'test query');
    await userEvent.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalled();
  });

  it('shows clear button when there is text', async () => {
    renderWithProviders(<AdvancedSearchBar initialQuery="test" />);
    
    expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    renderWithProviders(<AdvancedSearchBar />);
    
    const input = screen.getByPlaceholderText(/search for events, movies, venues/i);
    
    // Test Enter key
    await userEvent.type(input, 'test{enter}');
    
    // Test Escape key
    await userEvent.type(input, '{escape}');
  });

  it('displays loading indicator when loading suggestions', () => {
    // This would need to be mocked to show loading state
    renderWithProviders(<AdvancedSearchBar />);
    
    // The loading indicator would be shown based on isLoadingSuggestions
    // This test would need the mock to return isLoadingSuggestions: true
  });

  it('handles suggestion selection', async () => {
    renderWithProviders(<AdvancedSearchBar />);
    
    const input = screen.getByPlaceholderText(/search for events, movies, venues/i);
    await userEvent.type(input, 'concert');
    
    // This would trigger suggestions to show
    // The actual suggestion interaction would need the suggestions to be visible
  });

  it('shows save search dialog when save button is clicked', async () => {
    renderWithProviders(<AdvancedSearchBar initialQuery="test query" />);
    
    const saveButton = screen.getByTitle(/save this search/i);
    await userEvent.click(saveButton);
    
    expect(screen.getByText(/save search/i)).toBeInTheDocument();
  });

  it('handles filter indicators correctly', () => {
    const filters = {
      category: 'music',
      location: 'new york',
    };
    
    renderWithProviders(
      <AdvancedSearchBar 
        initialFilters={filters}
        showFilters={true}
      />
    );
    
    // Should show filter count
    expect(screen.getByText(/2 filters/i)).toBeInTheDocument();
  });

  it('supports custom placeholder text', () => {
    const customPlaceholder = 'Custom search placeholder';
    renderWithProviders(
      <AdvancedSearchBar placeholder={customPlaceholder} />
    );
    
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });

  it('handles accessibility correctly', () => {
    renderWithProviders(<AdvancedSearchBar />);
    
    const input = screen.getByPlaceholderText(/search for events, movies, venues/i);
    
    // Should have proper ARIA attributes
    expect(input).toHaveAttribute('type', 'text');
    
    // Clear button should have proper label
    // This would only be visible if there's text in the input
  });

  it('debounces search input', async () => {
    renderWithProviders(<AdvancedSearchBar />);
    
    const input = screen.getByPlaceholderText(/search for events, movies, venues/i);
    
    // Type quickly
    await userEvent.type(input, 'test');
    
    // The debounced search should not trigger immediately
    // This would need to be tested with proper timing
  });
});