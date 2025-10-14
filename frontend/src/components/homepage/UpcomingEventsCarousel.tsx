import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from '../ui';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface Event {
  id: string;
  title: string;
  category: string;
  venue: string;
  address: string;
  startDateTime: string;
  endDateTime: string;
  posterUrl: string;
  minPrice: number;
  maxPrice: number;
  description: string;
  ticketsAvailable: number;
}

// Mock data - replace with actual API call
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Summer Music Festival',
    category: 'Music',
    venue: 'Central Park',
    address: 'New York, NY',
    startDateTime: '2024-07-15T18:00:00Z',
    endDateTime: '2024-07-15T23:00:00Z',
    posterUrl: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Music+Festival',
    minPrice: 45,
    maxPrice: 120,
    description: 'Join us for an unforgettable evening of live music featuring top artists.',
    ticketsAvailable: 250
  },
  {
    id: '2',
    title: 'Comedy Night Live',
    category: 'Comedy',
    venue: 'Laugh Factory',
    address: 'Los Angeles, CA',
    startDateTime: '2024-07-20T20:00:00Z',
    endDateTime: '2024-07-20T22:30:00Z',
    posterUrl: 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Comedy+Night',
    minPrice: 25,
    maxPrice: 60,
    description: 'Hilarious stand-up comedy with renowned comedians.',
    ticketsAvailable: 180
  },
  {
    id: '3',
    title: 'Art Exhibition Opening',
    category: 'Art',
    venue: 'Modern Art Gallery',
    address: 'Chicago, IL',
    startDateTime: '2024-07-25T17:00:00Z',
    endDateTime: '2024-07-25T21:00:00Z',
    posterUrl: 'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=Art+Exhibition',
    minPrice: 15,
    maxPrice: 35,
    description: 'Discover contemporary art from emerging and established artists.',
    ticketsAvailable: 120
  },
  {
    id: '4',
    title: 'Tech Conference 2024',
    category: 'Technology',
    venue: 'Convention Center',
    address: 'San Francisco, CA',
    startDateTime: '2024-08-01T09:00:00Z',
    endDateTime: '2024-08-01T18:00:00Z',
    posterUrl: 'https://via.placeholder.com/400x300/10b981/ffffff?text=Tech+Conference',
    minPrice: 80,
    maxPrice: 200,
    description: 'Leading tech conference featuring industry experts and innovations.',
    ticketsAvailable: 500
  },
  {
    id: '5',
    title: 'Food & Wine Festival',
    category: 'Food',
    venue: 'Waterfront Park',
    address: 'Miami, FL',
    startDateTime: '2024-08-10T12:00:00Z',
    endDateTime: '2024-08-10T22:00:00Z',
    posterUrl: 'https://via.placeholder.com/400x300/ef4444/ffffff?text=Food+Festival',
    minPrice: 35,
    maxPrice: 85,
    description: 'Taste exquisite cuisine and fine wines from around the world.',
    ticketsAvailable: 300
  }
];

export const UpcomingEventsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [events] = useState<Event[]>(mockEvents);
  const [itemsPerView, setItemsPerView] = useState(3);

  // Responsive items per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, events.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleEventClick = (event: Event) => {
    console.log('Event clicked:', event);
    // Navigate to event details or booking page
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const getCategoryColor = (category: string) => {
    const colors = {
      Music: 'bg-blue-100 text-blue-800',
      Comedy: 'bg-yellow-100 text-yellow-800',
      Art: 'bg-purple-100 text-purple-800',
      Technology: 'bg-green-100 text-green-800',
      Food: 'bg-red-100 text-red-800',
      Sports: 'bg-orange-100 text-orange-800',
      Theater: 'bg-pink-100 text-pink-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Upcoming Events
            </h2>
            <p className="text-gray-600">
              Don't miss out on these exciting upcoming events
            </p>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-2"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              disabled={currentIndex >= maxIndex}
              className="p-2"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`
            }}
          >
            {events.map((event) => (
              <div
                key={event.id}
                className="flex-shrink-0 px-3"
                style={{ width: `${100 / itemsPerView}%` }}
              >
                <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full">
                  <div 
                    className="relative overflow-hidden rounded-t-lg"
                    onClick={() => handleEventClick(event)}
                  >
                    <img
                      src={event.posterUrl}
                      alt={event.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={getCategoryColor(event.category)}>
                        {event.category}
                      </Badge>
                    </div>

                    {/* Tickets Available Badge */}
                    {event.ticketsAvailable < 50 && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-red-500 text-white">
                          Only {event.ticketsAvailable} left!
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                      {event.description}
                    </p>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4 mr-2 text-blue-500" />
                        <span>{formatDate(event.startDateTime)} at {formatTime(event.startDateTime)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-2 text-red-500" />
                        <span className="truncate">{event.venue}, {event.address}</span>
                      </div>
                    </div>

                    {/* Price and Book Button */}
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {event.minPrice === event.maxPrice ? (
                          `$${event.minPrice}`
                        ) : (
                          `$${event.minPrice} - $${event.maxPrice}`
                        )}
                      </div>
                      
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleEventClick(event)}
                        className="px-6"
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            View All Events
          </Button>
        </div>
      </div>
    </section>
  );
};