import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { SeatButton } from './SeatButton';
import type { Seat, SeatMapData } from '../../types/seat';

export interface SeatMapProps {
  showtimeId: string;
  seatMapData: SeatMapData;
  selectedSeats: Seat[];
  onSeatSelection: (seats: Seat[]) => void;
  onSeatLock?: (seats: Seat[]) => Promise<void>;
  maxSeats?: number;
  loading?: boolean;
  className?: string;
}

const SeatMap: React.FC<SeatMapProps> = ({
  showtimeId,
  seatMapData,
  selectedSeats,
  onSeatSelection,
  onSeatLock,
  maxSeats = 8,
  loading = false,
  className
}) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate seat layout from seat map data
  const generateSeats = useCallback(() => {
    const generatedSeats: Seat[] = [];
    
    for (let row = 1; row <= seatMapData.rows; row++) {
      const rowLetter = String.fromCharCode(64 + row); // A, B, C, etc.
      
      for (let seatNum = 1; seatNum <= seatMapData.seatsPerRow; seatNum++) {
        const seatId = `${rowLetter}${seatNum}`;
        const isVip = seatMapData.vipRows.includes(row);
        const isDisabled = seatMapData.disabledSeats.includes(seatId);
        const isBooked = seatMapData.bookedSeats.includes(seatId);
        const isLocked = seatMapData.lockedSeats.includes(seatId);
        const isSelected = selectedSeats.some(seat => seat.id === seatId);
        
        let status: Seat['status'] = 'available';
        if (isDisabled) status = 'disabled';
        else if (isBooked) status = 'booked';
        else if (isLocked) status = 'locked';
        else if (isSelected) status = 'selected';
        
        const seat: Seat = {
          id: seatId,
          row: rowLetter,
          number: seatNum,
          category: isDisabled ? 'disabled' : isVip ? 'vip' : 'regular',
          status,
          price: isVip ? seatMapData.pricing.vip : seatMapData.pricing.regular
        };
        
        generatedSeats.push(seat);
      }
    }
    
    return generatedSeats;
  }, [seatMapData, selectedSeats]);

  useEffect(() => {
    setSeats(generateSeats());
  }, [generateSeats]);

  const handleSeatClick = async (clickedSeat: Seat) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const isCurrentlySelected = selectedSeats.some(seat => seat.id === clickedSeat.id);
      let newSelectedSeats: Seat[];
      
      if (isCurrentlySelected) {
        // Deselect seat
        newSelectedSeats = selectedSeats.filter(seat => seat.id !== clickedSeat.id);
      } else {
        // Select seat (check max limit)
        if (selectedSeats.length >= maxSeats) {
          // Could show a toast notification here
          console.warn(`Maximum ${maxSeats} seats can be selected`);
          setIsProcessing(false);
          return;
        }
        newSelectedSeats = [...selectedSeats, { ...clickedSeat, status: 'selected' }];
      }
      
      // Update local state immediately for responsive UI
      onSeatSelection(newSelectedSeats);
      
      // Lock/unlock seats on the server if handler is provided
      if (onSeatLock) {
        await onSeatLock(newSelectedSeats);
      }
    } catch (error) {
      console.error('Error handling seat selection:', error);
      // Revert selection on error
      onSeatSelection(selectedSeats);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSeatRow = (rowSeats: Seat[], rowLetter: string) => {
    const leftSection = rowSeats.slice(0, Math.floor(rowSeats.length / 2));
    const rightSection = rowSeats.slice(Math.floor(rowSeats.length / 2));
    
    return (
      <div key={rowLetter} className="flex items-center justify-center gap-4 mb-2">
        {/* Row label */}
        <div className="w-6 text-center text-sm font-medium text-gray-600">
          {rowLetter}
        </div>
        
        {/* Left section */}
        <div className="flex gap-1">
          {leftSection.map((seat) => (
            <SeatButton
              key={seat.id}
              seat={seat}
              onSeatClick={handleSeatClick}
              disabled={isProcessing}
            />
          ))}
        </div>
        
        {/* Aisle */}
        <div className="w-8" />
        
        {/* Right section */}
        <div className="flex gap-1">
          {rightSection.map((seat) => (
            <SeatButton
              key={seat.id}
              seat={seat}
              onSeatClick={handleSeatClick}
              disabled={isProcessing}
            />
          ))}
        </div>
        
        {/* Row label */}
        <div className="w-6 text-center text-sm font-medium text-gray-600">
          {rowLetter}
        </div>
      </div>
    );
  };

  const groupSeatsByRow = () => {
    const rowGroups: { [key: string]: Seat[] } = {};
    
    seats.forEach(seat => {
      if (!rowGroups[seat.row]) {
        rowGroups[seat.row] = [];
      }
      rowGroups[seat.row].push(seat);
    });
    
    // Sort seats within each row by number
    Object.keys(rowGroups).forEach(row => {
      rowGroups[row].sort((a, b) => a.number - b.number);
    });
    
    return rowGroups;
  };

  if (loading) {
    return (
      <Card className={className} padding="lg">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading seat map...</span>
        </div>
      </Card>
    );
  }

  const rowGroups = groupSeatsByRow();
  const sortedRows = Object.keys(rowGroups).sort();

  return (
    <Card className={className} padding="md">
      <div className="space-y-6">
        {/* Screen indicator */}
        <div className="text-center">
          <div className="inline-block bg-gray-800 text-white px-8 py-2 rounded-b-lg text-sm font-medium">
            SCREEN
          </div>
          <div className="mt-2 text-xs text-gray-500">
            All seats have a great view of the screen
          </div>
        </div>
        
        {/* Seat grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {sortedRows.map(row => renderSeatRow(rowGroups[row], row))}
          </div>
        </div>
        
        {/* Selection info */}
        <div className="text-center text-sm text-gray-600">
          {selectedSeats.length > 0 ? (
            <span>
              {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
              {maxSeats && ` (${maxSeats - selectedSeats.length} remaining)`}
            </span>
          ) : (
            <span>Click on available seats to select them</span>
          )}
        </div>
        
        {isProcessing && (
          <div className="text-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-gray-600">Processing selection...</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export { SeatMap };