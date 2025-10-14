import React from 'react';
import { Button } from '../ui';

const popularSearches = [
  'Concerts',
  'Comedy Shows',
  'Action Movies',
  'Theater',
  'Sports Events',
  'Art Exhibitions'
];

const quickFilters = [
  { label: 'This Weekend', value: 'weekend' },
  { label: 'Free Events', value: 'free' },
  { label: 'Near Me', value: 'nearby' },
  { label: 'Family Friendly', value: 'family' },
];

export const SearchSection: React.FC = () => {
  const handleQuickFilter = (filterValue: string) => {
    console.log('Quick filter selected:', filterValue);
    // Navigate to filtered results
  };

  const handlePopularSearch = (searchTerm: string) => {
    console.log('Popular search selected:', searchTerm);
    // Navigate to search results
  };

  return (
    <section className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Quick Filters */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Quick Filters
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {quickFilters.map((filter) => (
              <Button
                key={filter.value}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.value)}
                className="border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Popular Searches */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Popular Searches
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((search) => (
              <button
                key={search}
                onClick={() => handlePopularSearch(search)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};