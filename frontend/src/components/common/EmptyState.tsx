import React from 'react';
import { Button } from '../ui/Button';
import { Search, Calendar, Frown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: 'search' | 'calendar' | 'sad' | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'search',
  action,
  className,
}) => {
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    const iconClass = 'h-12 w-12 text-gray-400 mx-auto mb-4';
    
    switch (icon) {
      case 'search':
        return <Search className={iconClass} />;
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'sad':
        return <Frown className={iconClass} />;
      default:
        return <Search className={iconClass} />;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {renderIcon()}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};