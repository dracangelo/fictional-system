import { apiClient } from '../api';
import type { PaginatedResponse } from '../../types/api';
import type { Event, EventFilters } from '../../types/event';

export interface SearchSuggestion {
  id: string;
  title: string;
  type: 'event' | 'movie' | 'venue' | 'category';
  category?: string;
  venue?: string;
  location?: string;
  relevance_score?: number;
  highlighted_text?: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  filters?: Partial<EventFilters>;
  timestamp: string;
  result_count: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: Partial<EventFilters>;
  created_at: string;
  notification_enabled: boolean;
}

export interface SearchRecommendation {
  id: string;
  title: string;
  type: 'event' | 'movie';
  reason: string;
  confidence_score: number;
  event?: Event;
}

export interface AdvancedSearchFilters extends EventFilters {
  // Enhanced search options
  radius?: number; // km from location
  sort_by?: 'relevance' | 'date' | 'price' | 'popularity' | 'rating';
  include_sold_out?: boolean;
  accessibility_features?: string[];
  age_rating?: string;
  language?: string;
  tags?: string[];
}

export interface SearchAnalytics {
  popular_searches: Array<{
    query: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  trending_categories: Array<{
    category: string;
    growth_rate: number;
  }>;
  user_preferences: {
    favorite_categories: string[];
    preferred_locations: string[];
    price_range: { min: number; max: number };
  };
}

class SearchService {
  private searchCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Advanced search with caching
  async search(
    query: string, 
    filters?: AdvancedSearchFilters,
    options?: { useCache?: boolean }
  ): Promise<PaginatedResponse<Event>> {
    const cacheKey = this.generateCacheKey(query, filters);
    
    // Check cache first
    if (options?.useCache !== false) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const params = new URLSearchParams();
    params.append('search', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const result = await apiClient.get<PaginatedResponse<Event>>(`/search/events/?${params.toString()}`);
    
    // Cache the result
    this.setCachedResult(cacheKey, result);
    
    return result;
  }

  // Get search suggestions with autocomplete
  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (query.length < 2) return [];

    const cacheKey = `suggestions:${query}:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const suggestions = await apiClient.get<SearchSuggestion[]>(`/search/suggestions/?${params.toString()}`);
    
    // Cache suggestions for shorter duration
    this.setCachedResult(cacheKey, suggestions, 2 * 60 * 1000); // 2 minutes
    
    return suggestions;
  }

  // Search history management
  async getSearchHistory(limit: number = 20): Promise<SearchHistory[]> {
    return apiClient.get<SearchHistory[]>(`/search/history/?limit=${limit}`);
  }

  async saveSearchToHistory(query: string, filters?: Partial<EventFilters>, resultCount?: number): Promise<void> {
    await apiClient.post('/search/history/', {
      query,
      filters,
      result_count: resultCount,
    });
  }

  async clearSearchHistory(): Promise<void> {
    await apiClient.delete('/search/history/');
  }

  async deleteSearchHistoryItem(id: string): Promise<void> {
    await apiClient.delete(`/search/history/${id}/`);
  }

  // Saved searches management
  async getSavedSearches(): Promise<SavedSearch[]> {
    return apiClient.get<SavedSearch[]>('/search/saved/');
  }

  async saveSearch(name: string, query: string, filters?: Partial<EventFilters>): Promise<SavedSearch> {
    return apiClient.post<SavedSearch>('/search/saved/', {
      name,
      query,
      filters,
    });
  }

  async updateSavedSearch(id: string, data: Partial<SavedSearch>): Promise<SavedSearch> {
    return apiClient.patch<SavedSearch>(`/search/saved/${id}/`, data);
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await apiClient.delete(`/search/saved/${id}/`);
  }

  // Personalized recommendations
  async getRecommendations(limit: number = 10): Promise<SearchRecommendation[]> {
    return apiClient.get<SearchRecommendation[]>(`/search/recommendations/?limit=${limit}`);
  }

  async getRecommendationsForUser(userId: string, limit: number = 10): Promise<SearchRecommendation[]> {
    return apiClient.get<SearchRecommendation[]>(`/search/recommendations/user/${userId}/?limit=${limit}`);
  }

  // Search analytics and insights
  async getSearchAnalytics(): Promise<SearchAnalytics> {
    return apiClient.get<SearchAnalytics>('/search/analytics/');
  }

  async getPopularSearches(limit: number = 10): Promise<string[]> {
    const analytics = await this.getSearchAnalytics();
    return analytics.popular_searches.slice(0, limit).map(s => s.query);
  }

  async getTrendingCategories(limit: number = 5): Promise<string[]> {
    const analytics = await this.getSearchAnalytics();
    return analytics.trending_categories
      .sort((a, b) => b.growth_rate - a.growth_rate)
      .slice(0, limit)
      .map(c => c.category);
  }

  // Location-based search
  async searchNearby(
    latitude: number, 
    longitude: number, 
    radius: number = 25,
    filters?: Omit<AdvancedSearchFilters, 'location' | 'radius'>
  ): Promise<PaginatedResponse<Event>> {
    return this.search('', {
      ...filters,
      location: `${latitude},${longitude}`,
      radius,
    });
  }

  // Smart search with typo correction and fuzzy matching
  async smartSearch(query: string, filters?: AdvancedSearchFilters): Promise<{
    results: PaginatedResponse<Event>;
    corrected_query?: string;
    suggestions?: string[];
  }> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('smart', 'true');
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return apiClient.get(`/search/smart/?${params.toString()}`);
  }

  // Utility methods
  private generateCacheKey(query: string, filters?: AdvancedSearchFilters): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `search:${query}:${filterStr}`;
  }

  private getCachedResult(key: string): any | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.searchCache.delete(key);
    return null;
  }

  private setCachedResult(key: string, data: any, duration?: number): void {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  // Clear all cached results
  clearCache(): void {
    this.searchCache.clear();
  }

  // Highlight search terms in text
  highlightSearchTerms(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const terms = query.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  }

  // Get search suggestions based on user history and popular searches
  async getPersonalizedSuggestions(query: string): Promise<SearchSuggestion[]> {
    const [suggestions, history, popular] = await Promise.all([
      this.getSuggestions(query, 5),
      this.getSearchHistory(10),
      this.getPopularSearches(5),
    ]);

    // Combine and rank suggestions
    const combined: SearchSuggestion[] = [
      ...suggestions,
      ...history
        .filter(h => h.query.toLowerCase().includes(query.toLowerCase()))
        .map(h => ({
          id: `history-${h.id}`,
          title: h.query,
          type: 'event' as const,
          relevance_score: 0.8,
        })),
      ...popular
        .filter(p => p.toLowerCase().includes(query.toLowerCase()))
        .map((p, index) => ({
          id: `popular-${index}`,
          title: p,
          type: 'event' as const,
          relevance_score: 0.6,
        })),
    ];

    // Remove duplicates and sort by relevance
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(t => t.title.toLowerCase() === item.title.toLowerCase())
    );

    return unique
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 10);
  }
}

export const searchService = new SearchService();