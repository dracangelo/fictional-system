import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size,
  label = 'Loading...',
  ...props
}) => {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <div
        className={spinnerVariants({ size })}
        role="status"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
};