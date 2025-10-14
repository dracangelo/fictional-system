import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Calendar, MapPin, DollarSign, Filter, X } from 'lucide-react';
import type { EventFilters } from '../../types/event';

interface FilterPanelProps {
  filters: EventFilters;
  onChange: (filters: Partial<EventFilters>) => void;
  totalResults?: number;
}

const eventCategories = [
  { value: '', label: 'All Categories' },
  { value: 'concert', label: 'Concerts' },
  { value: 'theater', label: 'Theater' },
  { value: 'sports', label: 'Sports' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'conference', label: 'Conferences' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'festival', label: 'Festivals' },
  { value: 'movie', label: 'Movies' },
];

const popularLocations = [
  { value: '', label: 'All Locations' },
  { value: 'downtown', label: 'Downtown' },
  { value: 'midtown', label: 'Midtown' },
  { value: 'uptown', label: 'Uptown' },
  { value: 'suburbs', label: 'Suburbs' },
  { value: 'waterfront', label: 'Waterfront' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  totalResults = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [priceRange, setPriceRange] = useState({
    min: filters.price_min?.toString() || '',
    max: filters.price_max?.toString() || '',
  });

  const handleSearchChange = (value: string) => {
    onChange({ search: value });
  };

  const handleCategoryChange = (value: string) => {
    onChange({ category: value });
  };

  const handleLocationChange = (value: string) => {
    onChange({ location: value });
  };

  const handleDateFromChange = (value: string) => {
    onChange({ date_from: value });
  };

  const handleDateToChange = (value: string) => {
    onChange({ date_to: value });
  };

  const handlePriceRangeChange = (field: 'min' | 'max', value: string) => {
    const newPriceRange = { ...priceRange, [field]: value };
    setPriceRange(newPriceRange);
    
    onChange({
      price_min: newPriceRange.min ? Number(newPriceRange.min) : undefined,
      price_max: newPriceRange.max ? Number(newPriceRange.max) : undefined,
    });
  };

  const clearAllFilters = () => {
    onChange({
      search: '',
      category: '',
      location: '',
      date_from: '',
      date_to: '',
      price_min: undefined,
      price_max: undefined,
    });
    setPriceRange({ min: '', max: '' });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category) count++;
    if (filters.location) count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.price_min || filters.price_max) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="p-0">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" size="sm">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                Clear all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="lg:hidden"
            >
              {isCollapsed ? 'Show' : 'Hide'}
            </Button>
          </div>
        </div>
        
        {totalResults > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {totalResults} events found
          </p>
        )}
      </div>

      {/* Filter Content */}
      <div className={`${isCollapsed ? 'hidden lg:block' : 'block'}`}>
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <Input
              label="Search events"
              placeholder="Search by title, venue, or description..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              leftIcon={<Filter className="h-4 w-4" />}
            />
          </div>

          {/* Category */}
          <div>
            <Select
              label="Category"
              value={filters.category || ''}
              onChange={handleCategoryChange}
              options={eventCategories}
            />
          </div>

          {/* Location */}
          <div>
            <Select
              label="Location"
              value={filters.location || ''}
              onChange={handleLocationChange}
              options={popularLocations}
              leftIcon={<MapPin className="h-4 w-4" />}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Range
            </label>
            <div className="space-y-3">
              <Input
                type="date"
                label="From"
                value={filters.date_from || ''}
                onChange={handleDateFromChange}
                size="sm"
              />
              <Input
                type="date"
                label="To"
                value={filters.date_to || ''}
                onChange={handleDateToChange}
                size="sm"
              />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Price Range
            </label>
            <div className="space-y-3">
              <Input
                type="number"
                label="Min Price"
                placeholder="0"
                value={priceRange.min}
                onChange={(value) => handlePriceRangeChange('min', value)}
                size="sm"
              />
              <Input
                type="number"
                label="Max Price"
                placeholder="1000"
                value={priceRange.max}
                onChange={(value) => handlePriceRangeChange('max', value)}
                size="sm"
              />
            </div>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Active Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge
                    variant="outline"
                    removable
                    onRemove={() => onChange({ search: '' })}
                  >
                    Search: {filters.search}
                  </Badge>
                )}
                {filters.category && (
                  <Badge
                    variant="outline"
                    removable
                    onRemove={() => onChange({ category: '' })}
                  >
                    {eventCategories.find(c => c.value === filters.category)?.label}
                  </Badge>
                )}
                {filters.location && (
                  <Badge
                    variant="outline"
                    removable
                    onRemove={() => onChange({ location: '' })}
                  >
                    {popularLocations.find(l => l.value === filters.location)?.label}
                  </Badge>
                )}
                {(filters.date_from || filters.date_to) && (
                  <Badge
                    variant="outline"
                    removable
                    onRemove={() => onChange({ date_from: '', date_to: '' })}
                  >
                    Date: {filters.date_from || 'Any'} - {filters.date_to || 'Any'}
                  </Badge>
                )}
                {(filters.price_min || filters.price_max) && (
                  <Badge
                    variant="outline"
                    removable
                    onRemove={() => {
                      onChange({ price_min: undefined, price_max: undefined });
                      setPriceRange({ min: '', max: '' });
                    }}
                  >
                    Price: ${filters.price_min || 0} - ${filters.price_max || '∞'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};