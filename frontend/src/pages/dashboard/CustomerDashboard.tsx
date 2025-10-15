import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { useQuery } from '../../hooks';
import { bookingService } from '../../services/booking';
import { eventService } from '../../services/event';
import { Card, Button, LoadingSpinner, EmptyState } from '../../components/ui';
import { BookingHistory } from '../../components/booking/BookingHistory';
import { UpcomingBookings } from '../../components/booking/UpcomingBookings';
import { WishlistCard } from '../../components/booking/WishlistCard';
import { RecommendedEvents } from '../../components/booking/RecommendedEvents';
import type { Booking } from '../../types/booking';
import type { Event } from '../../types/event';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'wishlist'>('overview');

  // Fetch upcoming bookings
  const {
    data: upcomingBookings,
    loading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming
  } = useQuery<Booking[]>(() => bookingService.getUpcomingBookings(user?.id));

  // Fetch booking history
  const {
    data: bookingHistory,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery(() => bookingService.getUserBookings(user?.id, { page_size: 5 }));

  // Fetch recommended events (mock implementation)
  const {
    data: recommendedEvents,
    loading: recommendedLoading
  } = useQuery<Event[]>(() => eventService.getEvents({ page_size: 6 }));

  const handleBookingUpdate = () => {
    refetchUpcoming();
    refetchHistory();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'bookings', label: 'My Bookings', count: upcomingBookings?.length || 0 },
    { id: 'wishlist', label: 'Wishlist', count: 0 }, // TODO: Implement wishlist count
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.firstName}!</p>
            </div>
            <Button variant="primary" onClick={() => window.location.href = '/events'}>
              Browse Events
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {upcomingLoading ? '...' : upcomingBookings?.length || 0}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {historyLoading ? '...' : bookingHistory?.count || 0}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Wishlist Items</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Upcoming Bookings Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('bookings')}
                >
                  View All
                </Button>
              </div>
              {upcomingLoading ? (
                <LoadingSpinner />
              ) : upcomingError ? (
                <EmptyState
                  title="Error loading bookings"
                  description="There was an error loading your upcoming bookings. Please try again."
                  action={
                    <Button onClick={refetchUpcoming} variant="primary">
                      Retry
                    </Button>
                  }
                />
              ) : (
                <UpcomingBookings 
                  bookings={upcomingBookings || []} 
                  onBookingUpdate={handleBookingUpdate}
                  showAll={false}
                />
              )}
            </div>

            {/* Recommended Events */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Recommended for You</h2>
              {recommendedLoading ? (
                <LoadingSpinner />
              ) : (
                <RecommendedEvents events={recommendedEvents?.results || []} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Upcoming Events</h2>
              {upcomingLoading ? (
                <LoadingSpinner />
              ) : (
                <UpcomingBookings 
                  bookings={upcomingBookings || []} 
                  onBookingUpdate={handleBookingUpdate}
                  showAll={true}
                />
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Booking History</h2>
              {historyLoading ? (
                <LoadingSpinner />
              ) : (
                <BookingHistory 
                  bookings={bookingHistory?.results || []}
                  totalCount={bookingHistory?.count || 0}
                  onBookingUpdate={handleBookingUpdate}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">My Wishlist</h2>
            <WishlistCard />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;