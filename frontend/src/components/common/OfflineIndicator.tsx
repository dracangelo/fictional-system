import React, { useState, useEffect } from 'react';
import { useOfflineStatus, useOfflineActions } from '../../hooks/useOffline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({ className, showDetails = false }: OfflineIndicatorProps) {
  const isOffline = useOfflineStatus();
  const { pendingActions, clearAllActions } = useOfflineActions();
  const [showBanner, setShowBanner] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShowBanner(true);
    } else {
      // Hide banner after a short delay when coming back online
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!showBanner && !showDetails) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {showBanner && (
        <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
          <div className={`p-3 text-center text-white transition-colors duration-300 ${
            isOffline 
              ? 'bg-red-600' 
              : 'bg-green-600'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isOffline ? 'bg-red-300' : 'bg-green-300'
              }`} />
              <span className="text-sm font-medium">
                {isOffline 
                  ? 'You are currently offline' 
                  : 'Connection restored'
                }
              </span>
              {pendingActions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingActions.length} pending
                </Badge>
              )}
              {pendingActions.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowQueue(true)}
                  className="text-white hover:bg-white/20"
                >
                  View Queue
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offline Queue Modal */}
      {showQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md max-h-96 overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Offline Actions Queue</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowQueue(false)}
                >
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                These actions will be processed when you're back online
              </p>
            </div>
            
            <div className="p-4 max-h-64 overflow-y-auto">
              {pendingActions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No pending actions
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {getActionDescription(action.url, action.options.method)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="outline" size="sm">
                        {action.options.method || 'GET'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {pendingActions.length > 0 && (
              <div className="p-4 border-t">
                <Button
                  onClick={clearAllActions}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Clear All Actions
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

// Network Status Hook with more detailed information
export function useNetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: navigator.onLine,
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      setNetworkInfo({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 100,
      });
    };

    const handleOnline = () => updateNetworkInfo();
    const handleOffline = () => updateNetworkInfo();
    const handleConnectionChange = () => updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial update
    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkInfo;
}

// Network Quality Indicator
export function NetworkQualityIndicator({ className }: { className?: string }) {
  const networkInfo = useNetworkStatus();
  
  const getQualityColor = () => {
    if (!networkInfo.isOnline) return 'text-red-500';
    if (networkInfo.rtt > 1000) return 'text-red-500';
    if (networkInfo.rtt > 500) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getQualityText = () => {
    if (!networkInfo.isOnline) return 'Offline';
    if (networkInfo.rtt > 1000) return 'Poor';
    if (networkInfo.rtt > 500) return 'Fair';
    return 'Good';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getQualityColor().replace('text-', 'bg-')}`} />
      <span className={`text-xs ${getQualityColor()}`}>
        {getQualityText()}
      </span>
      {networkInfo.isOnline && (
        <span className="text-xs text-gray-500">
          {networkInfo.effectiveType?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

// Utility function to get human-readable action descriptions
function getActionDescription(url: string, method?: string): string {
  const urlParts = url.split('/');
  const resource = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
  
  switch (method?.toUpperCase()) {
    case 'POST':
      if (url.includes('/bookings')) return 'Create booking';
      if (url.includes('/events')) return 'Create event';
      return `Create ${resource}`;
    case 'PUT':
    case 'PATCH':
      return `Update ${resource}`;
    case 'DELETE':
      return `Delete ${resource}`;
    default:
      return `Fetch ${resource}`;
  }
}

// Offline Action Queue Manager Component
export function OfflineActionQueue() {
  const { pendingActions, clearAllActions } = useOfflineActions();
  const isOffline = useOfflineStatus();
  const [isProcessing, setIsProcessing] = useState(false);

  const processPendingActions = async () => {
    if (isOffline || pendingActions.length === 0) return;

    setIsProcessing(true);
    
    try {
      // Process actions sequentially to avoid overwhelming the server
      for (const action of pendingActions) {
        try {
          await fetch(action.url, action.options);
          // Remove successful action from queue
          // This would be handled by the useOfflineActions hook
        } catch (error) {
          console.error('Failed to process offline action:', error);
          // Keep failed actions in queue for retry
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-process when coming back online
  useEffect(() => {
    if (!isOffline && pendingActions.length > 0) {
      processPendingActions();
    }
  }, [isOffline, pendingActions.length]);

  if (pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="p-3 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {pendingActions.length} pending actions
          </span>
          <Badge variant={isOffline ? 'destructive' : 'secondary'} size="sm">
            {isOffline ? 'Offline' : 'Online'}
          </Badge>
        </div>
        
        {!isOffline && (
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={processPendingActions}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Sync Now'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearAllActions}
            >
              Clear
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}