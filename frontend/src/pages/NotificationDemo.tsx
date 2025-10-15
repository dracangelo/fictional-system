import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationPreferences } from '../components/common/NotificationPreferences';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const NotificationDemo: React.FC = () => {
  const { 
    state, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    addSystemBanner,
    clearAllNotifications 
  } = useNotifications();
  
  const [counter, setCounter] = useState(1);

  const handleShowSuccess = () => {
    showSuccess(
      'Success!', 
      `This is success notification #${counter}`,
      5000
    );
    setCounter(c => c + 1);
  };

  const handleShowError = () => {
    showError(
      'Error Occurred', 
      `This is error notification #${counter}. This one is persistent.`,
      true
    );
    setCounter(c => c + 1);
  };

  const handleShowWarning = () => {
    showWarning(
      'Warning', 
      `This is warning notification #${counter}`,
      6000
    );
    setCounter(c => c + 1);
  };

  const handleShowInfo = () => {
    showInfo(
      'Information', 
      `This is info notification #${counter}`,
      4000
    );
    setCounter(c => c + 1);
  };

  const handleShowWithActions = () => {
    const notification = {
      type: 'info' as const,
      title: 'Action Required',
      message: 'Would you like to proceed with this action?',
      duration: 10000,
      actions: [
        {
          label: 'Confirm',
          action: () => {
            showSuccess('Confirmed', 'Action was confirmed!');
          },
          variant: 'primary' as const
        },
        {
          label: 'Cancel',
          action: () => {
            showInfo('Cancelled', 'Action was cancelled.');
          },
          variant: 'secondary' as const
        }
      ]
    };
    
    const { addNotification } = useNotifications();
    addNotification(notification);
  };

  const handleAddSystemBanner = (type: 'maintenance' | 'announcement' | 'warning' | 'info') => {
    const banners = {
      maintenance: {
        type: 'maintenance' as const,
        title: 'Scheduled Maintenance',
        message: 'System will be down for maintenance from 2:00 AM to 4:00 AM UTC',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        dismissible: true,
        priority: 'high' as const
      },
      announcement: {
        type: 'announcement' as const,
        title: 'New Feature Available',
        message: 'Check out our new real-time notifications system!',
        startTime: new Date(),
        dismissible: true,
        priority: 'medium' as const
      },
      warning: {
        type: 'warning' as const,
        title: 'Service Degradation',
        message: 'Some users may experience slower response times',
        startTime: new Date(),
        dismissible: true,
        priority: 'high' as const
      },
      info: {
        type: 'info' as const,
        title: 'System Update',
        message: 'We have updated our terms of service',
        startTime: new Date(),
        dismissible: true,
        priority: 'low' as const
      }
    };

    addSystemBanner(banners[type]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification System Demo</h1>
          <p className="mt-2 text-gray-600">
            Test the real-time notification and WebSocket integration features.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Toast Notifications */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Toast Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active notifications:</span>
                <Badge variant="secondary">{state.notifications.length}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleShowSuccess} variant="outline" size="sm">
                  Show Success
                </Button>
                <Button onClick={handleShowError} variant="outline" size="sm">
                  Show Error
                </Button>
                <Button onClick={handleShowWarning} variant="outline" size="sm">
                  Show Warning
                </Button>
                <Button onClick={handleShowInfo} variant="outline" size="sm">
                  Show Info
                </Button>
              </div>

              <Button 
                onClick={handleShowWithActions} 
                variant="outline" 
                className="w-full"
              >
                Show with Actions
              </Button>

              {state.notifications.length > 0 && (
                <Button 
                  onClick={clearAllNotifications} 
                  variant="destructive" 
                  size="sm"
                  className="w-full"
                >
                  Clear All Notifications
                </Button>
              )}
            </div>
          </Card>

          {/* System Banners */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Banners</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active banners:</span>
                <Badge variant="secondary">{state.systemBanners.length}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => handleAddSystemBanner('maintenance')} 
                  variant="outline" 
                  size="sm"
                >
                  Maintenance
                </Button>
                <Button 
                  onClick={() => handleAddSystemBanner('announcement')} 
                  variant="outline" 
                  size="sm"
                >
                  Announcement
                </Button>
                <Button 
                  onClick={() => handleAddSystemBanner('warning')} 
                  variant="outline" 
                  size="sm"
                >
                  Warning
                </Button>
                <Button 
                  onClick={() => handleAddSystemBanner('info')} 
                  variant="outline" 
                  size="sm"
                >
                  Info
                </Button>
              </div>
            </div>
          </Card>

          {/* Connection Status */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">WebSocket Connection</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection Status:</span>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    state.isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <Badge variant={state.isConnected ? 'success' : 'destructive'}>
                    {state.isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>
                  The WebSocket connection enables real-time notifications for:
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Seat availability updates</li>
                  <li>Booking confirmations</li>
                  <li>System announcements</li>
                  <li>User-specific notifications</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Notification Preferences */}
          <div className="lg:col-span-1">
            <NotificationPreferences />
          </div>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Instructions</h2>
          <div className="prose prose-sm max-w-none">
            <h3>Toast Notifications</h3>
            <ul>
              <li><strong>Success:</strong> Auto-dismisses after 5 seconds</li>
              <li><strong>Error:</strong> Persistent (must be manually closed)</li>
              <li><strong>Warning:</strong> Auto-dismisses after 6 seconds</li>
              <li><strong>Info:</strong> Auto-dismisses after 4 seconds</li>
              <li><strong>With Actions:</strong> Includes interactive buttons</li>
            </ul>

            <h3>System Banners</h3>
            <ul>
              <li><strong>Maintenance:</strong> High priority, orange styling</li>
              <li><strong>Announcement:</strong> Medium priority, blue styling</li>
              <li><strong>Warning:</strong> High priority, yellow styling</li>
              <li><strong>Info:</strong> Low priority, gray styling</li>
            </ul>

            <h3>Real-time Features</h3>
            <ul>
              <li>WebSocket connection for live updates</li>
              <li>Automatic reconnection on connection loss</li>
              <li>User preference-based filtering</li>
              <li>Room-based notifications for specific events</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};