import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Container } from '../../components/layout/Container';
import { FilterPanel } from '../../components/events/FilterPanel';
import { AdvancedSearchBar, SearchResults, SearchHistory, SearchRecommendations } from '../../components/search';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Filter, History, Sparkles } from 'lucide-react';
import type { AdvancedSearchFilters } from '../../services/search';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    search: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    page_size: 12,
    sort_by: (searchParams.get('sort_by') as any) || 'relevance',
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Use 'q' for search parameter to match common search URL patterns
        const paramKey = key === 'search' ? 'q' : key;
        params.set(paramKey, value.toString());
      }
    });

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleFiltersChange = (newFilters: Partial<AdvancedSearchFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSearch = (query: string, searchFilters?: AdvancedSearchFilters) => {
    const updatedFilters = {
      ...filters,
      ...searchFilters,
      search: query,
      page: 1,
    };
    setFilters(updatedFilters);
  };

  const handleBackToEvents = () => {
    navigate('/events');
  };

  const searchQuery = filters.search || '';
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <MainLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToEvents}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Events
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                leftIcon={<History className="h-4 w-4" />}
              >
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecommendations(!showRecommendations)}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Recommendations
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {hasQuery ? `Search Results` : 'Search Events'}
          </h1>
          
          {hasQuery && (
            <p className="text-gray-600">
              Searching for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Advanced Search Bar */}
        <div className="mb-6">
          <AdvancedSearchBar
            initialQuery={searchQuery}
            initialFilters={filters}
            onSearch={handleSearch}
            showFilters={true}
            className="w-full"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-1/4 space-y-6">
            {/* Filter Panel */}
            <div className={`${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="sticky top-4">
                <FilterPanel
                  filters={filters}
                  onChange={handleFiltersChange}
                  totalResults={0} // Will be updated by SearchResults component
                />
              </div>
            </div>

            {/* Search History */}
            {showHistory && (
              <div className="lg:hidden">
                <SearchHistory
                  onSearchSelect={(query, searchFilters) => handleSearch(query, searchFilters)}
                />
              </div>
            )}

            {/* Recommendations */}
            {showRecommendations && (
              <div className="lg:hidden">
                <SearchRecommendations
                  onSearchSelect={(query) => handleSearch(query)}
                  onCategorySelect={(category) => handleFiltersChange({ category })}
                />
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="lg:w-3/4">
            {hasQuery ? (
              <SearchResults
                query={searchQuery}
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            ) : (
              <div className="space-y-8">
                {/* Welcome Message */}
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Discover Amazing Events
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Use the search bar above to find events, movies, and venues that interest you.
                  </p>
                </div>

                {/* Search Recommendations */}
                <SearchRecommendations
                  onSearchSelect={(query) => handleSearch(query)}
                  onCategorySelect={(category) => handleFiltersChange({ category })}
                />
              </div>
            )}
          </main>
        </div>

        {/* Desktop Sidebar Components */}
        <div className="hidden lg:block fixed right-4 top-1/2 transform -translate-y-1/2 w-80 space-y-4 z-40">
          {showHistory && (
            <SearchHistory
              onSearchSelect={(query, searchFilters) => handleSearch(query, searchFilters)}
              className="max-h-96 overflow-y-auto"
            />
          )}
        </div>
      </Container>
    </MainLayout>
  );
};

export default SearchResultsPage;