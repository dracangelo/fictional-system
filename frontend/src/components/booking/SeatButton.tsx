import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { Seat } from '../../types/seat';

const seatButtonVariants = cva(
  'w-8 h-8 rounded-t-lg border-2 text-xs font-medium transition-all duration-200 cursor-pointer flex items-center justify-center relative',
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
    },
  }
);

export interface SeatButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof seatButtonVariants> {
  seat: Seat;
  onSeatClick: (seat: Seat) => void;
  showTooltip?: boolean;
}

const SeatButton = React.forwardRef<HTMLButtonElement, SeatButtonProps>(
  ({ className, seat, onSeatClick, showTooltip = true, ...props }, ref) => {
    const isClickable = seat.status === 'available' || seat.status === 'selected';
    
    const handleClick = () => {
      if (isClickable) {
        onSeatClick(seat);
      }
    };

    const getSeatLabel = () => {
      return `${seat.row}${seat.number}`;
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
              category: seat.category 
            }), 
            className
          )}
          onClick={handleClick}
          disabled={!isClickable || props.disabled}
          aria-label={getTooltipText()}
          title={showTooltip ? getTooltipText() : undefined}
          {...props}
        >
          {seat.number}
          
          {/* VIP indicator */}
          {seat.category === 'vip' && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-white" />
          )}
        </button>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
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