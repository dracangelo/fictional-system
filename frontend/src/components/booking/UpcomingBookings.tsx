import React, { useState } from 'react';
import { Card, Button, Badge, EmptyState } from '../ui';
import { BookingDetailsModal } from './BookingDetailsModal';
import type { Booking } from '../../types/booking';

interface UpcomingBookingsProps {
  bookings: Booking[];
  onBookingUpdate: () => void;
  showAll?: boolean;
}

export const UpcomingBookings: React.FC<UpcomingBookingsProps> = ({
  bookings,
  onBookingUpdate,
  showAll = false
}) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const displayBookings = showAll ? bookings : bookings.slice(0, 3);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
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

  const getEventDateTime = (booking: Booking) => {
    if (booking.event_details?.start_datetime) {
      return booking.event_details.start_datetime;
    }
    if (booking.showtime_details?.start_time) {
      return booking.showtime_details.start_time;
    }
    return booking.created_at;
  };

  const getEventTitle = (booking: Booking) => {
    if (booking.event_details?.title) {
      return booking.event_details.title;
    }
    if (booking.showtime_details?.movie?.title) {
      return booking.showtime_details.movie.title;
    }
    return `${booking.booking_type} Booking`;
  };

  const getEventVenue = (booking: Booking) => {
    if (booking.event_details?.venue) {
      return booking.event_details.venue;
    }
    if (booking.showtime_details?.theater?.name) {
      return booking.showtime_details.theater.name;
    }
    return 'Venue TBD';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'warning';
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
  };

  const handleBookingUpdated = () => {
    handleCloseModal();
    onBookingUpdate();
  };

  if (displayBookings.length === 0) {
    return (
      <EmptyState
        title="No upcoming events"
        description="You don't have any upcoming bookings. Browse events to find something exciting!"
        action={
          <Button variant="primary" onClick={() => window.location.href = '/events'}>
            Browse Events
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {displayBookings.map((booking) => {
          const eventDateTime = getEventDateTime(booking);
          const eventTitle = getEventTitle(booking);
          const eventVenue = getEventVenue(booking);

          return (
            <Card key={booking.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {eventTitle}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{eventVenue}</p>
                    </div>
                    <Badge variant={getStatusColor(booking.booking_status)}>
                      {booking.booking_status}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(eventDateTime)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTime(eventDateTime)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      {booking.tickets?.length || 0} ticket{(booking.tickets?.length || 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center font-medium">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      ${booking.total_amount.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Booking Reference: {booking.booking_reference}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewDetails(booking)}
                  >
                    View Details
                  </Button>
                  {booking.booking_status === 'confirmed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement ticket download
                        console.log('Download tickets for booking:', booking.id);
                      }}
                    >
                      Download Tickets
                    </Button>
                  )}
                </div>

                {booking.booking_status === 'confirmed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleViewDetails(booking)}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={showDetailsModal}
          onClose={handleCloseModal}
          onBookingUpdated={handleBookingUpdated}
        />
      )}
    </>
  );
};