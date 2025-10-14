import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { bookingService } from '../../services/booking';
import type { CreateBookingData } from '../../types/booking';
import type { BookingSummaryData } from '../../types/seat';

export interface BookingSummaryStepProps {
  bookingData: CreateBookingData;
  summaryData: BookingSummaryData;
  onNext: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const BookingSummaryStep: React.FC<BookingSummaryStepProps> = ({
  bookingData,
  summaryData,
  onNext,
  onCancel,
  loading = false,
}) => {
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return '';
    
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

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      const result = await bookingService.validateDiscountCode(
        discountCode,
        bookingData.event,
        bookingData.showtime
      );

      if (result.valid) {
        setAppliedDiscount(result);
        setDiscountError(null);
      } else {
        setDiscountError(result.message || 'Invalid discount code');
        setAppliedDiscount(null);
      }
    } catch (error: any) {
      setDiscountError(error.response?.data?.message || 'Failed to validate discount code');
      setAppliedDiscount(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError(null);
  };

  const calculateDiscountedTotal = () => {
    if (!appliedDiscount) return summaryData.total;

    const discountAmount = appliedDiscount.discount_percentage 
      ? summaryData.subtotal * (appliedDiscount.discount_percentage / 100)
      : appliedDiscount.discount_amount;

    return Math.max(0, summaryData.total - discountAmount);
  };

  const groupSeatsByCategory = () => {
    return summaryData.selectedSeats.reduce((acc, seat) => {
      const key = seat.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(seat);
      return acc;
    }, {} as Record<string, typeof summaryData.selectedSeats>);
  };

  return (
    <div className="space-y-6">
      {/* Event/Movie Information */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {summaryData.movieTitle || 'Event Booking'}
            </h3>
            
            {summaryData.theaterName && (
              <p className="text-gray-600 mb-1">{summaryData.theaterName}</p>
            )}
            
            {summaryData.showtime && (
              <p className="text-gray-600 mb-4">{formatDateTime(summaryData.showtime)}</p>
            )}

            {bookingData.booking_type && (
              <Badge variant="outline" className="mb-4">
                {bookingData.booking_type === 'movie' ? 'Movie Ticket' : 'Event Ticket'}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Selected Seats/Tickets */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Selected Seats</h4>
        
        <div className="space-y-4">
          {Object.entries(groupSeatsByCategory()).map(([category, seats]) => (
            <div key={category} className="border-l-4 border-primary-500 pl-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={category === 'vip' ? 'secondary' : 'outline'}>
                    {category.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {seats.length} seat{seats.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="font-medium">
                  {formatCurrency(seats[0].price * seats.length)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {seats.map(seat => (
                  <span
                    key={seat.id}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded"
                  >
                    {seat.id}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Discount Code */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Discount Code</h4>
        
        {!appliedDiscount ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                error={discountError || undefined}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleApplyDiscount}
              loading={discountLoading}
              disabled={!discountCode.trim() || discountLoading}
            >
              Apply
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">
                Discount Applied: {discountCode}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeDiscount}
              className="text-green-700 hover:text-green-800"
            >
              Remove
            </Button>
          </div>
        )}
      </Card>

      {/* Price Breakdown */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Price Breakdown</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(summaryData.subtotal)}</span>
          </div>
          
          {summaryData.fees > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Service Fees</span>
              <span>{formatCurrency(summaryData.fees)}</span>
            </div>
          )}
          
          {summaryData.taxes > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Taxes</span>
              <span>{formatCurrency(summaryData.taxes)}</span>
            </div>
          )}

          {appliedDiscount && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>
                -{formatCurrency(
                  appliedDiscount.discount_percentage 
                    ? summaryData.subtotal * (appliedDiscount.discount_percentage / 100)
                    : appliedDiscount.discount_amount
                )}
              </span>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(calculateDiscountedTotal())}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={onNext}
          loading={loading}
          className="flex-1"
          size="lg"
        >
          Proceed to Payment
        </Button>
      </div>

      {/* Terms and Conditions */}
      <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-200">
        <p>• By proceeding, you agree to our Terms of Service and Privacy Policy</p>
        <p>• All sales are final - no refunds after purchase</p>
        <p>• Tickets are non-transferable and must be presented at the venue</p>
        <p>• Please arrive 15 minutes before showtime</p>
      </div>
    </div>
  );
};

export { BookingSummaryStep };