import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Select, EmptyState, Pagination } from '../ui';
import { BookingDetailsModal } from './BookingDetailsModal';
import { useDebounce } from '../../hooks';
import { bookingService } from '../../services/booking';
import type { Booking, BookingFilters } from '../../types/booking';

interface BookingHistoryProps {
  bookings: Booking[];
  totalCount: number;
  onBookingUpdate: () => void;
}

export const BookingHistory: React.FC<BookingHistoryProps> = ({
  bookings: initialBookings,
  totalCount: initialTotalCount,
  onBookingUpdate
}) => {
  const [bookings, setBookings] = useState(initialBookings);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch filtered bookings
  const fetchBookings = async (filters: BookingFilters) => {
    setLoading(true);
    try {
      const response = await bookingService.getUserBookings(undefined, {
        ...filters,
        page: currentPage,
        page_size: pageSize,
      });
      setBookings(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle filter changes
  useEffect(() => {
    const filters: BookingFilters = {};
    
    if (debouncedSearchTerm) {
      // Note: This would need backend support for search
      filters.search = debouncedSearchTerm;
    }
    
    if (statusFilter) {
      filters.booking_status = statusFilter;
    }
    
    if (typeFilter) {
      filters.booking_type = typeFilter as 'event' | 'movie';
    }

    fetchBookings(filters);
  }, [debouncedSearchTerm, statusFilter, typeFilter, currentPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
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
    // Refresh current view
    fetchBookings({
      search: debouncedSearchTerm,
      booking_status: statusFilter,
      booking_type: typeFilter as 'event' | 'movie',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[120px]"
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="min-w-[120px]"
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'event', label: 'Events' },
                  { value: 'movie', label: 'Movies' },
                ]}
              />
              {(searchTerm || statusFilter || typeFilter) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No bookings found"
            description={
              searchTerm || statusFilter || typeFilter
                ? "No bookings match your current filters. Try adjusting your search criteria."
                : "You haven't made any bookings yet. Start exploring events and movies!"
            }
            action={
              searchTerm || statusFilter || typeFilter ? (
                <Button onClick={clearFilters} variant="primary">
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => window.location.href = '/events'} variant="primary">
                  Browse Events
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {getEventTitle(booking)}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">{getEventVenue(booking)}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={getStatusColor(booking.booking_status)}>
                          {booking.booking_status}
                        </Badge>
                        <Badge variant={getPaymentStatusColor(booking.payment_status)} size="sm">
                          {booking.payment_status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Booked: {formatDate(booking.created_at)}
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
                      <Badge variant="outline" size="sm">
                        {booking.booking_type}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500">
                      Booking Reference: {booking.booking_reference}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewDetails(booking)}
                  >
                    View Details
                  </Button>

                  <div className="flex space-x-2">
                    {booking.booking_status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement review functionality
                          console.log('Leave review for booking:', booking.id);
                        }}
                      >
                        Leave Review
                      </Button>
                    )}
                    {(booking.booking_status === 'confirmed' || booking.booking_status === 'completed') && (
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
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
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