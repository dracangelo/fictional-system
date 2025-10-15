import { searchService } from '../searchService';
import { apiClient } from '../../api';

// Mock the API client
jest.mock('../../api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchService.clearCache();
  });

  describe('search', () => {
    it('should perform basic search', async () => {
      const mockResults = {
        results: [{ id: '1', title: 'Test Event' }],
        count: 1,
        next: null,
        previous: null,
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResults);

      const result = await searchService.search('test query');

      expect(apiClient.get).toHaveBeenCalledWith('/search/events/?search=test%20query');
      expect(result).toEqual(mockResults);
    });

    it('should include filters in search', async () => {
      const filters = {
        category: 'music',
        location: 'new york',
        price_min: 10,
        price_max: 100,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ results: [], count: 0 });

      await searchService.search('test', filters);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('category=music')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('location=new%20york')
      );
    });

    it('should handle array filters', async () => {
      const filters = {
        tags: ['music', 'outdoor'],
        accessibility_features: ['wheelchair', 'hearing'],
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ results: [], count: 0 });

      await searchService.search('test', filters);

      const callUrl = (apiClient.get as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('tags=music');
      expect(callUrl).toContain('tags=outdoor');
    });

    it('should use cache when enabled', async () => {
      const mockResults = { results: [], count: 0 };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResults);

      // First call
      await searchService.search('test', {}, { useCache: true });
      
      // Second call should use cache
      await searchService.search('test', {}, { useCache: true });

      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when disabled', async () => {
      const mockResults = { results: [], count: 0 };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResults);

      // First call
      await searchService.search('test', {}, { useCache: false });
      
      // Second call should not use cache
      await searchService.search('test', {}, { useCache: false });

      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for short queries', async () => {
      const result = await searchService.getSuggestions('a');
      expect(result).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch suggestions for valid queries', async () => {
      const mockSuggestions = [
        { id: '1', title: 'Test Event', type: 'event' },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(mockSuggestions);

      const result = await searchService.getSuggestions('test');

      expect(apiClient.get).toHaveBeenCalledWith('/search/suggestions/?q=test&limit=10');
      expect(result).toEqual(mockSuggestions);
    });

    it('should respect limit parameter', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue([]);

      await searchService.getSuggestions('test', 5);

      expect(apiClient.get).toHaveBeenCalledWith('/search/suggestions/?q=test&limit=5');
    });

    it('should cache suggestions', async () => {
      const mockSuggestions = [{ id: '1', title: 'Test', type: 'event' }];
      (apiClient.get as jest.Mock).mockResolvedValue(mockSuggestions);

      // First call
      await searchService.getSuggestions('test');
      
      // Second call should use cache
      await searchService.getSuggestions('test');

      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchHistory', () => {
    it('should get search history', async () => {
      const mockHistory = [
        { id: '1', query: 'test', timestamp: '2023-01-01', result_count: 5 },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(mockHistory);

      const result = await searchService.getSearchHistory();

      expect(apiClient.get).toHaveBeenCalledWith('/search/history/?limit=20');
      expect(result).toEqual(mockHistory);
    });

    it('should save search to history', async () => {
      await searchService.saveSearchToHistory('test query', { category: 'music' }, 5);

      expect(apiClient.post).toHaveBeenCalledWith('/search/history/', {
        query: 'test query',
        filters: { category: 'music' },
        result_count: 5,
      });
    });

    it('should clear search history', async () => {
      await searchService.clearSearchHistory();

      expect(apiClient.delete).toHaveBeenCalledWith('/search/history/');
    });

    it('should delete specific history item', async () => {
      await searchService.deleteSearchHistoryItem('123');

      expect(apiClient.delete).toHaveBeenCalledWith('/search/history/123/');
    });
  });

  describe('savedSearches', () => {
    it('should get saved searches', async () => {
      const mockSavedSearches = [
        { 
          id: '1', 
          name: 'My Search', 
          query: 'test', 
          created_at: '2023-01-01',
          notification_enabled: false 
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(mockSavedSearches);

      const result = await searchService.getSavedSearches();

      expect(apiClient.get).toHaveBeenCalledWith('/search/saved/');
      expect(result).toEqual(mockSavedSearches);
    });

    it('should save a search', async () => {
      const mockSavedSearch = {
        id: '1',
        name: 'My Search',
        query: 'test',
        filters: { category: 'music' },
        created_at: '2023-01-01',
        notification_enabled: false,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockSavedSearch);

      const result = await searchService.saveSearch('My Search', 'test', { category: 'music' });

      expect(apiClient.post).toHaveBeenCalledWith('/search/saved/', {
        name: 'My Search',
        query: 'test',
        filters: { category: 'music' },
      });
      expect(result).toEqual(mockSavedSearch);
    });

    it('should delete saved search', async () => {
      await searchService.deleteSavedSearch('123');

      expect(apiClient.delete).toHaveBeenCalledWith('/search/saved/123/');
    });
  });

  describe('recommendations', () => {
    it('should get recommendations', async () => {
      const mockRecommendations = [
        {
          id: '1',
          title: 'Recommended Event',
          type: 'event',
          reason: 'Based on your booking history',
          confidence_score: 85,
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue(mockRecommendations);

      const result = await searchService.getRecommendations();

      expect(apiClient.get).toHaveBeenCalledWith('/search/recommendations/?limit=10');
      expect(result).toEqual(mockRecommendations);
    });

    it('should get user-specific recommendations', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue([]);

      await searchService.getRecommendationsForUser('user123', 5);

      expect(apiClient.get).toHaveBeenCalledWith('/search/recommendations/user/user123/?limit=5');
    });
  });

  describe('analytics', () => {
    it('should get search analytics', async () => {
      const mockAnalytics = {
        popular_searches: [{ query: 'concert', count: 100, trend: 'up' }],
        trending_categories: [{ category: 'music', growth_rate: 15 }],
        user_preferences: {
          favorite_categories: ['music', 'sports'],
          preferred_locations: ['new york', 'los angeles'],
          price_range: { min: 10, max: 100 },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await searchService.getSearchAnalytics();

      expect(apiClient.get).toHaveBeenCalledWith('/search/analytics/');
      expect(result).toEqual(mockAnalytics);
    });

    it('should get popular searches', async () => {
      const mockAnalytics = {
        popular_searches: [
          { query: 'concert', count: 100, trend: 'up' },
          { query: 'theater', count: 80, trend: 'stable' },
        ],
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await searchService.getPopularSearches(5);

      expect(result).toEqual(['concert', 'theater']);
    });
  });

  describe('smartSearch', () => {
    it('should perform smart search with typo correction', async () => {
      const mockResult = {
        results: { results: [], count: 0 },
        corrected_query: 'concert',
        suggestions: ['concerts', 'comedy'],
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResult);

      const result = await searchService.smartSearch('concrt');

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('q=concrt&smart=true')
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('utility methods', () => {
    it('should highlight search terms', () => {
      const text = 'This is a test event';
      const query = 'test';

      const result = searchService.highlightSearchTerms(text, query);

      expect(result).toBe('This is a <mark>test</mark> event');
    });

    it('should handle multiple search terms', () => {
      const text = 'This is a test event for testing';
      const query = 'test event';

      const result = searchService.highlightSearchTerms(text, query);

      expect(result).toContain('<mark>test</mark>');
      expect(result).toContain('<mark>event</mark>');
    });

    it('should handle empty query', () => {
      const text = 'This is a test';
      const query = '';

      const result = searchService.highlightSearchTerms(text, query);

      expect(result).toBe(text);
    });

    it('should clear cache', () => {
      // Add something to cache first
      searchService['setCachedResult']('test-key', { data: 'test' });
      
      searchService.clearCache();
      
      const cached = searchService['getCachedResult']('test-key');
      expect(cached).toBeNull();
    });
  });

  describe('nearby search', () => {
    it('should search for nearby events', async () => {
      const mockResults = { results: [], count: 0 };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResults);

      await searchService.searchNearby(40.7128, -74.0060, 10);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('location=40.7128%2C-74.006&radius=10')
      );
    });
  });
});