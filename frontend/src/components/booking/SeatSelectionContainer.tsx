import React, { useState } from 'react';
import { SeatMap } from './SeatMap';
import { SeatLegend } from './SeatLegend';
import { BookingSummary } from './BookingSummary';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSeatSelection } from '../../hooks/useSeatSelection';
import type { Seat } from '../../types/seat';

export interface SeatSelectionContainerProps {
  showtimeId: string;
  movieTitle?: string;
  theaterName?: string;
  showtime?: string;
  maxSeats?: number;
  onProceedToPayment: (bookingData: any) => void;
  className?: string;
}

const SeatSelectionContainer: React.FC<SeatSelectionContainerProps> = ({
  showtimeId,
  movieTitle,
  theaterName,
  showtime,
  maxSeats = 8,
  onProceedToPayment,
  className
}) => {
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  
  const {
    selectedSeats,
    seatMapData,
    bookingSummary,
    loading,
    error,
    connectionState,
    selectSeat,
    deselectSeat,
    clearSelection,
    refreshSeatMap,
    lockExpiration
  } = useSeatSelection({
    showtimeId,
    maxSeats,
    onSeatLockExpired: (seats) => {
      console.warn('Seat lock expired for seats:', seats.map(s => s.id));
      // Could show a toast notification here
    },
    onSeatUnavailable: (seats) => {
      console.warn('Seats became unavailable:', seats.map(s => s.id));
      // Could show a toast notification here
    }
  });

  const handleSeatClick = async (seat: Seat) => {
    try {
      const isSelected = selectedSeats.some(s => s.id === seat.id);
      
      if (isSelected) {
        await deselectSeat(seat.id);
      } else {
        await selectSeat(seat);
      }
    } catch (err) {
      console.error('Error handling seat selection:', err);
      // Could show error toast here
    }
  };

  const handleProceedToPayment = () => {
    if (bookingSummary) {
      onProceedToPayment({
        showtimeId,
        selectedSeats,
        bookingSummary,
        lockExpiration
      });
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Live Updates Active';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const formatTimeRemaining = () => {
    if (!lockExpiration) return null;
    
    const now = new Date();
    const remaining = lockExpiration.getTime() - now.getTime();
    
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Card className={className} padding="lg">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <h3 className="text-lg font-semibold">Error Loading Seat Map</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <Button onClick={refreshSeatMap} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat Map Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header with connection status */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Select Your Seats
            </h2>
            
            <div className="flex items-center gap-3">
              {/* Lock expiration timer */}
              {lockExpiration && (
                <div className="text-sm text-gray-600">
                  Seats held: {formatTimeRemaining()}
                </div>
              )}
              
              {/* Connection status */}
              <button
                onClick={() => setShowConnectionStatus(!showConnectionStatus)}
                className="flex items-center gap-2"
              >
                <Badge variant={getConnectionStatusColor()} className="text-xs">
                  {getConnectionStatusText()}
                </Badge>
              </button>
            </div>
          </div>

          {/* Connection status details */}
          {showConnectionStatus && (
            <Card padding="sm" className="bg-blue-50 border-blue-200">
              <div className="text-sm text-blue-800">
                <p className="font-medium">Real-time Updates</p>
                <p className="text-xs mt-1">
                  {connectionState === 'connected' 
                    ? 'You\'ll see live seat availability updates from other users.'
                    : 'Seat availability may not be current. Please refresh if needed.'
                  }
                </p>
              </div>
            </Card>
          )}
          
          {/* Seat Map */}
          {seatMapData && (
            <SeatMap
              showtimeId={showtimeId}
              seatMapData={seatMapData}
              selectedSeats={selectedSeats}
              onSeatSelection={(seats) => {
                // This is handled by individual seat clicks
                // but could be used for bulk operations
              }}
              maxSeats={maxSeats}
              loading={loading}
            />
          )}
          
          {/* Seat Legend */}
          <SeatLegend />
        </div>
        
        {/* Booking Summary Section */}
        <div className="space-y-4">
          {bookingSummary && (
            <BookingSummary
              data={{
                ...bookingSummary,
                movieTitle,
                theaterName,
                showtime
              }}
              onProceedToPayment={handleProceedToPayment}
              onClearSelection={clearSelection}
              loading={loading}
            />
          )}
          
          {/* Additional Actions */}
          <Card padding="sm">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSeatMap}
                className="w-full"
                disabled={loading}
              >
                Refresh Seat Map
              </Button>
              
              {selectedSeats.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="w-full text-red-600 hover:text-red-700"
                >
                  Clear All Selections
                </Button>
              )}
            </div>
          </Card>
          
          {/* Help Text */}
          <Card padding="sm" className="bg-gray-50">
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-medium">Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>VIP seats offer premium comfort</li>
                <li>Seats are automatically held during selection</li>
                <li>Complete your booking within 10 minutes</li>
                <li>Best views are in the center sections</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { SeatSelectionContainer };