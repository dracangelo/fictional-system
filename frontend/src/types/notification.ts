export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // Auto-dismiss duration in ms
  persistent?: boolean; // Don't auto-dismiss
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

export interface SystemBanner {
  id: string;
  type: 'maintenance' | 'announcement' | 'warning' | 'info';
  title: string;
  message: string;
  startTime: Date;
  endTime?: Date;
  dismissible: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  categories: {
    bookingConfirmations: boolean;
    eventReminders: boolean;
    seatAvailability: boolean;
    systemUpdates: boolean;
    promotions: boolean;
  };
}

export interface RealTimeEvent {
  type: 'seat_update' | 'booking_update' | 'system_announcement' | 'user_notification';
  data: any;
  timestamp: string;
  eventId?: string;
  showtimeId?: string;
  userId?: string;
}

export interface SeatUpdateEvent extends RealTimeEvent {
  type: 'seat_update';
  data: {
    showtimeId: string;
    seatNumber: string;
    status: 'available' | 'selected' | 'booked' | 'locked';
    lockedBy?: string;
    lockExpiry?: string;
  };
}

export interface BookingUpdateEvent extends RealTimeEvent {
  type: 'booking_update';
  data: {
    bookingId: string;
    status: 'confirmed' | 'cancelled' | 'refunded';
    message: string;
  };
}

export interface SystemAnnouncementEvent extends RealTimeEvent {
  type: 'system_announcement';
  data: SystemBanner;
}

export interface UserNotificationEvent extends RealTimeEvent {
  type: 'user_notification';
  data: Omit<Notification, 'id' | 'timestamp'>;
}