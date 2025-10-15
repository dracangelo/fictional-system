import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdvancedSearchBar } from '../search/AdvancedSearchBar';

export const SearchBar: React.FC = () => {
  const navigate = useNavigate();

  const handleSearch = (query: string, filters?: any) => {
    const params = new URLSearchParams();
    params.set('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.set(key, value.toString());
          }
        }
      });
    }

    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AdvancedSearchBar
        placeholder="Search for events, movies, or venues..."
        onSearch={handleSearch}
        showFilters={false}
        className="w-full"
      />
    </div>
  );
};