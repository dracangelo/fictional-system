import React from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './Toast';
import { useNotifications } from '../../contexts/NotificationContext';
import { cn } from '../../utils/cn';

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  className?: string;
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  className
}) => {
  const { state, removeNotification } = useNotifications();

  // Limit the number of visible toasts
  const visibleNotifications = state.notifications.slice(0, maxToasts);

  if (visibleNotifications.length === 0) {
    return null;
  }

  const containerElement = (
    <div
      className={cn(
        'fixed z-50 flex flex-col space-y-2 pointer-events-none',
        positionClasses[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleNotifications.map((notification, index) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
          className={cn(
            'pointer-events-auto',
            // Add stacking effect for multiple toasts
            index > 0 && 'mt-2'
          )}
        />
      ))}
      
      {/* Show count if there are more toasts than maxToasts */}
      {state.notifications.length > maxToasts && (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            +{state.notifications.length - maxToasts} more
          </span>
        </div>
      )}
    </div>
  );

  // Render toasts in a portal to ensure they appear above all other content
  return createPortal(containerElement, document.body);
};