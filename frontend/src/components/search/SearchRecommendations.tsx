import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  TrendingUp, 
  Heart, 
  MapPin, 
  Calendar, 
  Star,
  Users,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { EventCard } from '../events/EventCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { 
  useSearchRecommendations, 
  useSearchAnalytics,
  usePopularSearches,
  useTrendingCategories 
} from '../../hooks/useSearch';
import type { SearchRecommendation } from '../../services/search';

interface SearchRecommendationsProps {
  onSearchSelect?: (query: string) => void;
  onCategorySelect?: (category: string) => void;
  className?: string;
}

export const SearchRecommendations: React.FC<SearchRecommendationsProps> = ({
  onSearchSelect,
  onCategorySelect,
  className = '',
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personalized' | 'trending' | 'popular'>('personalized');

  const { 
    data: recommendations, 
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refetch: refetchRecommendations
  } = useSearchRecommendations();

  const { 
    data: analytics, 
    isLoading: isLoadingAnalytics 
  } = useSearchAnalytics();

  const { 
    data: popularSearches, 
    isLoading: isLoadingPopular 
  } = usePopularSearches(10);

  const { 
    data: trendingCategories, 
    isLoading: isLoadingTrending 
  } = useTrendingCategories(8);

  const handleSearchSelect = (query: string) => {
    if (onSearchSelect) {
      onSearchSelect(query);
    } else {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleCategorySelect = (category: string) => {
    if (onCategorySelect) {
      onCategorySelect(category);
    } else {
      navigate(`/search?category=${encodeURIComponent(category)}`);
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('booking history')) return <Heart className="h-3 w-3" />;
    if (reason.includes('location')) return <MapPin className="h-3 w-3" />;
    if (reason.includes('category')) return <Star className="h-3 w-3" />;
    if (reason.includes('trending')) return <TrendingUp className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Recommendations
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchRecommendations()}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('personalized')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'personalized'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Sparkles className="h-4 w-4 inline-block mr-2" />
            For You
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'trending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline-block mr-2" />
            Trending
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'popular'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline-block mr-2" />
            Popular
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'personalized' && (
          <PersonalizedRecommendations
            recommendations={recommendations}
            isLoading={isLoadingRecommendations}
            error={recommendationsError}
            onEventClick={handleEventClick}
            onSearchSelect={handleSearchSelect}
            getConfidenceColor={getConfidenceColor}
            getReasonIcon={getReasonIcon}
          />
        )}

        {activeTab === 'trending' && (
          <TrendingContent
            trendingCategories={trendingCategories}
            analytics={analytics}
            isLoadingTrending={isLoadingTrending}
            isLoadingAnalytics={isLoadingAnalytics}
            onCategorySelect={handleCategorySelect}
            onSearchSelect={handleSearchSelect}
          />
        )}

        {activeTab === 'popular' && (
          <PopularContent
            popularSearches={popularSearches}
            analytics={analytics}
            isLoadingPopular={isLoadingPopular}
            isLoadingAnalytics={isLoadingAnalytics}
            onSearchSelect={handleSearchSelect}
          />
        )}
      </div>
    </div>
  );
};

// Personalized Recommendations Component
interface PersonalizedRecommendationsProps {
  recommendations?: SearchRecommendation[];
  isLoading: boolean;
  error: Error | null;
  onEventClick: (eventId: string) => void;
  onSearchSelect: (query: string) => void;
  getConfidenceColor: (confidence: number) => string;
  getReasonIcon: (reason: string) => React.ReactNode;
}

const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  recommendations,
  isLoading,
  error,
  onEventClick,
  onSearchSelect,
  getConfidenceColor,
  getReasonIcon,
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
        Failed to load recommendations
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <EmptyState
        title="No personalized recommendations"
        description="Start browsing and booking events to get personalized recommendations"
        icon="sparkles"
      />
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                {recommendation.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {getReasonIcon(recommendation.reason)}
                <span>{recommendation.reason}</span>
              </div>
            </div>
            <Badge 
              className={`text-xs ${getConfidenceColor(recommendation.confidence_score)}`}
            >
              {Math.round(recommendation.confidence_score)}% match
            </Badge>
          </div>

          {recommendation.event && (
            <div className="mt-3">
              <div 
                className="cursor-pointer"
                onClick={() => onEventClick(recommendation.event!.id)}
              >
                <EventCard event={recommendation.event} compact />
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSearchSelect(recommendation.title)}
            >
              Search Similar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Trending Content Component
interface TrendingContentProps {
  trendingCategories?: string[];
  analytics?: any;
  isLoadingTrending: boolean;
  isLoadingAnalytics: boolean;
  onCategorySelect: (category: string) => void;
  onSearchSelect: (query: string) => void;
}

const TrendingContent: React.FC<TrendingContentProps> = ({
  trendingCategories,
  analytics,
  isLoadingTrending,
  isLoadingAnalytics,
  onCategorySelect,
  onSearchSelect,
}) => {
  if (isLoadingTrending || isLoadingAnalytics) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trending Categories */}
      {trendingCategories && trendingCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Trending Categories
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {trendingCategories.map((category, index) => (
              <button
                key={category}
                onClick={() => onCategorySelect(category)}
                className="p-3 text-left bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-blue-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{category}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs">#{index + 1}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Insights */}
      {analytics?.trending_categories && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Growth Insights
          </h3>
          <div className="space-y-2">
            {analytics.trending_categories.slice(0, 5).map((item: any) => (
              <div
                key={item.category}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-700">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">
                    +{Math.round(item.growth_rate)}%
                  </span>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Popular Content Component
interface PopularContentProps {
  popularSearches?: string[];
  analytics?: any;
  isLoadingPopular: boolean;
  isLoadingAnalytics: boolean;
  onSearchSelect: (query: string) => void;
}

const PopularContent: React.FC<PopularContentProps> = ({
  popularSearches,
  analytics,
  isLoadingPopular,
  isLoadingAnalytics,
  onSearchSelect,
}) => {
  if (isLoadingPopular || isLoadingAnalytics) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Popular Searches */}
      {popularSearches && popularSearches.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Most Searched
          </h3>
          <div className="space-y-2">
            {popularSearches.map((search, index) => (
              <button
                key={search}
                onClick={() => onSearchSelect(search)}
                className="w-full flex items-center justify-between p-3 text-left bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{search}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">Popular</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Statistics */}
      {analytics?.popular_searches && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Search Trends
          </h3>
          <div className="space-y-2">
            {analytics.popular_searches.slice(0, 5).map((item: any) => (
              <div
                key={item.query}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-700">{item.query}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {item.count} searches
                  </span>
                  <div className={`h-2 w-2 rounded-full ${
                    item.trend === 'up' ? 'bg-green-500' :
                    item.trend === 'down' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Quick Searches
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'This Weekend', query: 'weekend events' },
            { label: 'Free Events', query: 'free events' },
            { label: 'Near Me', query: 'events near me' },
            { label: 'Tonight', query: 'events tonight' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onSearchSelect(item.query)}
              className="p-2 text-sm text-center bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};