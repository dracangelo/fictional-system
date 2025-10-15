import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { SeatButton } from './SeatButton';
import { LiveRegion } from '../common/LiveRegion';
import { ScreenReaderOnly } from '../common/ScreenReaderOnly';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { announceToScreenReader, formatNumberForScreenReader } from '../../utils/accessibility';
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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  const [focusedSeat, setFocusedSeat] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const seatMapRef = useRef<HTMLDivElement>(null);

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

  // Keyboard navigation for seat selection
  const navigateSeats = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!focusedSeat) {
      // Focus first available seat
      const firstAvailable = seats.find(seat => seat.status === 'available')
      if (firstAvailable) {
        setFocusedSeat(firstAvailable.id)
        setAnnouncement(`Focused on seat ${firstAvailable.id}, ${firstAvailable.category}, ${firstAvailable.price} dollars`)
      }
      return
    }

    const currentSeat = seats.find(seat => seat.id === focusedSeat)
    if (!currentSeat) return

    const currentRow = currentSeat.row
    const currentNumber = currentSeat.number
    let targetSeat: Seat | undefined

    switch (direction) {
      case 'left':
        targetSeat = seats.find(seat => 
          seat.row === currentRow && 
          seat.number === currentNumber - 1
        )
        break
      case 'right':
        targetSeat = seats.find(seat => 
          seat.row === currentRow && 
          seat.number === currentNumber + 1
        )
        break
      case 'up':
        const prevRowLetter = String.fromCharCode(currentRow.charCodeAt(0) - 1)
        targetSeat = seats.find(seat => 
          seat.row === prevRowLetter && 
          seat.number === currentNumber
        )
        break
      case 'down':
        const nextRowLetter = String.fromCharCode(currentRow.charCodeAt(0) + 1)
        targetSeat = seats.find(seat => 
          seat.row === nextRowLetter && 
          seat.number === currentNumber
        )
        break
    }

    if (targetSeat) {
      setFocusedSeat(targetSeat.id)
      const statusText = targetSeat.status === 'available' ? 'available' : 
                        targetSeat.status === 'selected' ? 'selected' : 
                        targetSeat.status === 'booked' ? 'booked' : 'unavailable'
      setAnnouncement(`Seat ${targetSeat.id}, ${targetSeat.category}, ${statusText}, ${targetSeat.price} dollars`)
    }
  }, [focusedSeat, seats])

  const selectFocusedSeat = useCallback(() => {
    if (!focusedSeat) return
    const seat = seats.find(s => s.id === focusedSeat)
    if (seat && (seat.status === 'available' || seat.status === 'selected')) {
      handleSeatClick(seat)
    }
  }, [focusedSeat, seats])

  useKeyboardNavigation(true, {
    onArrowUp: () => navigateSeats('up'),
    onArrowDown: () => navigateSeats('down'),
    onArrowLeft: () => navigateSeats('left'),
    onArrowRight: () => navigateSeats('right'),
    onEnter: selectFocusedSeat,
    onSpace: selectFocusedSeat,
    preventDefault: true
  })

  const handleSeatClick = async (clickedSeat: Seat) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const isCurrentlySelected = selectedSeats.some(seat => seat.id === clickedSeat.id);
      let newSelectedSeats: Seat[];
      let announcementText: string;
      
      if (isCurrentlySelected) {
        // Deselect seat
        newSelectedSeats = selectedSeats.filter(seat => seat.id !== clickedSeat.id);
        announcementText = `Seat ${clickedSeat.id} deselected. ${formatNumberForScreenReader(newSelectedSeats.length)} seats selected.`;
      } else {
        // Select seat (check max limit)
        if (selectedSeats.length >= maxSeats) {
          const maxSeatsText = formatNumberForScreenReader(maxSeats);
          setAnnouncement(`Maximum ${maxSeatsText} seats can be selected. Please deselect a seat first.`);
          setIsProcessing(false);
          return;
        }
        newSelectedSeats = [...selectedSeats, { ...clickedSeat, status: 'selected' }];
        announcementText = `Seat ${clickedSeat.id} selected. ${formatNumberForScreenReader(newSelectedSeats.length)} seats selected.`;
      }
      
      // Update local state immediately for responsive UI
      onSeatSelection(newSelectedSeats);
      setAnnouncement(announcementText);
      
      // Lock/unlock seats on the server if handler is provided
      if (onSeatLock) {
        await onSeatLock(newSelectedSeats);
      }
    } catch (error) {
      console.error('Error handling seat selection:', error);
      setAnnouncement('Error selecting seat. Please try again.');
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
      <div 
        key={rowLetter} 
        className="flex items-center justify-center gap-4 mb-2"
        role="row"
        aria-label={`Row ${rowLetter}`}
      >
        {/* Row label */}
        <div 
          className="w-6 text-center text-sm font-medium text-gray-600"
          aria-hidden="true"
        >
          {rowLetter}
        </div>
        
        {/* Left section */}
        <div className="flex gap-1" role="group" aria-label={`Row ${rowLetter} left section`}>
          {leftSection.map((seat) => (
            <SeatButton
              key={seat.id}
              seat={seat}
              onSeatClick={handleSeatClick}
              disabled={isProcessing}
              isFocused={focusedSeat === seat.id}
              onFocus={() => setFocusedSeat(seat.id)}
            />
          ))}
        </div>
        
        {/* Aisle */}
        <div className="w-8" aria-label="Aisle" />
        
        {/* Right section */}
        <div className="flex gap-1" role="group" aria-label={`Row ${rowLetter} right section`}>
          {rightSection.map((seat) => (
            <SeatButton
              key={seat.id}
              seat={seat}
              onSeatClick={handleSeatClick}
              disabled={isProcessing}
              isFocused={focusedSeat === seat.id}
              onFocus={() => setFocusedSeat(seat.id)}
            />
          ))}
        </div>
        
        {/* Row label */}
        <div 
          className="w-6 text-center text-sm font-medium text-gray-600"
          aria-hidden="true"
        >
          {rowLetter}
        </div>
      </div>
    );
  };

  // Touch and zoom handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setLastTouch({ x: distance, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      // Handle panning
      const deltaX = e.touches[0].clientX - lastTouch.x;
      const deltaY = e.touches[0].clientY - lastTouch.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scaleChange = distance / lastTouch.x;
      const newScale = Math.max(0.5, Math.min(3, scale * scaleChange));
      
      setScale(newScale);
      setLastTouch({ x: distance, y: 0 });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset zoom and position
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
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
        {/* Live region for announcements */}
        <LiveRegion 
          message={announcement} 
          priority="assertive" 
          clearAfter={3000}
        />

        {/* Screen reader instructions */}
        <ScreenReaderOnly>
          <div>
            Seat selection interface. Use arrow keys to navigate between seats, 
            Enter or Space to select or deselect seats. 
            {formatNumberForScreenReader(selectedSeats.length)} of {formatNumberForScreenReader(maxSeats)} seats selected.
          </div>
        </ScreenReaderOnly>

        {/* Mobile controls */}
        <div className="md:hidden flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Pinch to zoom, drag to pan
          </div>
          <button
            onClick={resetView}
            className="text-blue-600 text-sm font-medium"
            aria-label="Reset seat map view to default position and zoom"
          >
            Reset View
          </button>
        </div>

        {/* Screen indicator */}
        <div className="text-center" role="img" aria-label="Movie screen location">
          <div className="inline-block bg-gray-800 text-white px-8 py-2 rounded-b-lg text-sm font-medium">
            SCREEN
          </div>
          <div className="mt-2 text-xs text-gray-500">
            All seats have a great view of the screen
          </div>
        </div>
        
        {/* Seat grid container */}
        <div 
          ref={containerRef}
          className="overflow-hidden touch-none"
          style={{ height: '400px' }}
          role="application"
          aria-label="Interactive seat map"
          aria-describedby="seat-map-instructions"
        >
          <div
            id="seat-map-instructions"
            className="sr-only"
          >
            Use arrow keys to navigate seats, Enter or Space to select. 
            {selectedSeats.length} of {maxSeats} seats currently selected.
          </div>
          
          <div
            ref={seatMapRef}
            className="transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="grid"
            aria-label="Theater seating chart"
          >
            <div className="inline-block min-w-full">
              {sortedRows.map(row => renderSeatRow(rowGroups[row], row))}
            </div>
          </div>
        </div>
        
        {/* Selection info */}
        <div 
          className="text-center text-sm text-gray-600"
          aria-live="polite"
          aria-atomic="true"
        >
          {selectedSeats.length > 0 ? (
            <span>
              {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
              {maxSeats && ` (${maxSeats - selectedSeats.length} remaining)`}
            </span>
          ) : (
            <span className="block md:inline">
              <span className="md:hidden">Tap seats to select • </span>
              <span className="hidden md:inline">Click on available seats to select them</span>
            </span>
          )}
        </div>
        
        {isProcessing && (
          <div className="text-center" aria-live="polite">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-gray-600">Processing selection...</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export { SeatMap };