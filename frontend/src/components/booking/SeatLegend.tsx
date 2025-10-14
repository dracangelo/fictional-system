import React from 'react';
import { Card } from '../ui/Card';

interface LegendItem {
  status: 'available' | 'selected' | 'booked' | 'vip' | 'disabled';
  label: string;
  color: string;
  description?: string;
}

const legendItems: LegendItem[] = [
  {
    status: 'available',
    label: 'Available',
    color: 'bg-gray-100 border-gray-300',
    description: 'Click to select'
  },
  {
    status: 'selected',
    label: 'Selected',
    color: 'bg-blue-600 border-blue-700',
    description: 'Your selection'
  },
  {
    status: 'booked',
    label: 'Unavailable',
    color: 'bg-red-100 border-red-300',
    description: 'Already booked'
  },
  {
    status: 'vip',
    label: 'VIP',
    color: 'bg-gradient-to-b from-amber-50 to-amber-100 border-amber-400',
    description: 'Premium seating'
  },
  {
    status: 'disabled',
    label: 'Not Available',
    color: 'bg-gray-50 border-gray-200 opacity-50',
    description: 'Wheelchair accessible or maintenance'
  }
];

export interface SeatLegendProps {
  className?: string;
  compact?: boolean;
}

const SeatLegend: React.FC<SeatLegendProps> = ({ className, compact = false }) => {
  return (
    <Card className={className} padding="sm">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Seat Legend</h3>
        
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {legendItems.map((item) => (
            <div key={item.status} className="flex items-center gap-3">
              <div 
                className={`w-6 h-6 rounded-t-lg border-2 flex items-center justify-center text-xs ${item.color}`}
              >
                {item.status === 'vip' && (
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {item.label}
                </div>
                {!compact && item.description && (
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {!compact && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Click on available seats to select them. VIP seats offer premium comfort and amenities.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export { SeatLegend };