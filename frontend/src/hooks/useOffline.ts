import { useState, useEffect } from 'react';

/**
 * Hook for tracking online/offline status
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return isOffline;
}

/**
 * Hook for managing offline actions
 */
export function useOfflineActions() {
  const [pendingActions, setPendingActions] = useState<Array<{
    id: string;
    url: string;
    options: RequestInit;
    timestamp: number;
  }>>([]);

  const addOfflineAction = (action: {
    id: string;
    url: string;
    options: RequestInit;
  }) => {
    const actionWithTimestamp = {
      ...action,
      timestamp: Date.now(),
    };
    
    setPendingActions(prev => [...prev, actionWithTimestamp]);
    
    // Store in localStorage for persistence
    const stored = localStorage.getItem('offline-actions');
    const actions = stored ? JSON.parse(stored) : [];
    actions.push(actionWithTimestamp);
    localStorage.setItem('offline-actions', JSON.stringify(actions));
  };

  const removeOfflineAction = (id: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== id));
    
    // Remove from localStorage
    const stored = localStorage.getItem('offline-actions');
    if (stored) {
      const actions = JSON.parse(stored);
      const filtered = actions.filter((action: any) => action.id !== id);
      localStorage.setItem('offline-actions', JSON.stringify(filtered));
    }
  };

  const clearAllActions = () => {
    setPendingActions([]);
    localStorage.removeItem('offline-actions');
  };

  // Load pending actions on mount
  useEffect(() => {
    const stored = localStorage.getItem('offline-actions');
    if (stored) {
      setPendingActions(JSON.parse(stored));
    }
  }, []);

  return {
    pendingActions,
    addOfflineAction,
    removeOfflineAction,
    clearAllActions,
  };
}