import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Container } from '../../components/layout/Container';
import { FilterPanel } from '../../components/events/FilterPanel';
import { EventGrid } from '../../components/events/EventGrid';
import { EventCard } from '../../components/events/EventCard';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useEvents } from '../../hooks/useQuery';
import { useDebounce } from '../../hooks/useDebounce';
import { Search, ArrowLeft, Filter } from 'lucide-react';
import type { EventFilters } from '../../types/event';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<EventFilters>({
    search: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    page_size: 12,
  });

  const debouncedFilters = useDebounce(filters, 300);
  
  const {
    data: eventsResponse,
    isLoading,
    isError,
    error,
  } = useEvents(debouncedFilters);

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

  const handleFilterChange = (newFilters: Partial<EventFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToEvents = () => {
    navigate('/events');
  };

  const events = eventsResponse?.results || [];
  const totalCount = eventsResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / (filters.page_size || 12));
  const searchQuery = filters.search || '';

  return (
    <MainLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToEvents}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Events
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'Search Events'}
          </h1>
          
          <p className="text-gray-600">
            {isLoading ? (
              'Searching...'
            ) : (
              `Found ${totalCount} events${searchQuery ? ` matching "${searchQuery}"` : ''}`
            )}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search events, venues, or categories..."
                value={searchQuery}
                onChange={handleSearchChange}
                leftIcon={<Search className="h-4 w-4" />}
                size="lg"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
              className="lg:hidden"
            >
              Filters
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <aside className={`lg:w-1/4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-4">
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                totalResults={totalCount}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:w-3/4">
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-600">
                {isLoading ? (
                  'Loading...'
                ) : (
                  `Showing ${events.length} of ${totalCount} results`
                )}
              </div>
              
              {/* Sort Options */}
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={filters.ordering || ''}
                onChange={(e) => handleFilterChange({ ordering: e.target.value })}
              >
                <option value="">Relevance</option>
                <option value="start_datetime">Date (Earliest)</option>
                <option value="-start_datetime">Date (Latest)</option>
                <option value="title">Title (A-Z)</option>
                <option value="-title">Title (Z-A)</option>
                <option value="created_at">Recently Added</option>
              </select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  Failed to search events: {error?.message}
                </div>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && events.length === 0 && (
              <EmptyState
                title={searchQuery ? `No results for "${searchQuery}"` : 'No events found'}
                description={
                  searchQuery
                    ? 'Try adjusting your search terms or filters to find more events.'
                    : 'Try searching for events, venues, or categories.'
                }
                icon="search"
                action={{
                  label: searchQuery ? 'Clear search' : 'Browse all events',
                  onClick: () => {
                    if (searchQuery) {
                      setFilters(prev => ({ ...prev, search: '', page: 1 }));
                    } else {
                      navigate('/events');
                    }
                  },
                }}
              />
            )}

            {/* Search Results */}
            {!isLoading && !isError && events.length > 0 && (
              <>
                {/* Search suggestions for low results */}
                {totalCount > 0 && totalCount < 5 && searchQuery && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Limited results found
                    </h3>
                    <p className="text-blue-700 text-sm mb-3">
                      Try broadening your search or removing some filters for more results.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFilters(prev => ({ ...prev, search: '', page: 1 }))}
                      >
                        Clear search
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/events')}
                      >
                        Browse all events
                      </Button>
                    </div>
                  </div>
                )}

                <EventGrid>
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </EventGrid>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={filters.page || 1}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </Container>
    </MainLayout>
  );
};

export default SearchResultsPage;