import React, { useState } from 'react';
import { Clock, Bookmark, Trash2, Search, Bell, BellOff, Edit2, X } from 'lucide-react';
import { Button, Badge, Input } from '../ui';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { 
  useSearchHistory, 
  useSavedSearches, 
  useClearSearchHistory, 
  useDeleteSearchHistoryItem,
  useDeleteSavedSearch,
  useSaveSearch 
} from '../../hooks/useSearch';
import type { SearchHistory as SearchHistoryType, SavedSearch } from '../../services/search';

interface SearchHistoryProps {
  onSearchSelect?: (query: string, filters?: any) => void;
  className?: string;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSearchSelect,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [editingSavedSearch, setEditingSavedSearch] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { 
    data: searchHistory, 
    isLoading: isLoadingHistory, 
    error: historyError 
  } = useSearchHistory();

  const { 
    data: savedSearches, 
    isLoading: isLoadingSaved, 
    error: savedError 
  } = useSavedSearches();

  const clearHistoryMutation = useClearSearchHistory();
  const deleteHistoryItemMutation = useDeleteSearchHistoryItem();
  const deleteSavedSearchMutation = useDeleteSavedSearch();
  const saveSearchMutation = useSaveSearch();

  const handleSearchSelect = (query: string, filters?: any) => {
    if (onSearchSelect) {
      onSearchSelect(query, filters);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all search history?')) {
      try {
        await clearHistoryMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await deleteHistoryItemMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this saved search?')) {
      try {
        await deleteSavedSearchMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete saved search:', error);
      }
    }
  };

  const handleEditSavedSearch = (savedSearch: SavedSearch) => {
    setEditingSavedSearch(savedSearch.id);
    setEditName(savedSearch.name);
  };

  const handleSaveEdit = async (savedSearch: SavedSearch) => {
    if (editName.trim() && editName !== savedSearch.name) {
      try {
        // Note: This would need an update endpoint in the real implementation
        await saveSearchMutation.mutateAsync({
          name: editName.trim(),
          query: savedSearch.query,
          filters: savedSearch.filters,
        });
        setEditingSavedSearch(null);
        setEditName('');
      } catch (error) {
        console.error('Failed to update saved search:', error);
      }
    } else {
      setEditingSavedSearch(null);
      setEditName('');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFilterSummary = (filters: any) => {
    if (!filters || Object.keys(filters).length === 0) return null;
    
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        switch (key) {
          case 'category':
            return `Category: ${value}`;
          case 'location':
            return `Location: ${value}`;
          case 'date_from':
            return `From: ${new Date(value as string).toLocaleDateString()}`;
          case 'date_to':
            return `To: ${new Date(value as string).toLocaleDateString()}`;
          case 'price_min':
            return `Min: $${value}`;
          case 'price_max':
            return `Max: $${value}`;
          default:
            return `${key}: ${value}`;
        }
      });

    return activeFilters.length > 0 ? activeFilters.join(', ') : null;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 inline-block mr-2" />
            Recent Searches
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bookmark className="h-4 w-4 inline-block mr-2" />
            Saved Searches
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'history' && (
          <SearchHistoryTab
            searchHistory={searchHistory}
            isLoading={isLoadingHistory}
            error={historyError}
            onSearchSelect={handleSearchSelect}
            onClearHistory={handleClearHistory}
            onDeleteItem={handleDeleteHistoryItem}
            formatDate={formatDate}
            getFilterSummary={getFilterSummary}
            clearHistoryMutation={clearHistoryMutation}
            deleteHistoryItemMutation={deleteHistoryItemMutation}
          />
        )}

        {activeTab === 'saved' && (
          <SavedSearchesTab
            savedSearches={savedSearches}
            isLoading={isLoadingSaved}
            error={savedError}
            onSearchSelect={handleSearchSelect}
            onDeleteSavedSearch={handleDeleteSavedSearch}
            onEditSavedSearch={handleEditSavedSearch}
            editingSavedSearch={editingSavedSearch}
            editName={editName}
            setEditName={setEditName}
            onSaveEdit={handleSaveEdit}
            setEditingSavedSearch={setEditingSavedSearch}
            formatDate={formatDate}
            getFilterSummary={getFilterSummary}
            deleteSavedSearchMutation={deleteSavedSearchMutation}
          />
        )}
      </div>
    </div>
  );
};

