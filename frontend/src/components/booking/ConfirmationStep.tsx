import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { bookingService } from '../../services/booking';
import type { Booking } from '../../types/booking';

export interface ConfirmationStepProps {
  booking: Booking;
  onComplete: () => void;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  booking,
  onComplete,
}) => {
  const [downloadingTickets, setDownloadingTickets] = useState(false);
  const [emailingTickets, setEmailingTickets] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const handleDownloadTickets = async () => {
    setDownloadingTickets(true);
    try {
      const blob = await bookingService.downloadTickets(booking.id, 'pdf');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tickets-${booking.booking_reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download tickets:', error);
      // You might want to show an error toast here
    } finally {
      setDownloadingTickets(false);
    }
  };

  const handleEmailTickets = async () => {
    setEmailingTickets(true);
    try {
      await bookingService.emailTickets(booking.id);
      // You might want to show a success toast here
    } catch (error) {
      console.error('Failed to email tickets:', error);
      // You might want to show an error toast here
    } finally {
      setEmailingTickets(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Success Message */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-gray-600">
          Your tickets have been successfully booked. You'll receive a confirmation email shortly.
        </p>
      </div>

      {/* Booking Details */}
      <Card className="p-6 text-left">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {booking.event_details?.title || booking.showtime_details?.movie?.title || 'Your Booking'}
              </h4>
              <p className="text-gray-600">
                {booking.event_details?.venue || booking.showtime_details?.theater?.name}
              </p>
              {(booking.event_details?.start_datetime || booking.showtime_details?.start_time) && (
                <p className="text-gray-600">
                  {formatDateTime(booking.event_details?.start_datetime || booking.showtime_details?.start_time)}
                </p>
              )}
            </div>
            <Badge variant="success">Confirmed</Badge>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Booking Reference</p>
                <p className="font-mono font-medium">{booking.booking_reference}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Amount</p>
                <p className="font-medium">{formatCurrency(booking.total_amount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Payment Status</p>
                <p className="font-medium capitalize">{booking.payment_status}</p>
              </div>
              <div>
                <p className="text-gray-500">Number of Tickets</p>
                <p className="font-medium">{booking.tickets?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          {booking.tickets && booking.tickets.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Your Tickets</h5>
              <div className="space-y-2">
                {booking.tickets.map((ticket, index) => (
                  <div key={ticket.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Ticket #{index + 1}</p>
                      {ticket.seat_number && (
                        <p className="text-sm text-gray-600">Seat: {ticket.seat_number}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(ticket.price)}</p>
                      <p className="text-xs text-gray-500 font-mono">{ticket.ticket_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Ticket Actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleDownloadTickets}
            loading={downloadingTickets}
            leftIcon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Download Tickets
          </Button>
          
          <Button
            variant="outline"
            onClick={handleEmailTickets}
            loading={emailingTickets}
            leftIcon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          >
            Email Tickets
          </Button>
        </div>

        <Button
          onClick={onComplete}
          className="w-full"
          size="lg"
        >
          View My Bookings
        </Button>
      </div>

      {/* Important Information */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-left space-y-2 text-sm text-blue-800">
          <h5 className="font-medium">Important Information:</h5>
          <ul className="space-y-1 text-xs">
            <li>• Please arrive at least 15 minutes before the event/showtime</li>
            <li>• Bring a valid ID and your booking confirmation</li>
            <li>• Tickets are non-transferable and non-refundable</li>
            <li>• Screenshots of tickets are not accepted - please present the original QR code</li>
            <li>• Contact support if you need to make any changes to your booking</li>
          </ul>
        </div>
      </Card>

      {/* Contact Support */}
      <div className="text-sm text-gray-500">
        <p>Need help? Contact our support team at</p>
        <a href="mailto:support@example.com" className="text-primary-600 hover:text-primary-700">
          support@example.com
        </a>
        <span className="mx-2">or</span>
        <a href="tel:+1-555-123-4567" className="text-primary-600 hover:text-primary-700">
          +1 (555) 123-4567
        </a>
      </div>
    </div>
  );
};

export { ConfirmationStep };