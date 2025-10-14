import React from 'react';
import { cn } from '../../utils/cn';

interface EventGridProps {
  children: React.ReactNode;
  className?: string;
}

export const EventGrid: React.FC<EventGridProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
        className
      )}
    >
      {children}
    </div>
  );
};