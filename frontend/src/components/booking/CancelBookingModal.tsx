import React, { useState } from 'react';
import { Modal, Button, TextArea, Card } from '../ui';
import { bookingService } from '../../services/booking';
import type { Booking } from '../../types/booking';

interface CancelBookingModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onCancelComplete: () => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onCancelComplete
}) => {
  const [reason, setReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getEventTitle = (booking: Booking) => {
    if (booking.event_details?.title) {
      return booking.event_details.title;
    }
    if (booking.showtime_details?.movie?.title) {
      return booking.showtime_details.movie.title;
    }
    return `${booking.booking_type} Booking`;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateRefundAmount = () => {
    const eventDate = new Date(getEventDateTime(booking));
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Refund policy logic (this would typically come from the backend)
    if (hoursUntilEvent >= 48) {
      return booking.total_amount; // Full refund
    } else if (hoursUntilEvent >= 24) {
      return booking.total_amount * 0.8; // 80% refund
    } else if (hoursUntilEvent >= 2) {
      return booking.total_amount * 0.5; // 50% refund
    } else {
      return 0; // No refund
    }
  };

  const getRefundPolicy = () => {
    const eventDate = new Date(getEventDateTime(booking));
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent >= 48) {
      return "Full refund available (48+ hours before event)";
    } else if (hoursUntilEvent >= 24) {
      return "80% refund available (24-48 hours before event)";
    } else if (hoursUntilEvent >= 2) {
      return "50% refund available (2-24 hours before event)";
    } else {
      return "No refund available (less than 2 hours before event)";
    }
  };

  const refundAmount = calculateRefundAmount();
  const refundPolicy = getRefundPolicy();

  const handleCancel = async () => {
    setLoading(true);
    setError('');

    try {
      await bookingService.cancelBooking(booking.id, {
        reason: reason.trim() || undefined,
        refund_requested: requestRefund && refundAmount > 0
      });

      onCancelComplete();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      setError(error.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Cancel Booking" 
      size="md"
    >
      <div className="space-y-6">
        {/* Booking Summary */}
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                You are about to cancel this booking
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="font-medium">{getEventTitle(booking)}</p>
                <p>{formatDate(getEventDateTime(booking))}</p>
                <p>Booking Reference: {booking.booking_reference}</p>
                <p>Total Amount: ${booking.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Refund Information */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Refund Information</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Refund Policy:</span>
              <span className="text-sm font-medium">{refundPolicy}</span>
            </div>
            {refundAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Refund Amount:</span>
                <span className="text-lg font-semibold text-green-600">
                  ${refundAmount.toFixed(2)}
                </span>
              </div>
            )}
            {refundAmount === 0 && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                No refund is available for cancellations made less than 2 hours before the event.
              </div>
            )}
          </div>

          {refundAmount > 0 && (
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requestRefund}
                  onChange={(e) => setRequestRefund(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Request refund (${refundAmount.toFixed(2)})
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Refunds are typically processed within 3-5 business days.
              </p>
            </div>
          )}
        </Card>

        {/* Cancellation Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for cancellation (optional)
          </label>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please let us know why you're cancelling this booking..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {reason.length}/500 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Keep Booking
          </Button>
          <Button
            variant="primary"
            onClick={handleCancel}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {loading ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};