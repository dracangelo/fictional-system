import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { BookingSummaryData } from '../../types/seat';

export interface BookingSummaryProps {
  data: BookingSummaryData;
  onProceedToPayment: () => void;
  onClearSelection: () => void;
  loading?: boolean;
  className?: string;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  data,
  onProceedToPayment,
  onClearSelection,
  loading = false,
  className
}) => {
  const { selectedSeats, subtotal, fees, taxes, total, movieTitle, theaterName, showtime } = data;
  
  const hasSelection = selectedSeats.length > 0;
  
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  const groupSeatsByCategory = () => {
    const groups = selectedSeats.reduce((acc, seat) => {
      const key = seat.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(seat);
      return acc;
    }, {} as Record<string, typeof selectedSeats>);
    
    return groups;
  };

  return (
    <Card className={className} variant="elevated">
      <CardHeader>
        <CardTitle className="text-lg">Booking Summary</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Movie/Event Info */}
        {(movieTitle || theaterName || showtime) && (
          <div className="pb-4 border-b border-gray-200">
            {movieTitle && (
              <h3 className="font-semibold text-gray-900">{movieTitle}</h3>
            )}
            {theaterName && (
              <p className="text-sm text-gray-600">{theaterName}</p>
            )}
            {showtime && (
              <p className="text-sm text-gray-600">{formatDateTime(showtime)}</p>
            )}
          </div>
        )}
        
        {/* Selected Seats */}
        {hasSelection ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Selected Seats</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
            
            {Object.entries(groupSeatsByCategory()).map(([category, seats]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={category === 'vip' ? 'secondary' : 'outline'}>
                    {category.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {seats.length} seat{seats.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {seats.map(seat => (
                    <span
                      key={seat.id}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                    >
                      {seat.id}
                    </span>
                  ))}
                </div>
                
                <div className="text-sm text-gray-600">
                  {formatCurrency(seats[0].price)} × {seats.length} = {formatCurrency(seats[0].price * seats.length)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No seats selected</p>
            <p className="text-xs mt-1">Choose your seats from the map above</p>
          </div>
        )}
        
        {/* Price Breakdown */}
        {hasSelection && (
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            
            {fees > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service Fees</span>
                <span className="text-gray-900">{formatCurrency(fees)}</span>
              </div>
            )}
            
            {taxes > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxes</span>
                <span className="text-gray-900">{formatCurrency(taxes)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="pt-4 space-y-2">
          <Button
            onClick={onProceedToPayment}
            disabled={!hasSelection || loading}
            loading={loading}
            className="w-full"
            size="lg"
          >
            {hasSelection ? 'Proceed to Payment' : 'Select Seats to Continue'}
          </Button>
          
          {hasSelection && (
            <Button
              variant="outline"
              onClick={onClearSelection}
              className="w-full"
              size="sm"
            >
              Clear Selection
            </Button>
          )}
        </div>
        
        {/* Additional Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Seats are held for 10 minutes during selection</p>
          <p>• All sales are final - no refunds after purchase</p>
          <p>• Please arrive 15 minutes before showtime</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { BookingSummary };