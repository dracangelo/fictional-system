import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Calendar, MapPin, Clock, Users, Star } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Event } from '../../types/event';

interface EventCardProps {
  event: Event;
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ event, className }) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMinPrice = () => {
    if (!event.ticket_types || event.ticket_types.length === 0) {
      return null;
    }
    return Math.min(...event.ticket_types.map(tt => tt.price));
  };

  const getTotalAvailableTickets = () => {
    if (!event.ticket_types || event.ticket_types.length === 0) {
      return 0;
    }
    return event.ticket_types.reduce((total, tt) => total + (tt.quantity_available - tt.quantity_sold), 0);
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/events/${event.id}/book`);
  };

  const handleCardClick = () => {
    navigate(`/events/${event.id}`);
  };

  const minPrice = getMinPrice();
  const availableTickets = getTotalAvailableTickets();
  const isLowAvailability = availableTickets > 0 && availableTickets <= 10;
  const isSoldOut = availableTickets === 0;

  return (
    <Card
      variant="interactive"
      padding="none"
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Event Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {event.media && event.media.length > 0 ? (
          <img
            src={event.media[0]}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-white opacity-50" />
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="default" className="capitalize">
            {event.category}
          </Badge>
        </div>

        {/* Status Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isSoldOut && (
            <Badge variant="error">
              Sold Out
            </Badge>
          )}
          {isLowAvailability && !isSoldOut && (
            <Badge variant="warning">
              Few Left
            </Badge>
          )}
          {event.status === 'draft' && (
            <Badge variant="secondary">
              Draft
            </Badge>
          )}
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            variant="primary"
            size="sm"
            onClick={handleBookNow}
            disabled={isSoldOut}
            className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
          >
            {isSoldOut ? 'Sold Out' : 'Book Now'}
          </Button>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 mb-2 overflow-hidden text-ellipsis group-hover:text-blue-600 transition-colors" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {event.title}
        </h3>

        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(event.start_datetime)}</span>
          <Clock className="h-4 w-4 ml-2" />
          <span>{formatTime(event.start_datetime)}</span>
        </div>

        {/* Venue */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{event.venue}</span>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 mb-3 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {event.description}
          </p>
        )}

        {/* Availability */}
        {availableTickets > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Users className="h-4 w-4" />
            <span>{availableTickets} tickets available</span>
          </div>
        )}

        {/* Rating (if available) */}
        {/* Note: Rating is not in the current Event type, but could be added */}
        {/* <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>4.5 (120 reviews)</span>
        </div> */}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Price */}
          <div className="flex flex-col">
            {minPrice !== null ? (
              <>
                <span className="text-xs text-gray-500">Starting from</span>
                <span className="font-bold text-lg text-gray-900">
                  ${minPrice}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500">Price TBA</span>
            )}
          </div>

          {/* Action Button */}
          <Button
            variant={isSoldOut ? 'outline' : 'primary'}
            size="sm"
            onClick={handleBookNow}
            disabled={isSoldOut}
          >
            {isSoldOut ? 'Sold Out' : 'Book Now'}
          </Button>
        </div>
      </div>
    </Card>
  );
};