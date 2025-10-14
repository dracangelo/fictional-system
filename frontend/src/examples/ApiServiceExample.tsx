import React from 'react';
import { useEvents, useCreateEvent, useUserProfile } from '../hooks/useQuery';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

/**
 * Example component demonstrating how to use the API services
 * This shows the integration of React Query hooks with the API services
 */
export function ApiServiceExample() {
  // Fetch events with React Query
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useEvents({ 
    page_size: 5,
    status: 'published' 
  });

  // Fetch user profile
  const { 
    data: userProfile, 
    isLoading: profileLoading 
  } = useUserProfile();

  // Create event mutation
  const createEventMutation = useCreateEvent({
    onSuccess: () => {
      console.log('Event created successfully!');
      refetchEvents(); // Refetch events after creating a new one
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
    },
  });

  const handleCreateEvent = () => {
    createEventMutation.mutate({
      title: 'Sample Event',
      description: 'This is a sample event created from the API service example',
      venue: 'Sample Venue',
      address: '123 Sample Street, Sample City',
      category: 'music',
      start_datetime: '2024-06-15T19:00:00Z',
      end_datetime: '2024-06-15T22:00:00Z',
    });
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          API Service Integration Example
        </h1>
        <p className="text-gray-600">
          Demonstrating the use of EventService, BookingService, and UserService
        </p>
      </div>

      {/* User Profile Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">User Profile</h2>
        {userProfile ? (
          <div className="space-y-2">
            <p><strong>Name:</strong> {userProfile.firstName} {userProfile.lastName}</p>
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>Role:</strong> {userProfile.role}</p>
            <p><strong>Favorite Genres:</strong> {userProfile.preferences.favoriteGenres.join(', ') || 'None'}</p>
          </div>
        ) : (
          <p className="text-gray-500">No user profile data available</p>
        )}
      </Card>

      {/* Events Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Published Events</h2>
          <Button 
            onClick={handleCreateEvent}
            disabled={createEventMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createEventMutation.isPending ? 'Creating...' : 'Create Sample Event'}
          </Button>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <span className="ml-2">Loading events...</span>
          </div>
        ) : eventsError ? (
          <div className="text-red-600 py-4">
            <p>Error loading events: {eventsError.message}</p>
            <Button 
              onClick={() => refetchEvents()} 
              variant="outline" 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : eventsData?.results.length ? (
          <div className="space-y-4">
            {eventsData.results.map((event) => (
              <div key={event.id} className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-lg">{event.title}</h3>
                <p className="text-gray-600 mt-1">{event.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <p><strong>Venue:</strong> {event.venue}</p>
                  <p><strong>Date:</strong> {new Date(event.start_datetime).toLocaleDateString()}</p>
                  <p><strong>Category:</strong> {event.category}</p>
                  <p><strong>Status:</strong> {event.status}</p>
                </div>
              </div>
            ))}
            <div className="text-sm text-gray-500 text-center">
              Showing {eventsData.results.length} of {eventsData.count} events
            </div>
          </div>
        ) : (
          <p className="text-gray-500 py-4">No events found</p>
        )}
      </Card>

      {/* API Service Features */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">API Service Features</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-green-700">Event Service</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• CRUD operations</li>
              <li>• Search & filtering</li>
              <li>• Analytics</li>
              <li>• Media management</li>
              <li>• Status management</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-blue-700">Booking Service</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Payment processing</li>
              <li>• Seat management</li>
              <li>• Ticket generation</li>
              <li>• Waitlist management</li>
              <li>• Reviews & ratings</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-purple-700">User Service</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Profile management</li>
              <li>• Preferences</li>
              <li>• Notifications</li>
              <li>• Favorites</li>
              <li>• 2FA support</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* React Query Features */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">React Query Integration</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-indigo-700">Query Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic caching</li>
              <li>• Background refetching</li>
              <li>• Error handling</li>
              <li>• Loading states</li>
              <li>• Stale-while-revalidate</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-orange-700">Mutation Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Optimistic updates</li>
              <li>• Cache invalidation</li>
              <li>• Retry logic</li>
              <li>• Success/error callbacks</li>
              <li>• Loading states</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}