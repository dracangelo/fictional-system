import React, { useState } from 'react';
import { Modal, Button, Badge, Card } from '../ui';
import { CancelBookingModal } from './CancelBookingModal';
import { bookingService } from '../../services/booking';
import type { Booking, Ticket } from '../../types/booking';

interface BookingDetailsModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated: () => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  onBookingUpdated
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const getEventAddress = (booking: Booking) => {
    if (booking.event_details?.address) {
      return booking.event_details.address;
    }
    if (booking.showtime_details?.theater?.address) {
      return booking.showtime_details.theater.address;
    }
    return '';
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

  const handleDownloadTickets = async () => {
    setDownloading(true);
    try {
      const blob = await bookingService.downloadTickets(booking.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tickets-${booking.booking_reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading tickets:', error);
      // TODO: Show error toast
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailTickets = async () => {
    setEmailing(true);
    try {
      await bookingService.emailTickets(booking.id);
      // TODO: Show success toast
    } catch (error) {
      console.error('Error emailing tickets:', error);
      // TODO: Show error toast
    } finally {
      setEmailing(false);
    }
  };

  const handleCancelBooking = () => {
    setShowCancelModal(true);
  };

  const handleCancelComplete = () => {
    setShowCancelModal(false);
    onBookingUpdated();
  };

  const eventDateTime = getEventDateTime(booking);
  const eventTitle = getEventTitle(booking);
  const eventVenue = getEventVenue(booking);
  const eventAddress = getEventAddress(booking);

  const canCancel = booking.booking_status === 'confirmed' && 
                   new Date(eventDateTime) > new Date();

  const canDownload = booking.booking_status === 'confirmed' || 
                     booking.booking_status === 'completed';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Booking Details" size="lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {eventTitle}
              </h2>
              <p className="text-gray-600">{eventVenue}</p>
              {eventAddress && (
                <p className="text-sm text-gray-500 mt-1">{eventAddress}</p>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant={getStatusColor(booking.booking_status)}>
                {booking.booking_status}
              </Badge>
              <Badge variant={getPaymentStatusColor(booking.payment_status)} size="sm">
                Payment: {booking.payment_status}
              </Badge>
            </div>
          </div>

          {/* Event Details */}
          <Card className="p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Event Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(eventDateTime)}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(eventDateTime)}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {booking.booking_type}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Booking Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Reference:</span> {booking.booking_reference}
                  </div>
                  <div>
                    <span className="text-gray-600">Booked on:</span> {formatDate(booking.created_at)}
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span> ${booking.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tickets */}
          {booking.tickets && booking.tickets.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Tickets ({booking.tickets.length})</h4>
              <div className="space-y-3">
                {booking.tickets.map((ticket: Ticket) => (
                  <Card key={ticket.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              Ticket #{ticket.ticket_number}
                            </p>
                            {ticket.seat_number && (
                              <p className="text-sm text-gray-600">
                                Seat: {ticket.seat_number}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${ticket.price.toFixed(2)}</p>
                            <Badge 
                              variant={ticket.status === 'valid' ? 'success' : 'error'} 
                              size="sm"
                            >
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {ticket.qr_code && (
                        <div className="ml-4">
                          <img 
                            src={`data:image/png;base64,${ticket.qr_code}`}
                            alt="QR Code"
                            className="w-16 h-16 border rounded"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex space-x-3">
              {canDownload && (
                <>
                  <Button
                    variant="primary"
                    onClick={handleDownloadTickets}
                    disabled={downloading}
                  >
                    {downloading ? 'Downloading...' : 'Download Tickets'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEmailTickets}
                    disabled={emailing}
                  >
                    {emailing ? 'Sending...' : 'Email Tickets'}
                  </Button>
                </>
              )}
              {booking.booking_status === 'completed' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement review functionality
                    console.log('Leave review for booking:', booking.id);
                  }}
                >
                  Leave Review
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              {canCancel && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleCancelBooking}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {showCancelModal && (
        <CancelBookingModal
          booking={booking}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onCancelComplete={handleCancelComplete}
        />
      )}
    </>
  );
};