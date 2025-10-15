import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { searchService } from '../services/search';
import type { 
  SearchSuggestion, 
  SearchHistory, 
  SavedSearch, 
  SearchRecommendation,
  AdvancedSearchFilters,
  SearchAnalytics 
} from '../services/search';
import type { PaginatedResponse } from '../types/api';
import type { Event } from '../types/event';

// Query keys for search-related queries
export const searchQueryKeys = {
  search: (query: string, filters?: AdvancedSearchFilters) => ['search', query, filters],
  suggestions: (query: string) => ['search', 'suggestions', query],
  history: ['search', 'history'],
  savedSearches: ['search', 'saved'],
  recommendations: ['search', 'recommendations'],
  analytics: ['search', 'analytics'],
  popularSearches: ['search', 'popular'],
  trendingCategories: ['search', 'trending'],
} as const;

// Advanced search hook with caching and debouncing
export function useAdvancedSearch(
  query: string,
  filters?: AdvancedSearchFilters,
  options?: UseQueryOptions<PaginatedResponse<Event>, Error> & {
    debounceMs?: number;
    enableSmartSearch?: boolean;
  }
) {
  const debouncedQuery = useDebounce(query, options?.debounceMs || 300);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: searchQueryKeys.search(debouncedQuery, filters),
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { results: [], count: 0, next: null, previous: null };
      }

      // Save to search history
      try {
        const result = options?.enableSmartSearch 
          ? await searchService.smartSearch(debouncedQuery, filters)
          : await searchService.search(debouncedQuery, filters);
        
        // Save successful search to history
        searchService.saveSearchToHistory(
          debouncedQuery, 
          filters, 
          'results' in result ? result.results.length : result.count
        );

        return 'results' in result ? result.results : result;
      } catch (error) {
        console.error('Search failed:', error);
        throw error;
      }
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Search suggestions hook with personalization
export function useSearchSuggestions(
  query: string,
  options?: UseQueryOptions<SearchSuggestion[], Error> & {
    debounceMs?: number;
    personalized?: boolean;
  }
) {
  const debouncedQuery = useDebounce(query, options?.debounceMs || 200);

  return useQuery({
    queryKey: searchQueryKeys.suggestions(debouncedQuery),
    queryFn: () => {
      if (options?.personalized) {
        return searchService.getPersonalizedSuggestions(debouncedQuery);
      }
      return searchService.getSuggestions(debouncedQuery);
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
}

// Search history hook
export function useSearchHistory(options?: UseQueryOptions<SearchHistory[], Error>) {
  return useQuery({
    queryKey: searchQueryKeys.history,
    queryFn: () => searchService.getSearchHistory(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Saved searches hook
export function useSavedSearches(options?: UseQueryOptions<SavedSearch[], Error>) {
  return useQuery({
    queryKey: searchQueryKeys.savedSearches,
    queryFn: () => searchService.getSavedSearches(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Search recommendations hook
export function useSearchRecommendations(options?: UseQueryOptions<SearchRecommendation[], Error>) {
  return useQuery({
    queryKey: searchQueryKeys.recommendations,
    queryFn: () => searchService.getRecommendations(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// Search analytics hook
export function useSearchAnalytics(options?: UseQueryOptions<SearchAnalytics, Error>) {
  return useQuery({
    queryKey: searchQueryKeys.analytics,
    queryFn: () => searchService.getSearchAnalytics(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Popular searches hook
export function usePopularSearches(limit?: number, options?: UseQueryOptions<string[], Error>) {
  return useQuery({
    queryKey: [...searchQueryKeys.popularSearches, limit],
    queryFn: () => searchService.getPopularSearches(limit),
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// Trending categories hook
export function useTrendingCategories(limit?: number, options?: UseQueryOptions<string[], Error>) {
  return useQuery({
    queryKey: [...searchQueryKeys.trendingCategories, limit],
    queryFn: () => searchService.getTrendingCategories(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Mutation hooks for search management
export function useSaveSearch(options?: UseMutationOptions<SavedSearch, Error, { name: string; query: string; filters?: AdvancedSearchFilters }>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, query, filters }) => searchService.saveSearch(name, query, filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchQueryKeys.savedSearches });
    },
    ...options,
  });
}

export function useDeleteSavedSearch(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => searchService.deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchQueryKeys.savedSearches });
    },
    ...options,
  });
}

export function useClearSearchHistory(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => searchService.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchQueryKeys.history });
    },
    ...options,
  });
}

export function useDeleteSearchHistoryItem(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => searchService.deleteSearchHistoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchQueryKeys.history });
    },
    ...options,
  });
}

// Composite hook for complete search functionality
export function useSearchInterface(initialQuery: string = '', initialFilters?: AdvancedSearchFilters) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters || {});
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Main search query
  const searchResults = useAdvancedSearch(query, filters, {
    enableSmartSearch: true,
  });

  // Search suggestions
  const suggestions = useSearchSuggestions(query, {
    personalized: true,
  });

  // Search history
  const { data: historyData } = useSearchHistory();

  // Popular searches for empty state
  const { data: popularSearches } = usePopularSearches(10);

  // Update local search history
  useEffect(() => {
    if (historyData) {
      setSearchHistory(historyData.map(h => h.query));
    }
  }, [historyData]);

  // Handlers
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setShowSuggestions(newQuery.length >= 2);
    setSelectedSuggestion(null);
  }, []);

  const handleFiltersChange = useCallback((newFilters: Partial<AdvancedSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setSelectedSuggestion(suggestion);
    setShowSuggestions(false);
  }, []);

  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      setQuery(finalQuery);
      setShowSuggestions(false);
      // Add to local history immediately for better UX
      setSearchHistory(prev => {
        const updated = [finalQuery, ...prev.filter(q => q !== finalQuery)];
        return updated.slice(0, 10); // Keep only last 10
      });
    }
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({});
    setSelectedSuggestion(null);
    setShowSuggestions(false);
  }, []);

  // Memoized values
  const isSearching = useMemo(() => searchResults.isLoading, [searchResults.isLoading]);
  const hasResults = useMemo(() => (searchResults.data?.results?.length || 0) > 0, [searchResults.data]);
  const totalResults = useMemo(() => searchResults.data?.count || 0, [searchResults.data]);

  return {
    // State
    query,
    filters,
    selectedSuggestion,
    showSuggestions,
    searchHistory,
    
    // Data
    searchResults: searchResults.data,
    suggestions: suggestions.data || [],
    popularSearches: popularSearches || [],
    
    // Status
    isSearching,
    hasResults,
    totalResults,
    isLoadingSuggestions: suggestions.isLoading,
    searchError: searchResults.error,
    
    // Handlers
    handleQueryChange,
    handleFiltersChange,
    handleSuggestionSelect,
    handleSearch,
    clearSearch,
    setShowSuggestions,
    
    // Utilities
    highlightSearchTerms: (text: string) => searchService.highlightSearchTerms(text, query),
  };
}

// Hook for nearby search with geolocation
export function useNearbySearch(radius: number = 25) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser');
    }
  }, []);

  const nearbySearch = useQuery({
    queryKey: ['search', 'nearby', location, radius],
    queryFn: () => {
      if (!location) throw new Error('Location not available');
      return searchService.searchNearby(location.latitude, location.longitude, radius);
    },
    enabled: !!location,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    location,
    locationError,
    nearbyEvents: nearbySearch.data,
    isLoading: nearbySearch.isLoading,
    error: nearbySearch.error,
  };
}