// Search History Tab Component
interface SearchHistoryTabProps {
  searchHistory?: SearchHistoryType[];
  isLoading: boolean;
  error: Error | null;
  onSearchSelect: (query: string, filters?: any) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  formatDate: (date: string) => string;
  getFilterSummary: (filters: any) => string | null;
  clearHistoryMutation: any;
  deleteHistoryItemMutation: any;
}

const SearchHistoryTab: React.FC<SearchHistoryTabProps> = ({
  searchHistory,
  isLoading,
  error,
  onSearchSelect,
  onClearHistory,
  onDeleteItem,
  formatDate,
  getFilterSummary,
  clearHistoryMutation,
  deleteHistoryItemMutation,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load search history
      </div>
    );
  }

  if (!searchHistory || searchHistory.length === 0) {
    return (
      <EmptyState
        title="No search history"
        description="Your recent searches will appear here"
        icon="clock"
      />
    );
  }

  return (
    <div>
      {/* Header with Clear All button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          Recent Searches ({searchHistory.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearHistory}
          disabled={clearHistoryMutation.isPending}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      {/* History Items */}
      <div className="space-y-3">
        {searchHistory.map((item) => {
          const filterSummary = getFilterSummary(item.filters);
          
          return (
            <div
              key={item.id}
              className="group flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => onSearchSelect(item.query, item.filters)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{item.query}</span>
                  {item.result_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.result_count} results
                    </Badge>
                  )}
                </div>
                
                {filterSummary && (
                  <div className="text-xs text-gray-600 ml-6 mb-1">
                    Filters: {filterSummary}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 ml-6">
                  {formatDate(item.timestamp)}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteItem(item.id)}
                disabled={deleteHistoryItemMutation.isPending}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Saved Searches Tab Component
interface SavedSearchesTabProps {
  savedSearches?: SavedSearch[];
  isLoading: boolean;
  error: Error | null;
  onSearchSelect: (query: string, filters?: any) => void;
  onDeleteSavedSearch: (id: string) => void;
  onEditSavedSearch: (savedSearch: SavedSearch) => void;
  editingSavedSearch: string | null;
  editName: string;
  setEditName: (name: string) => void;
  onSaveEdit: (savedSearch: SavedSearch) => void;
  setEditingSavedSearch: (id: string | null) => void;
  formatDate: (date: string) => string;
  getFilterSummary: (filters: any) => string | null;
  deleteSavedSearchMutation: any;
}

const SavedSearchesTab: React.FC<SavedSearchesTabProps> = ({
  savedSearches,
  isLoading,
  error,
  onSearchSelect,
  onDeleteSavedSearch,
  onEditSavedSearch,
  editingSavedSearch,
  editName,
  setEditName,
  onSaveEdit,
  setEditingSavedSearch,
  formatDate,
  getFilterSummary,
  deleteSavedSearchMutation,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load saved searches
      </div>
    );
  }

  if (!savedSearches || savedSearches.length === 0) {
    return (
      <EmptyState
        title="No saved searches"
        description="Save your frequent searches for quick access"
        icon="bookmark"
      />
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Saved Searches ({savedSearches.length})
      </h3>

      <div className="space-y-3">
        {savedSearches.map((savedSearch) => {
          const filterSummary = getFilterSummary(savedSearch.filters);
          const isEditing = editingSavedSearch === savedSearch.id;
          
          return (
            <div
              key={savedSearch.id}
              className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="mb-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-sm"
                        placeholder="Search name"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => onSaveEdit(savedSearch)}
                          disabled={!editName.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSavedSearch(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer"
                      onClick={() => onSearchSelect(savedSearch.query, savedSearch.filters)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Bookmark className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-900">{savedSearch.name}</span>
                        {savedSearch.notification_enabled && (
                          <Bell className="h-3 w-3 text-green-500" title="Notifications enabled" />
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 ml-6 mb-1">
                        Query: "{savedSearch.query}"
                      </div>
                      
                      {filterSummary && (
                        <div className="text-xs text-gray-600 ml-6 mb-1">
                          Filters: {filterSummary}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 ml-6">
                        Saved {formatDate(savedSearch.created_at)}
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSavedSearch(savedSearch)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSavedSearch(savedSearch.id)}
                      disabled={deleteSavedSearchMutation.isPending}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};