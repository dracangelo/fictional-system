import React from 'react';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { SystemBanner as SystemBannerType } from '../../types';

interface SystemBannerProps {
  banner: SystemBannerType;
  onDismiss?: (id: string) => void;
  className?: string;
}

const iconMap = {
  maintenance: WrenchScrewdriverIcon,
  announcement: MegaphoneIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap = {
  maintenance: 'bg-orange-50 border-orange-200',
  announcement: 'bg-blue-50 border-blue-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-gray-50 border-gray-200',
};

const textColorMap = {
  maintenance: 'text-orange-800',
  announcement: 'text-blue-800',
  warning: 'text-yellow-800',
  info: 'text-gray-800',
};

const iconColorMap = {
  maintenance: 'text-orange-400',
  announcement: 'text-blue-400',
  warning: 'text-yellow-400',
  info: 'text-gray-400',
};

const priorityBorderMap = {
  low: 'border-l-2',
  medium: 'border-l-4',
  high: 'border-l-8',
};

export const SystemBanner: React.FC<SystemBannerProps> = ({ 
  banner, 
  onDismiss, 
  className 
}) => {
  const Icon = iconMap[banner.type];
  const now = new Date();
  
  // Don't show banner if it's not within the active time range
  if (now < banner.startTime || (banner.endTime && now > banner.endTime)) {
    return null;
  }

  const handleDismiss = () => {
    if (banner.dismissible && onDismiss) {
      onDismiss(banner.id);
    }
  };

  return (
    <div
      className={cn(
        'border-b shadow-sm',
        colorMap[banner.type],
        priorityBorderMap[banner.priority],
        className
      )}
      role="banner"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className={cn('flex p-2 rounded-lg', colorMap[banner.type])}>
              <Icon className={cn('h-6 w-6', iconColorMap[banner.type])} aria-hidden="true" />
            </span>
            <div className="ml-3 font-medium">
              <span className={cn('text-sm', textColorMap[banner.type])}>
                <strong>{banner.title}</strong>
                {banner.message && (
                  <>
                    {' - '}
                    <span className="font-normal">{banner.message}</span>
                  </>
                )}
              </span>
            </div>
          </div>
          
          {/* Show end time if available */}
          {banner.endTime && (
            <div className="flex-shrink-0 sm:ml-3">
              <span className={cn('text-xs', textColorMap[banner.type])}>
                Until {banner.endTime.toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Dismiss button */}
          {banner.dismissible && onDismiss && (
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className={cn(
                    'flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
                    banner.type === 'maintenance' && 'text-orange-800 hover:bg-orange-100 focus:ring-orange-500',
                    banner.type === 'announcement' && 'text-blue-800 hover:bg-blue-100 focus:ring-blue-500',
                    banner.type === 'warning' && 'text-yellow-800 hover:bg-yellow-100 focus:ring-yellow-500',
                    banner.type === 'info' && 'text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
                  )}
                  aria-label="Dismiss banner"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};