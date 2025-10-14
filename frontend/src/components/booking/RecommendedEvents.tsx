import React from 'react';
import { Card, Button, Badge, EmptyState } from '../ui';
import type { Event } from '../../types/event';

interface RecommendedEventsProps {
  events: Event[];
}

export const RecommendedEvents: React.FC<RecommendedEventsProps> = ({ events }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getLowestPrice = (event: Event) => {
    if (!event.ticket_types || event.ticket_types.length === 0) {
      return null;
    }
    const prices = event.ticket_types.map(tt => tt.price);
    return Math.min(...prices);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'music': 'bg-purple-100 text-purple-800',
      'sports': 'bg-green-100 text-green-800',
      'theater': 'bg-red-100 text-red-800',
      'comedy': 'bg-yellow-100 text-yellow-800',
      'conference': 'bg-blue-100 text-blue-800',
      'festival': 'bg-pink-100 text-pink-800',
      'art': 'bg-indigo-100 text-indigo-800',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const handleBookEvent = (eventId: string) => {
    window.location.href = `/events/${eventId}/book`;
  };

  const handleViewEvent = (eventId: string) => {
    window.location.href = `/events/${eventId}`;
  };

  if (events.length === 0) {
    return (
      <EmptyState
        title="No recommendations available"
        description="We're working on finding events you might like. Check back soon!"
        action={
          <Button variant="primary" onClick={() => window.location.href = '/events'}>
            Browse All Events
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        const lowestPrice = getLowestPrice(event);
        const isUpcoming = new Date(event.start_datetime) > new Date();

        return (
          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Event Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 relative">
              {event.media && event.media.length > 0 ? (
                <img
                  src={event.media[0]}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <Badge className={getCategoryColor(event.category)}>
                  {event.category}
                </Badge>
              </div>

              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {!isUpcoming && (
                  <Badge variant="error">Past Event</Badge>
                )}
                {event.status === 'draft' && (
                  <Badge variant="warning">Draft</Badge>
                )}
                {event.status === 'cancelled' && (
                  <Badge variant="error">Cancelled</Badge>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Event Title and Venue */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                  {event.title}
                </h3>
                <p className="text-gray-600 text-sm">{event.venue}</p>
              </div>

              {/* Date and Time */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(event.start_datetime)}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(event.start_datetime)}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                {event.description}
              </p>

              {/* Price and Actions */}
              <div className="flex items-center justify-between">
                <div>
                  {lowestPrice !== null ? (
                    <div className="text-lg font-semibold text-gray-900">
                      From ${lowestPrice.toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Price TBA
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewEvent(event.id)}
                  >
                    Details
                  </Button>
                  {isUpcoming && event.status === 'published' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleBookEvent(event.id)}
                    >
                      Book Now
                    </Button>
                  )}
                </div>
              </div>

              {/* Recommendation Reason */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>
                    {/* Mock recommendation reasons */}
                    {event.category === 'music' && 'Based on your music preferences'}
                    {event.category === 'sports' && 'Popular in your area'}
                    {event.category === 'theater' && 'Similar to events you\'ve attended'}
                    {!['music', 'sports', 'theater'].includes(event.category) && 'Trending now'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};