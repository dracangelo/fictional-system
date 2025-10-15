import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  useAdvancedSearch, 
  useSearchSuggestions, 
  useSearchInterface,
  useSearchHistory,
  useSavedSearches 
} from '../useSearch';

// Mock the search service
vi.mock('../../services/search', () => ({
  searchService: {
    search: vi.fn(),
    smartSearch: vi.fn(),
    getSuggestions: vi.fn(),
    getPersonalizedSuggestions: vi.fn(),
    getSearchHistory: vi.fn(),
    getSavedSearches: vi.fn(),
    saveSearchToHistory: vi.fn(),
    highlightSearchTerms: vi.fn((text) => text),
  },
}));

// Mock useDebounce
vi.mock('../useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAdvancedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not search when query is empty', () => {
    const { result } = renderHook(
      () => useAdvancedSearch(''),
      { wrapper: createWrapper() }
    );

    expect(searchService.search).not.toHaveBeenCalled();
  });

  it('should search when query has sufficient length', async () => {
    const mockResults = {
      results: [{ id: '1', title: 'Test Event' }],
      count: 1,
      next: null,
      previous: null,
    };

    (searchService.search as jest.Mock).mockResolvedValue(mockResults);

    const { result } = renderHook(
      () => useAdvancedSearch('test query'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(searchService.search).toHaveBeenCalledWith('test query', undefined);
  });

  it('should use smart search when enabled', async () => {
    const mockResults = {
      results: { results: [{ id: '1', title: 'Test Event' }], count: 1 },
      corrected_query: 'corrected query',
    };

    (searchService.smartSearch as jest.Mock).mockResolvedValue(mockResults);

    const { result } = renderHook(
      () => useAdvancedSearch('test query', {}, { enableSmartSearch: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(searchService.smartSearch).toHaveBeenCalledWith('test query', {});
  });

  it('should apply filters correctly', async () => {
    const filters = {
      category: 'music',
      location: 'new york',
    };

    (searchService.search as jest.Mock).mockResolvedValue({
      results: [],
      count: 0,
    });

    renderHook(
      () => useAdvancedSearch('test', filters),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('test', filters);
    });
  });

  it('should save search to history on successful search', async () => {
    const mockResults = {
      results: [{ id: '1', title: 'Test Event' }],
      count: 1,
    };

    (searchService.search as jest.Mock).mockResolvedValue(mockResults);

    renderHook(
      () => useAdvancedSearch('test query'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(searchService.saveSearchToHistory).toHaveBeenCalledWith(
        'test query',
        undefined,
        1
      );
    });
  });
});

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch suggestions for short queries', () => {
    renderHook(
      () => useSearchSuggestions('a'),
      { wrapper: createWrapper() }
    );

    expect(searchService.getSuggestions).not.toHaveBeenCalled();
  });

  it('should fetch suggestions for valid queries', async () => {
    const mockSuggestions = [
      { id: '1', title: 'Test Event', type: 'event' },
    ];

    (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(
      () => useSearchSuggestions('test'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(searchService.getSuggestions).toHaveBeenCalledWith('test');
  });

  it('should use personalized suggestions when enabled', async () => {
    const mockSuggestions = [
      { id: '1', title: 'Personalized Event', type: 'event' },
    ];

    (searchService.getPersonalizedSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

    renderHook(
      () => useSearchSuggestions('test', { personalized: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(searchService.getPersonalizedSuggestions).toHaveBeenCalledWith('test');
    });
  });
});

describe('useSearchInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with provided query and filters', () => {
    const initialQuery = 'initial query';
    const initialFilters = { category: 'music' };

    const { result } = renderHook(
      () => useSearchInterface(initialQuery, initialFilters),
      { wrapper: createWrapper() }
    );

    expect(result.current.query).toBe(initialQuery);
    expect(result.current.filters).toEqual(initialFilters);
  });

  it('should update query when handleQueryChange is called', () => {
    const { result } = renderHook(
      () => useSearchInterface(),
      { wrapper: createWrapper() }
    );

    const newQuery = 'new query';
    result.current.handleQueryChange(newQuery);

    expect(result.current.query).toBe(newQuery);
  });

  it('should update filters when handleFiltersChange is called', () => {
    const { result } = renderHook(
      () => useSearchInterface(),
      { wrapper: createWrapper() }
    );

    const newFilters = { category: 'sports' };
    result.current.handleFiltersChange(newFilters);

    expect(result.current.filters).toEqual(expect.objectContaining(newFilters));
  });

  it('should handle suggestion selection', () => {
    const { result } = renderHook(
      () => useSearchInterface(),
      { wrapper: createWrapper() }
    );

    const suggestion = {
      id: '1',
      title: 'Selected Event',
      type: 'event' as const,
    };

    result.current.handleSuggestionSelect(suggestion);

    expect(result.current.query).toBe(suggestion.title);
    expect(result.current.selectedSuggestion).toEqual(suggestion);
  });

  it('should clear search correctly', () => {
    const { result } = renderHook(
      () => useSearchInterface('initial query', { category: 'music' }),
      { wrapper: createWrapper() }
    );

    result.current.clearSearch();

    expect(result.current.query).toBe('');
    expect(result.current.filters).toEqual({});
    expect(result.current.selectedSuggestion).toBeNull();
  });

  it('should provide correct status indicators', async () => {
    (searchService.search as jest.Mock).mockResolvedValue({
      results: [{ id: '1', title: 'Test Event' }],
      count: 1,
    });

    const { result } = renderHook(
      () => useSearchInterface('test query'),
      { wrapper: createWrapper() }
    );

    // Initially should show loading
    expect(result.current.isSearching).toBe(true);

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
      expect(result.current.hasResults).toBe(true);
      expect(result.current.totalResults).toBe(1);
    });
  });
});

describe('useSearchHistory', () => {
  it('should fetch search history', async () => {
    const mockHistory = [
      { id: '1', query: 'test', timestamp: '2023-01-01', result_count: 5 },
    ];

    (searchService.getSearchHistory as jest.Mock).mockResolvedValue(mockHistory);

    const { result } = renderHook(
      () => useSearchHistory(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockHistory);
    expect(searchService.getSearchHistory).toHaveBeenCalled();
  });
});

describe('useSavedSearches', () => {
  it('should fetch saved searches', async () => {
    const mockSavedSearches = [
      { 
        id: '1', 
        name: 'My Search', 
        query: 'test', 
        created_at: '2023-01-01',
        notification_enabled: false 
      },
    ];

    (searchService.getSavedSearches as jest.Mock).mockResolvedValue(mockSavedSearches);

    const { result } = renderHook(
      () => useSavedSearches(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSavedSearches);
    expect(searchService.getSavedSearches).toHaveBeenCalled();
  });
});