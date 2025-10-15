import React from 'react';
import { SystemBanner } from './SystemBanner';
import { useNotifications } from '../../contexts/NotificationContext';
import { cn } from '../../utils/cn';

interface SystemBannerContainerProps {
  className?: string;
}

export const SystemBannerContainer: React.FC<SystemBannerContainerProps> = ({ className }) => {
  const { state, removeSystemBanner } = useNotifications();

  // Sort banners by priority (high -> medium -> low) and then by start time
  const sortedBanners = [...state.systemBanners].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    return b.startTime.getTime() - a.startTime.getTime();
  });

  if (sortedBanners.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)} role="region" aria-label="System announcements">
      {sortedBanners.map((banner) => (
        <SystemBanner
          key={banner.id}
          banner={banner}
          onDismiss={banner.dismissible ? removeSystemBanner : undefined}
        />
      ))}
    </div>
  );
};