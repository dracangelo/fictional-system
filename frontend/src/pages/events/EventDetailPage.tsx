import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  StarIcon,
  HeartIcon,
  ShareIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Button, Card, Badge, LoadingSpinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { eventService } from '../../services/event/eventService';
import type { Event, ShowTime } from '@/types/event';
import { formatDate, formatTime, formatCurrency } from '../../utils/format';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showWarning, showSuccess, showError } = useNotifications();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedShowTime, setSelectedShowTime] = useState<ShowTime | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    try {
      setLoading(true);
      const eventData = await eventService.getEvent(eventId);
      setEvent(eventData);
      // Check if event is in user's wishlist
      if (user) {
        const wishlistStatus = await eventService.checkWishlistStatus(eventId);
        setIsWishlisted(wishlistStatus);
      }
    } catch (err) {
      setError('Failed to load event details');
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (showTime: ShowTime) => {
    if (!user) {
      showWarning('Please log in to book tickets', 'You need to be logged in to book tickets');
      navigate('/login');
      return;
    }
    
    setSelectedShowTime(showTime);
    navigate(`/events/${id}/book`, { 
      state: { 
        event, 
        showTime 
      } 
    });
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      showWarning('Please log in to add to wishlist', 'You need to be logged in to manage your wishlist');
      navigate('/login');
      return;
    }

    try {
      if (isWishlisted) {
        await eventService.removeFromWishlist(id!);
        setIsWishlisted(false);
        showSuccess('Removed from wishlist', 'Event has been removed from your wishlist');
      } else {
        await eventService.addToWishlist(id!);
        setIsWishlisted(true);
        showSuccess('Added to wishlist', 'Event has been added to your wishlist');
      }
    } catch (err) {
      showError('Failed to update wishlist', 'There was an error updating your wishlist. Please try again.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showSuccess('Link copied to clipboard', 'Event link has been copied to your clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
        <p className="text-gray-600 mb-6">{error || 'The event you are looking for does not exist.'}</p>
        <Button onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-900">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary-600 to-primary-800 flex items-center justify-center">
            <PlayIcon className="w-24 h-24 text-white opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleWishlistToggle}
            className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
          >
            {isWishlisted ? (
              <HeartSolidIcon className="w-5 h-5 text-red-500" />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
          >
            <ShareIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant={event.status === 'active' ? 'success' : 'secondary'}>
                  {event.status}
                </Badge>
                <Badge variant="outline">{event.category}</Badge>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
              
              <div className="flex items-center space-x-6 text-gray-600 mb-6">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="w-5 h-5" />
                  <span>{event.venue}</span>
                </div>
                {event.rating && (
                  <div className="flex items-center space-x-2">
                    <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                    <span>{event.rating}/5</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-700 leading-relaxed">{event.description}</p>
            </Card>

            {/* Additional Details */}
            {(event.duration || event.language || event.genre) && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {event.duration && (
                    <div>
                      <h3 className="font-medium text-gray-900">Duration</h3>
                      <p className="text-gray-600">{event.duration} minutes</p>
                    </div>
                  )}
                  {event.language && (
                    <div>
                      <h3 className="font-medium text-gray-900">Language</h3>
                      <p className="text-gray-600">{event.language}</p>
                    </div>
                  )}
                  {event.genre && (
                    <div>
                      <h3 className="font-medium text-gray-900">Genre</h3>
                      <p className="text-gray-600">{event.genre}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Book Tickets</h2>
              
              {event.showTimes && event.showTimes.length > 0 ? (
                <div className="space-y-4">
                  {event.showTimes.map((showTime) => (
                    <div
                      key={showTime.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{formatTime(showTime.startTime)}</span>
                        </div>
                        <Badge variant={showTime.availableSeats > 0 ? 'success' : 'error'}>
                          {showTime.availableSeats > 0 ? 'Available' : 'Sold Out'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">
                          {showTime.availableSeats} seats available
                        </span>
                        <span className="font-semibold text-primary-600">
                          From {formatCurrency(showTime.basePrice)}
                        </span>
                      </div>
                      
                      <Button
                        onClick={() => handleBookNow(showTime)}
                        disabled={showTime.availableSeats === 0}
                        className="w-full"
                        size="sm"
                      >
                        {showTime.availableSeats > 0 ? 'Book Now' : 'Sold Out'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No showtimes available</p>
                  <Button variant="outline" onClick={() => navigate('/events')}>
                    Browse Other Events
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;