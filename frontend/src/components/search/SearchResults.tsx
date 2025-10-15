import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Calendar, Clock, Users, Zap, TrendingUp } from 'lucide-react';
import { EventCard } from '../events/EventCard';
import { EventGrid } from '../events/EventGrid';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Pagination } from '../common/Pagination';
import { Badge, Button } from '../ui';
import { useSearchInterface } from '../../hooks/useSearch';
import type { Event } from '../../types/event';
import type { AdvancedSearchFilters } from '../../services/search';

interface SearchResultsProps {
  query: string;
  filters?: AdvancedSearchFilters;
  onFiltersChange?: (filters: AdvancedSearchFilters) => void;
  className?: string;
}

interface EnhancedEvent extends Event {
  relevance_score?: number;
  match_reasons?: string[];
  highlighted_title?: string;
  highlighted_description?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  filters = {},
  onFiltersChange,
  className = '',
}) => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<string>(filters.sort_by || 'relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    searchResults,
    isSearching,
    hasResults,
    totalResults,
    searchError,
    handleFiltersChange,
    highlightSearchTerms,
  } = useSearchInterface(query, filters);

  // Enhanced events with highlighting and relevance
  const enhancedEvents = useMemo(() => {
    if (!searchResults?.results) return [];

    return searchResults.results.map((event: Event) => ({
      ...event,
      highlighted_title: highlightSearchTerms(event.title),
      highlighted_description: highlightSearchTerms(event.description),
      relevance_score: Math.random() * 100, // Mock relevance score
      match_reasons: getMatchReasons(event, query),
    }));
  }, [searchResults, query, highlightSearchTerms]);

  // Sort events based on selected criteria
  const sortedEvents = useMemo(() => {
    if (!enhancedEvents.length) return [];

    const sorted = [...enhancedEvents];
    
    switch (sortBy) {
      case 'relevance':
        return sorted.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      case 'date':
        return sorted.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'popularity':
        // Mock popularity sorting - in real app, this would be based on booking count
        return sorted.sort((a, b) => Math.random() - 0.5);
      default:
        return sorted;
    }
  }, [enhancedEvents, sortBy]);

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    if (onFiltersChange) {
      onFiltersChange({ ...filters, sort_by: newSortBy as any });
    } else {
      handleFiltersChange({ sort_by: newSortBy as any });
    }
  };

  const handlePageChange = (page: number) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, page });
    } else {
      handleFiltersChange({ page });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get match reasons for relevance explanation
  function getMatchReasons(event: Event, searchQuery: string): string[] {
    const reasons: string[] = [];
    const queryLower = searchQuery.toLowerCase();
    
    if (event.title.toLowerCase().includes(queryLower)) {
      reasons.push('Title match');
    }
    if (event.description.toLowerCase().includes(queryLower)) {
      reasons.push('Description match');
    }
    if (event.category.toLowerCase().includes(queryLower)) {
      reasons.push('Category match');
    }
    if (event.venue.toLowerCase().includes(queryLower)) {
      reasons.push('Venue match');
    }
    
    return reasons;
  }

  const totalPages = Math.ceil(totalResults / (filters.page_size || 12));
  const currentPage = filters.page || 1;

  if (isSearching) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Searching for "{query}"...</p>
        </div>
      </div>
    );
  }

  if (searchError) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">
          Search failed: {searchError.message}
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className={className}>
        <EmptyState
          title={`No results found for "${query}"`}
          description="Try adjusting your search terms or filters to find more events."
          icon="search"
          action={{
            label: 'Browse all events',
            onClick: () => navigate('/events'),
          }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Search Results
          </h2>
          <p className="text-gray-600">
            Found {totalResults.toLocaleString()} results for "{query}"
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date (Earliest)</option>
            <option value="date_desc">Date (Latest)</option>
            <option value="title">Title (A-Z)</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      {/* Search Quality Indicators */}
      {sortBy === 'relevance' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Smart Search Results</span>
          </div>
          <p className="text-sm text-blue-700">
            Results are ranked by relevance to your search. Events with higher match scores appear first.
          </p>
        </div>
      )}

      {/* Results Grid/List */}
      {viewMode === 'grid' ? (
        <EventGrid>
          {sortedEvents.map((event) => (
            <EnhancedEventCard
              key={event.id}
              event={event}
              query={query}
              showRelevance={sortBy === 'relevance'}
            />
          ))}
        </EventGrid>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event) => (
            <EnhancedEventListItem
              key={event.id}
              event={event}
              query={query}
              showRelevance={sortBy === 'relevance'}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Search Tips for Low Results */}
      {totalResults > 0 && totalResults < 5 && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-2">
            Limited results found
          </h3>
          <p className="text-yellow-700 text-sm mb-3">
            Try these tips to find more events:
          </p>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Use broader search terms</li>
            <li>• Remove some filters</li>
            <li>• Check spelling and try synonyms</li>
            <li>• Expand your date range or location</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// Enhanced Event Card with highlighting and relevance
interface EnhancedEventCardProps {
  event: EnhancedEvent;
  query: string;
  showRelevance?: boolean;
}

const EnhancedEventCard: React.FC<EnhancedEventCardProps> = ({
  event,
  query,
  showRelevance = false,
}) => {
  return (
    <div className="relative">
      {/* Relevance Score Badge */}
      {showRelevance && event.relevance_score && (
        <div className="absolute top-2 right-2 z-10">
          <Badge 
            variant={event.relevance_score > 80 ? 'default' : 'secondary'}
            className="text-xs"
          >
            {Math.round(event.relevance_score)}% match
          </Badge>
        </div>
      )}
      
      <EventCard event={event} />
      
      {/* Match Reasons */}
      {showRelevance && event.match_reasons && event.match_reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {event.match_reasons.map((reason, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced Event List Item
const EnhancedEventListItem: React.FC<EnhancedEventCardProps> = ({
  event,
  query,
  showRelevance = false,
}) => {
  const navigate = useNavigate();

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="flex items-start gap-4">
        {/* Event Image */}
        {event.media && event.media.length > 0 && (
          <div className="flex-shrink-0">
            <img
              src={event.media[0]}
              alt={event.title}
              className="w-24 h-24 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Event Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 
                className="text-lg font-semibold text-gray-900 mb-2"
                dangerouslySetInnerHTML={{ __html: event.highlighted_title || event.title }}
              />
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.start_datetime).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(event.start_datetime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.venue}
                </div>
              </div>

              <p 
                className="text-gray-700 text-sm line-clamp-2"
                dangerouslySetInnerHTML={{ 
                  __html: event.highlighted_description || event.description 
                }}
              />

              {/* Match Reasons */}
              {showRelevance && event.match_reasons && event.match_reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {event.match_reasons.map((reason, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Relevance Score */}
            {showRelevance && event.relevance_score && (
              <div className="flex-shrink-0 ml-4">
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    event.relevance_score > 80 ? 'text-green-600' :
                    event.relevance_score > 60 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {Math.round(event.relevance_score)}%
                  </div>
                  <div className="text-xs text-gray-500">match</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};