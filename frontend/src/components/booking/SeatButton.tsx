import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { Seat } from '../../types/seat';

const seatButtonVariants = cva(
  'w-8 h-8 rounded-t-lg border-2 text-xs font-medium transition-all duration-200 cursor-pointer flex items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  {
    variants: {
      status: {
        available: 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-100 hover:border-blue-300',
        selected: 'bg-blue-600 border-blue-700 text-white shadow-md',
        booked: 'bg-red-100 border-red-300 text-red-700 cursor-not-allowed opacity-75',
        locked: 'bg-yellow-100 border-yellow-300 text-yellow-700 cursor-not-allowed opacity-75',
        disabled: 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50',
      },
      category: {
        regular: '',
        vip: 'border-amber-400 bg-gradient-to-b from-amber-50 to-amber-100',
        disabled: 'opacity-30',
      },
      focused: {
        true: 'ring-2 ring-blue-500 ring-offset-2',
        false: '',
      },
    },
    compoundVariants: [
      {
        status: 'available',
        category: 'vip',
        class: 'hover:from-amber-100 hover:to-amber-200 hover:border-amber-500',
      },
      {
        status: 'selected',
        category: 'vip',
        class: 'bg-gradient-to-b from-amber-500 to-amber-600 border-amber-700',
      },
    ],
    defaultVariants: {
      status: 'available',
      category: 'regular',
      focused: false,
    },
  }
);

export interface SeatButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof seatButtonVariants> {
  seat: Seat;
  onSeatClick: (seat: Seat) => void;
  showTooltip?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
}

const SeatButton = React.forwardRef<HTMLButtonElement, SeatButtonProps>(
  ({ className, seat, onSeatClick, showTooltip = true, isFocused = false, onFocus, ...props }, ref) => {
    const isClickable = seat.status === 'available' || seat.status === 'selected';
    
    const handleClick = () => {
      if (isClickable) {
        onSeatClick(seat);
      }
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const getSeatLabel = () => {
      return `${seat.row}${seat.number}`;
    };

    const getAriaLabel = () => {
      const label = getSeatLabel();
      const price = `$${seat.price.toFixed(2)}`;
      const categoryText = seat.category === 'vip' ? 'VIP seat' : 'Regular seat';
      
      switch (seat.status) {
        case 'available':
          return `Seat ${label}, ${categoryText}, ${price}, available for selection`;
        case 'selected':
          return `Seat ${label}, ${categoryText}, ${price}, currently selected`;
        case 'booked':
          return `Seat ${label}, ${categoryText}, unavailable, already booked`;
        case 'locked':
          return `Seat ${label}, ${categoryText}, temporarily held by another user`;
        case 'disabled':
          return `Seat ${label}, not available for booking`;
        default:
          return `Seat ${label}`;
      }
    };

    const getTooltipText = () => {
      const label = getSeatLabel();
      const price = `$${seat.price.toFixed(2)}`;
      
      switch (seat.status) {
        case 'available':
          return `${label} - ${seat.category.toUpperCase()} - ${price}`;
        case 'selected':
          return `${label} - Selected - ${price}`;
        case 'booked':
          return `${label} - Unavailable`;
        case 'locked':
          return `${label} - Temporarily held`;
        case 'disabled':
          return `${label} - Not available`;
        default:
          return label;
      }
    };

    return (
      <div className="relative group">
        <button
          ref={ref}
          className={cn(
            seatButtonVariants({ 
              status: seat.status, 
              category: seat.category,
              focused: isFocused
            }), 
            className
          )}
          onClick={handleClick}
          onFocus={handleFocus}
          disabled={!isClickable || props.disabled}
          aria-label={getAriaLabel()}
          aria-pressed={seat.status === 'selected'}
          aria-describedby={showTooltip ? `seat-${seat.id}-tooltip` : undefined}
          role="gridcell"
          tabIndex={isFocused ? 0 : -1}
          title={showTooltip ? getTooltipText() : undefined}
          {...props}
        >
          {seat.number}
          
          {/* VIP indicator */}
          {seat.category === 'vip' && (
            <div 
              className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-white"
              aria-hidden="true"
            />
          )}
        </button>
        
        {/* Tooltip */}
        {showTooltip && (
          <div 
            id={`seat-${seat.id}-tooltip`}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10"
            role="tooltip"
          >
            {getTooltipText()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }
);

SeatButton.displayName = 'SeatButton';

export { SeatButton, seatButtonVariants };