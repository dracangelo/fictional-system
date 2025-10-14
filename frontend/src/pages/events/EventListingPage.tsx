import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Container } from '../../components/layout/Container';
import { FilterPanel } from '../../components/events/FilterPanel';
import { EventGrid } from '../../components/events/EventGrid';
import { EventCard } from '../../components/events/EventCard';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useEvents } from '../../hooks/useQuery';
import { useDebounce } from '../../hooks/useDebounce';
import type { EventFilters } from '../../types/event';

export const EventListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<EventFilters>({
    search: searchParams.get('search') || '',
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
        params.set(key, value.toString());
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

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const events = eventsResponse?.results || [];
  const totalCount = eventsResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / (filters.page_size || 12));

  return (
    <MainLayout>
      <Container className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Events & Movies
          </h1>
          <p className="text-gray-600">
            Find the perfect entertainment experience in your area
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <aside className="lg:w-1/4">
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
                <option value="">Sort by</option>
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
                  Failed to load events: {error?.message}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && events.length === 0 && (
              <EmptyState
                title="No events found"
                description="Try adjusting your filters or search terms to find more events."
                action={{
                  label: 'Clear filters',
                  onClick: () => setFilters({
                    search: '',
                    category: '',
                    location: '',
                    date_from: '',
                    date_to: '',
                    price_min: undefined,
                    price_max: undefined,
                    page: 1,
                    page_size: 12,
                  }),
                }}
              />
            )}

            {/* Events Grid */}
            {!isLoading && !isError && events.length > 0 && (
              <>
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

export default EventListingPage;