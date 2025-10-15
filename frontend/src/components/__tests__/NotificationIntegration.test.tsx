import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { ToastContainer } from '../ui/ToastContainer';
import { SystemBannerContainer } from '../ui/SystemBannerContainer';
import { useAuth } from '../../contexts/AuthContext';
import { getSocketService } from '../../services/notification/socketService';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/notification/socketService');

const mockSocketService = {
  connect: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  on: vi.fn(() => vi.fn()),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
};

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  role: 'customer'
};

// Test app component that includes all notification components
const TestApp = () => {
  return (
    <NotificationProvider socketUrl="ws://test-socket">
      <div>
        <SystemBannerContainer />
        <div>Main App Content</div>
        <ToastContainer />
      </div>
    </NotificationProvider>
  );
};

describe('Notification Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSocketService as any).mockReturnValue(mockSocketService);
    (useAuth as any).mockReturnValue({
      user: mockUser,
      token: 'mock-token'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render complete notification system', () => {
    render(<TestApp />);
    
    expect(screen.getByText('Main App Content')).toBeInTheDocument();
  });

  it('should establish WebSocket connection on mount', async () => {
    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.connect).toHaveBeenCalled();
    });
  });

  it('should handle real-time user notifications', async () => {
    let userNotificationHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'user_notification') {
        userNotificationHandler = handler;
      }
      return vi.fn();
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('user_notification', expect.any(Function));
    });

    // Simulate receiving a user notification
    act(() => {
      userNotificationHandler!({
        type: 'success',
        title: 'Booking Confirmed',
        message: 'Your booking has been confirmed'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Your booking has been confirmed')).toBeInTheDocument();
    });
  });

  it('should handle real-time system announcements', async () => {
    let systemAnnouncementHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'system_announcement') {
        systemAnnouncementHandler = handler;
      }
      return vi.fn();
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('system_announcement', expect.any(Function));
    });

    // Simulate receiving a system announcement
    act(() => {
      systemAnnouncementHandler!({
        id: 'banner-1',
        type: 'maintenance',
        title: 'Scheduled Maintenance',
        message: 'System will be down for maintenance',
        startTime: new Date(),
        dismissible: true,
        priority: 'high'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument();
      expect(screen.getByText(/System will be down for maintenance/)).toBeInTheDocument();
    });
  });

  it('should handle real-time seat updates', async () => {
    let seatUpdateHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'seat_update') {
        seatUpdateHandler = handler;
      }
      return vi.fn();
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('seat_update', expect.any(Function));
    });

    // Simulate receiving a seat update
    act(() => {
      seatUpdateHandler!({
        showtimeId: 'showtime123',
        seatNumber: 'A1',
        status: 'booked'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Seat Update')).toBeInTheDocument();
      expect(screen.getByText('Seat A1 is now booked')).toBeInTheDocument();
    });
  });

  it('should handle real-time booking updates', async () => {
    let bookingUpdateHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'booking_update') {
        bookingUpdateHandler = handler;
      }
      return vi.fn();
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('booking_update', expect.any(Function));
    });

    // Simulate receiving a booking update
    act(() => {
      bookingUpdateHandler!({
        bookingId: 'booking123',
        status: 'confirmed',
        message: 'Payment processed successfully'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Payment processed successfully')).toBeInTheDocument();
    });
  });

  it('should not show notifications when user preferences disable them', async () => {
    let userNotificationHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'user_notification') {
        userNotificationHandler = handler;
      }
      return vi.fn();
    });

    // Mock user with disabled in-app notifications
    (useAuth as any).mockReturnValue({
      user: { ...mockUser, preferences: { inApp: false } },
      token: 'mock-token'
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('user_notification', expect.any(Function));
    });

    // Simulate receiving a user notification
    act(() => {
      userNotificationHandler!({
        type: 'success',
        title: 'Should Not Show',
        message: 'This should not appear'
      });
    });

    // Wait a bit and ensure notification doesn't appear
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByText('Should Not Show')).not.toBeInTheDocument();
  });

  it('should disconnect WebSocket on unmount', () => {
    const { unmount } = render(<TestApp />);

    unmount();

    expect(mockSocketService.disconnect).toHaveBeenCalled();
  });

  it('should handle WebSocket connection errors gracefully', async () => {
    mockSocketService.connect.mockRejectedValue(new Error('Connection failed'));

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.connect).toHaveBeenCalled();
    });

    // App should still render even if WebSocket connection fails
    expect(screen.getByText('Main App Content')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should handle multiple notifications correctly', async () => {
    let userNotificationHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'user_notification') {
        userNotificationHandler = handler;
      }
      return vi.fn();
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('user_notification', expect.any(Function));
    });

    // Send multiple notifications
    act(() => {
      userNotificationHandler!({
        type: 'success',
        title: 'First Notification',
        message: 'First message'
      });
      userNotificationHandler!({
        type: 'info',
        title: 'Second Notification',
        message: 'Second message'
      });
      userNotificationHandler!({
        type: 'warning',
        title: 'Third Notification',
        message: 'Third message'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('First Notification')).toBeInTheDocument();
      expect(screen.getByText('Second Notification')).toBeInTheDocument();
      expect(screen.getByText('Third Notification')).toBeInTheDocument();
    });
  });
});