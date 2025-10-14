import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, EmptyState, LoadingSpinner } from '../ui';
import { useAuth } from '../../contexts';
import type { Event } from '../../types/event';

// Mock wishlist service - in a real app, this would be a proper service
interface WishlistItem {
  id: string;
  user_id: string;
  event_id?: string;
  movie_id?: string;
  item_type: 'event' | 'movie';
  created_at: string;
  event_details?: Event;
  movie_details?: any; // Would be proper Movie type
}

class MockWishlistService {
  private items: WishlistItem[] = [];

  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.items.filter(item => item.user_id === userId);
  }

  async addToWishlist(userId: string, itemId: string, itemType: 'event' | 'movie'): Promise<WishlistItem> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newItem: WishlistItem = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      event_id: itemType === 'event' ? itemId : undefined,
      movie_id: itemType === 'movie' ? itemId : undefined,
      item_type: itemType,
      created_at: new Date().toISOString(),
    };
    this.items.push(newItem);
    return newItem;
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.items = this.items.filter(item => item.id !== itemId);
  }

  async isInWishlist(userId: string, itemId: string, itemType: 'event' | 'movie'): Promise<boolean> {
    return this.items.some(item => 
      item.user_id === userId && 
      ((itemType === 'event' && item.event_id === itemId) ||
       (itemType === 'movie' && item.movie_id === itemId))
    );
  }
}

const wishlistService = new MockWishlistService();

export const WishlistCard: React.FC = () => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadWishlistItems();
    }
  }, [user?.id]);

  const loadWishlistItems = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const items = await wishlistService.getWishlistItems(user.id);
      setWishlistItems(items);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId));
    try {
      await wishlistService.removeFromWishlist(itemId);
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getItemTitle = (item: WishlistItem) => {
    if (item.event_details?.title) {
      return item.event_details.title;
    }
    if (item.movie_details?.title) {
      return item.movie_details.title;
    }
    return `${item.item_type} Item`;
  };

  const getItemVenue = (item: WishlistItem) => {
    if (item.event_details?.venue) {
      return item.event_details.venue;
    }
    if (item.movie_details?.theater) {
      return item.movie_details.theater;
    }
    return 'Venue TBD';
  };

  const getItemDate = (item: WishlistItem) => {
    if (item.event_details?.start_datetime) {
      return item.event_details.start_datetime;
    }
    if (item.movie_details?.showtime) {
      return item.movie_details.showtime;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingSpinner />
      </Card>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Save events and movies you're interested in to keep track of them here."
        action={
          <Button variant="primary" onClick={() => window.location.href = '/events'}>
            Browse Events
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {wishlistItems.map((item) => {
        const itemTitle = getItemTitle(item);
        const itemVenue = getItemVenue(item);
        const itemDate = getItemDate(item);
        const isRemoving = removingItems.has(item.id);

        return (
          <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {itemTitle}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">{itemVenue}</p>
                  </div>
                  <Badge variant="outline">
                    {item.item_type}
                  </Badge>
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  {itemDate && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(itemDate)}
                    </div>
                  )}
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Added {formatDate(item.created_at)}
                  </div>
                </div>

                {/* Mock event/movie details */}
                {item.item_type === 'event' && (
                  <div className="text-sm text-gray-600 mb-4">
                    <p>Category: Music • Price: From $25</p>
                  </div>
                )}
                {item.item_type === 'movie' && (
                  <div className="text-sm text-gray-600 mb-4">
                    <p>Genre: Action • Duration: 2h 15m • Rating: PG-13</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex space-x-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    // Navigate to item details
                    const path = item.item_type === 'event' 
                      ? `/events/${item.event_id}` 
                      : `/movies/${item.movie_id}`;
                    window.location.href = path;
                  }}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to booking
                    const path = item.item_type === 'event' 
                      ? `/events/${item.event_id}/book` 
                      : `/movies/${item.movie_id}/book`;
                    window.location.href = path;
                  }}
                >
                  Book Now
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleRemoveFromWishlist(item.id)}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                    Removing...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </>
                )}
              </Button>
            </div>
          </Card>
        );
      })}

      {/* Add sample items for demo */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Demo Mode</p>
            <p className="text-xs text-blue-700">
              This is a demo wishlist. In the full app, you can add events and movies by clicking the heart icon.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};