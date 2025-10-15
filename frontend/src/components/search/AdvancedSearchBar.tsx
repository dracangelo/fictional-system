import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Star, MapPin, Tag, X, Filter, Bookmark } from 'lucide-react';
import { Input, Button, Badge } from '../ui';
import { useSearchInterface, useSaveSearch } from '../../hooks/useSearch';
import type { SearchSuggestion, AdvancedSearchFilters } from '../../services/search';

interface AdvancedSearchBarProps {
  initialQuery?: string;
  initialFilters?: AdvancedSearchFilters;
  placeholder?: string;
  showFilters?: boolean;
  onSearch?: (query: string, filters?: AdvancedSearchFilters) => void;
  className?: string;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  initialQuery = '',
  initialFilters = {},
  placeholder = 'Search for events, movies, venues...',
  showFilters = true,
  onSearch,
  className = '',
}) => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  const {
    query,
    filters,
    suggestions,
    searchHistory,
    popularSearches,
    showSuggestions,
    isLoadingSuggestions,
    handleQueryChange,
    handleFiltersChange,
    handleSuggestionSelect,
    handleSearch,
    clearSearch,
    setShowSuggestions,
    highlightSearchTerms,
  } = useSearchInterface(initialQuery, initialFilters);

  const saveSearchMutation = useSaveSearch();

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSuggestions]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allSuggestions = [
      ...suggestions,
      ...searchHistory.slice(0, 3).map((h, i) => ({
        id: `history-${i}`,
        title: h,
        type: 'event' as const,
      })),
      ...popularSearches.slice(0, 3).map((p, i) => ({
        id: `popular-${i}`,
        title: p,
        type: 'event' as const,
      })),
    ];

    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
          handleSuggestionClick(allSuggestions[selectedIndex]);
        } else {
          handleSearchSubmit();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    handleSuggestionSelect(suggestion);
    handleSearchSubmit(suggestion.title);
  };

  const handleSearchSubmit = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      handleSearch(finalQuery);
      
      if (onSearch) {
        onSearch(finalQuery, filters);
      } else {
        // Navigate to search results page
        const params = new URLSearchParams();
        params.set('q', finalQuery);
        
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.set(key, value.toString());
            }
          }
        });

        navigate(`/search?${params.toString()}`);
      }
    }
  };

  const handleSaveSearch = async () => {
    if (saveSearchName.trim() && query.trim()) {
      try {
        await saveSearchMutation.mutateAsync({
          name: saveSearchName.trim(),
          query,
          filters,
        });
        setShowSaveDialog(false);
        setSaveSearchName('');
      } catch (error) {
        console.error('Failed to save search:', error);
      }
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Tag className="h-4 w-4 text-blue-500" />;
      case 'movie':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'venue':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'category':
        return <Filter className="h-4 w-4 text-purple-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== '' && 
    (!Array.isArray(value) || value.length > 0)
  );

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== '' && 
    (!Array.isArray(value) || value.length > 0)
  ).length;

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      {/* Main Search Input */}
      <div className="flex bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            className="border-0 rounded-none focus:ring-0 text-gray-900 placeholder-gray-500 pl-12 pr-12 py-4 text-lg"
          />
          
          {/* Clear button */}
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          {/* Loading indicator */}
          {isLoadingSuggestions && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Filter indicator */}
        {showFilters && hasActiveFilters && (
          <div className="flex items-center px-3 bg-blue-50 border-l border-blue-200">
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Search button */}
        <Button
          onClick={() => handleSearchSubmit()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 rounded-none"
          disabled={!query.trim()}
        >
          Search
        </Button>

        {/* Save search button */}
        {query.trim() && (
          <Button
            onClick={() => setShowSaveDialog(true)}
            variant="ghost"
            size="sm"
            className="px-3"
            title="Save this search"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'hover:bg-gray-50 text-gray-900'
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center space-x-3">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1">
                      <div 
                        className="font-medium"
                        dangerouslySetInnerHTML={{ 
                          __html: suggestion.highlighted_text || highlightSearchTerms(suggestion.title) 
                        }}
                      />
                      {suggestion.venue && (
                        <div className="text-sm text-gray-500">{suggestion.venue}</div>
                      )}
                      {suggestion.category && (
                        <div className="text-xs text-blue-600 font-medium">{suggestion.category}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{suggestion.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Recent Searches
              </div>
              {searchHistory.slice(0, 3).map((historyItem, index) => {
                const adjustedIndex = suggestions.length + index;
                return (
                  <div
                    key={`history-${index}`}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                      adjustedIndex === selectedIndex 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                    onClick={() => handleSuggestionClick({ id: `history-${index}`, title: historyItem, type: 'event' })}
                  >
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 font-medium">{historyItem}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && query.length < 2 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Popular Searches
              </div>
              {popularSearches.slice(0, 3).map((popularItem, index) => {
                const adjustedIndex = suggestions.length + searchHistory.length + index;
                return (
                  <div
                    key={`popular-${index}`}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                      adjustedIndex === selectedIndex 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                    onClick={() => handleSuggestionClick({ id: `popular-${index}`, title: popularItem, type: 'event' })}
                  >
                    <div className="flex items-center space-x-3">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <div className="flex-1 font-medium">{popularItem}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No results message */}
          {suggestions.length === 0 && !isLoadingSuggestions && query.trim().length >= 2 && (
            <div className="px-4 py-6 text-gray-500 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div>No suggestions found for "{query}"</div>
              <div className="text-sm mt-1">Try a different search term</div>
            </div>
          )}
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name
              </label>
              <Input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Enter a name for this search"
                className="w-full"
              />
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">
                <strong>Query:</strong> {query}
              </div>
              {hasActiveFilters && (
                <div className="text-sm text-gray-600 mt-1">
                  <strong>Filters:</strong> {activeFilterCount} active
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveSearchName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim() || saveSearchMutation.isPending}
              >
                {saveSearchMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};