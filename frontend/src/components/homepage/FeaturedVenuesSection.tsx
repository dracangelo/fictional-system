import React, { useState } from 'react';
import { Button, Card } from '../ui';
import { MapPinIcon, StarIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  capacity: number;
  amenities: string[];
  upcomingEvents: number;
  category: 'theater' | 'concert_hall' | 'stadium' | 'club' | 'outdoor';
}

// Mock data - replace with actual API call
const mockVenues: Venue[] = [
  {
    id: '1',
    name: 'Madison Square Garden',
    address: '4 Pennsylvania Plaza',
    city: 'New York',
    state: 'NY',
    rating: 4.8,
    reviewCount: 2847,
    imageUrl: 'https://via.placeholder.com/400x250/1f2937/ffffff?text=Madison+Square+Garden',
    description: 'Iconic venue hosting world-class entertainment and sports events.',
    capacity: 20000,
    amenities: ['Parking', 'Concessions', 'Accessibility', 'VIP Boxes'],
    upcomingEvents: 15,
    category: 'stadium'
  },
  {
    id: '2',
    name: 'Hollywood Bowl',
    address: '2301 Highland Ave',
    city: 'Los Angeles',
    state: 'CA',
    rating: 4.7,
    reviewCount: 1923,
    imageUrl: 'https://via.placeholder.com/400x250/3b82f6/ffffff?text=Hollywood+Bowl',
    description: 'Historic outdoor amphitheater with stunning city views.',
    capacity: 17500,
    amenities: ['Outdoor Seating', 'Dining', 'Parking', 'Picnic Areas'],
    upcomingEvents: 22,
    category: 'outdoor'
  },
  {
    id: '3',
    name: 'Chicago Theatre',
    address: '175 N State St',
    city: 'Chicago',
    state: 'IL',
    rating: 4.6,
    reviewCount: 1456,
    imageUrl: 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Chicago+Theatre',
    description: 'Historic theater featuring Broadway shows and concerts.',
    capacity: 3600,
    amenities: ['Historic Architecture', 'Bar', 'Coat Check', 'Accessibility'],
    upcomingEvents: 8,
    category: 'theater'
  },
  {
    id: '4',
    name: 'Red Rocks Amphitheatre',
    address: '18300 W Alameda Pkwy',
    city: 'Morrison',
    state: 'CO',
    rating: 4.9,
    reviewCount: 3241,
    imageUrl: 'https://via.placeholder.com/400x250/ef4444/ffffff?text=Red+Rocks',
    description: 'Natural amphitheater carved into red sandstone formations.',
    capacity: 9525,
    amenities: ['Natural Setting', 'Hiking Trails', 'Parking', 'Museum'],
    upcomingEvents: 18,
    category: 'outdoor'
  },
  {
    id: '5',
    name: 'The Fillmore',
    address: '1805 Geary Blvd',
    city: 'San Francisco',
    state: 'CA',
    rating: 4.5,
    reviewCount: 987,
    imageUrl: 'https://via.placeholder.com/400x250/f59e0b/ffffff?text=The+Fillmore',
    description: 'Legendary music venue with rich rock and roll history.',
    capacity: 1150,
    amenities: ['Historic Posters', 'Bar', 'Merchandise', 'Standing Room'],
    upcomingEvents: 12,
    category: 'club'
  },
  {
    id: '6',
    name: 'Kennedy Center',
    address: '2700 F St NW',
    city: 'Washington',
    state: 'DC',
    rating: 4.7,
    reviewCount: 2156,
    imageUrl: 'https://via.placeholder.com/400x250/10b981/ffffff?text=Kennedy+Center',
    description: 'Premier performing arts center featuring opera, ballet, and theater.',
    capacity: 2465,
    amenities: ['Multiple Halls', 'Fine Dining', 'River Views', 'Parking'],
    upcomingEvents: 25,
    category: 'theater'
  }
];

export const FeaturedVenuesSection: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [venues] = useState<Venue[]>(mockVenues);

  // Get unique cities for filter
  const cities = ['all', ...Array.from(new Set(venues.map(venue => venue.city)))];

  // Filter venues by selected city
  const filteredVenues = selectedCity === 'all' 
    ? venues 
    : venues.filter(venue => venue.city === selectedCity);

  const handleVenueClick = (venue: Venue) => {
    console.log('Venue clicked:', venue);
    // Navigate to venue details or events at this venue
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'theater':
        return '🎭';
      case 'concert_hall':
        return '🎵';
      case 'stadium':
        return '🏟️';
      case 'club':
        return '🎤';
      case 'outdoor':
        return '🌲';
      default:
        return '🏢';
    }
  };

  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}K`;
    }
    return capacity.toString();
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Venues
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover amazing venues in your area and explore upcoming events
          </p>
        </div>

        {/* City Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {cities.map((city) => (
            <Button
              key={city}
              variant={selectedCity === city ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCity(city)}
              className="capitalize"
            >
              {city === 'all' ? 'All Cities' : city}
            </Button>
          ))}
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <Card 
              key={venue.id} 
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => handleVenueClick(venue)}
            >
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-white bg-opacity-90 rounded-full px-3 py-1 text-sm font-medium">
                  {getCategoryIcon(venue.category)} {venue.category.replace('_', ' ')}
                </div>

                {/* Capacity Badge */}
                <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white rounded-full px-3 py-1 text-sm">
                  {formatCapacity(venue.capacity)} capacity
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                  {venue.name}
                </h3>
                
                {/* Location */}
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPinIcon className="w-4 h-4 mr-2" />
                  <span className="text-sm">{venue.city}, {venue.state}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center">
                    <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium text-gray-900">
                      {venue.rating}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 ml-2">
                    ({venue.reviewCount} reviews)
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {venue.description}
                </p>

                {/* Amenities */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {venue.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                    {venue.amenities.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{venue.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-blue-600">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    <span>{venue.upcomingEvents} upcoming events</span>
                  </div>
                  
                  <Button variant="primary" size="sm">
                    View Events
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Explore All Venues
          </Button>
        </div>
      </div>
    </section>
  );
};