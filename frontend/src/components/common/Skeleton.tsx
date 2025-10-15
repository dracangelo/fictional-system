import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      {...props}
    />
  );
}

// Specific skeleton components for common UI patterns
export function SkeletonText({ 
  lines = 1, 
  className,
  ...props 
}: { 
  lines?: number;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('p-4 border rounded-lg space-y-3', className)} {...props}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ 
  size = 'md',
  className,
  ...props 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton
      className={cn('rounded-full', sizeClasses[size], className)}
      {...props}
    />
  );
}

export function SkeletonButton({ 
  size = 'md',
  className,
  ...props 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-28',
  };

  return (
    <Skeleton
      className={cn('rounded', sizeClasses[size], className)}
      {...props}
    />
  );
}

export function SkeletonTable({ 
  rows = 5,
  columns = 4,
  className,
  ...props 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonEventCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)} {...props}>
      {/* Image */}
      <Skeleton className="h-48 w-full" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <SkeletonText lines={2} />
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-20" />
          <SkeletonButton size="sm" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBookingCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-3', className)} {...props}>
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      <div className="flex space-x-2 pt-2">
        <SkeletonButton size="sm" />
        <SkeletonButton size="sm" />
      </div>
    </div>
  );
}

export function SkeletonSeatMap({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Screen */}
      <Skeleton className="h-8 w-full rounded-t-full" />
      
      {/* Seats */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={`seat-row-${rowIndex}`} className="flex justify-center space-x-1">
            {Array.from({ length: 12 }).map((_, seatIndex) => (
              <Skeleton
                key={`seat-${rowIndex}-${seatIndex}`}
                className="h-6 w-6 rounded"
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center space-x-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`legend-${i}`} className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <SkeletonButton />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`stat-${i}`} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="border rounded-lg p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
      
      {/* Table */}
      <div className="border rounded-lg p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  );
}