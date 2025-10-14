import React, { useState, useEffect, useRef } from 'react';
import { Input, Button } from '../ui';
import { useDebounce } from '../../hooks/useDebounce';
// import { eventService } from '../../services';
// import type { Event } from '../../types';

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'event' | 'movie' | 'venue';
  category?: string;
  venue?: string;
}

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual service call
      const mockSuggestions: SearchSuggestion[] = [
        { id: '1', title: 'Concert in Central Park', type: 'event' as const, category: 'Music', venue: 'Central Park' },
        { id: '2', title: 'The Dark Knight', type: 'movie' as const, category: 'Action' },
        { id: '3', title: 'Madison Square Garden', type: 'venue' as const },
        { id: '4', title: 'Comedy Night Live', type: 'event' as const, category: 'Comedy', venue: 'Comedy Club' },
        { id: '5', title: 'Inception', type: 'movie' as const, category: 'Sci-Fi' },
      ].filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Navigate to appropriate page based on suggestion type
    console.log('Selected suggestion:', suggestion);
  };

  const handleSearch = () => {
    if (query.trim()) {
      setShowSuggestions(false);
      // Navigate to search results page
      console.log('Searching for:', query);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'event':
        return '🎭';
      case 'movie':
        return '🎬';
      case 'venue':
        return '📍';
      default:
        return '🔍';
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search for events, movies, or venues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 rounded-none focus:ring-0 text-gray-900 placeholder-gray-500 text-lg py-4 px-6"
          />
          
          {isLoading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2" role="status" aria-label="Loading">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        
        <Button
          onClick={handleSearch}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 rounded-none"
          disabled={!query.trim()}
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`px-6 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'hover:bg-gray-50 text-gray-900'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getSuggestionIcon(suggestion.type)}</span>
                <div className="flex-1">
                  <div className="font-medium">{suggestion.title}</div>
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

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !isLoading && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50">
          <div className="px-6 py-4 text-gray-500 text-center">
            No results found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};