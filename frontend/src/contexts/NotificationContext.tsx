import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  Notification, 
  SystemBanner, 
  NotificationPreferences,
  RealTimeEvent 
} from '../types/notification';
import { getSocketService } from '../services/notification/socketService';
import { useAuth } from './AuthContext';

interface NotificationState {
  notifications: Notification[];
  systemBanners: SystemBanner[];
  preferences: NotificationPreferences;
  isConnected: boolean;
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }
  | { type: 'ADD_SYSTEM_BANNER'; payload: SystemBanner }
  | { type: 'REMOVE_SYSTEM_BANNER'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<NotificationPreferences> }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean };

const initialState: NotificationState = {
  notifications: [],
  systemBanners: [],
  preferences: {
    email: true,
    sms: true,
    push: true,
    inApp: true,
    categories: {
      bookingConfirmations: true,
      eventReminders: true,
      seatAvailability: true,
      systemUpdates: true,
      promotions: false,
    },
  },
  isConnected: false,
};

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    
    case 'ADD_SYSTEM_BANNER':
      return {
        ...state,
        systemBanners: [action.payload, ...state.systemBanners],
      };
    
    case 'REMOVE_SYSTEM_BANNER':
      return {
        ...state,
        systemBanners: state.systemBanners.filter(b => b.id !== action.payload),
      };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };
    
    default:
      return state;
  }
};

interface NotificationContextType {
  state: NotificationState;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addSystemBanner: (banner: Omit<SystemBanner, 'id'>) => void;
  removeSystemBanner: (id: string) => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, persistent?: boolean) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  socketUrl?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  socketUrl = process.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000' 
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, token } = useAuth();

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remove notification if duration is specified and not persistent
    if (notification.duration && !notification.persistent) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: newNotification.id });
      }, notification.duration);
    }
  }, [generateId]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  }, []);

  // Add system banner
  const addSystemBanner = useCallback((banner: Omit<SystemBanner, 'id'>) => {
    const newBanner: SystemBanner = {
      ...banner,
      id: generateId(),
    };

    dispatch({ type: 'ADD_SYSTEM_BANNER', payload: newBanner });

    // Auto-remove banner if endTime is specified
    if (banner.endTime) {
      const timeUntilEnd = banner.endTime.getTime() - Date.now();
      if (timeUntilEnd > 0) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_SYSTEM_BANNER', payload: newBanner.id });
        }, timeUntilEnd);
      }
    }
  }, [generateId]);

  // Remove system banner
  const removeSystemBanner = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SYSTEM_BANNER', payload: id });
  }, []);

  // Update preferences
  const updatePreferences = useCallback((preferences: Partial<NotificationPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  }, []);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title: string, message: string, duration = 5000) => {
    addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, persistent = false) => {
    addNotification({ 
      type: 'error', 
      title, 
      message, 
      duration: persistent ? undefined : 8000,
      persistent 
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, duration = 6000) => {
    addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, duration = 4000) => {
    addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) return;

    const socketService = getSocketService(socketUrl, token);
    
    const connectSocket = async () => {
      try {
        await socketService.connect();
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      }
    };

    connectSocket();

    // Set up event listeners
    const unsubscribeUserNotification = socketService.on('user_notification', (data) => {
      if (state.preferences.inApp) {
        addNotification(data);
      }
    });

    const unsubscribeSystemAnnouncement = socketService.on('system_announcement', (data) => {
      if (state.preferences.categories.systemUpdates) {
        addSystemBanner(data);
      }
    });

    const unsubscribeSeatUpdate = socketService.on('seat_update', (data) => {
      if (state.preferences.categories.seatAvailability) {
        showInfo('Seat Update', `Seat ${data.seatNumber} is now ${data.status}`, 3000);
      }
    });

    const unsubscribeBookingUpdate = socketService.on('booking_update', (data) => {
      if (state.preferences.categories.bookingConfirmations) {
        const title = data.status === 'confirmed' ? 'Booking Confirmed' : 
                     data.status === 'cancelled' ? 'Booking Cancelled' : 'Booking Updated';
        showSuccess(title, data.message);
      }
    });

    return () => {
      unsubscribeUserNotification();
      unsubscribeSystemAnnouncement();
      unsubscribeSeatUpdate();
      unsubscribeBookingUpdate();
      socketService.disconnect();
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    };
  }, [user, token, socketUrl, state.preferences, addNotification, addSystemBanner, showInfo, showSuccess]);

  const contextValue: NotificationContextType = {
    state,
    addNotification,
    removeNotification,
    clearAllNotifications,
    addSystemBanner,
    removeSystemBanner,
    updatePreferences,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};