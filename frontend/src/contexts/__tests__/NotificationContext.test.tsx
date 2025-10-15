import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationProvider, useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { getSocketService } from '../../services/notification/socketService';

// Mock dependencies
vi.mock('../AuthContext');
vi.mock('../../services/notification/socketService');

const mockSocketService = {
  connect: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  on: vi.fn(() => vi.fn()), // Return unsubscribe function
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
};

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  role: 'customer'
};

// Test component to access the context
const TestComponent = () => {
  const {
    state,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useNotifications();

  return (
    <div>
      <div data-testid="notification-count">{state.notifications.length}</div>
      <div data-testid="connection-status">{state.isConnected ? 'connected' : 'disconnected'}</div>
      <button onClick={() => showSuccess('Success', 'Test success message')}>
        Show Success
      </button>
      <button onClick={() => showError('Error', 'Test error message')}>
        Show Error
      </button>
      <button onClick={() => showWarning('Warning', 'Test warning message')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info', 'Test info message')}>
        Show Info
      </button>
      <button onClick={() => clearAllNotifications()}>
        Clear All
      </button>
      {state.notifications.map(notification => (
        <div key={notification.id} data-testid={`notification-${notification.type}`}>
          {notification.title}: {notification.message}
        </div>
      ))}
    </div>
  );
};

describe('NotificationContext', () => {
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

  const renderWithProvider = (socketUrl?: string) => {
    return render(
      <NotificationProvider socketUrl={socketUrl}>
        <TestComponent />
      </NotificationProvider>
    );
  };

  it('should render without crashing', () => {
    renderWithProvider();
    expect(screen.getByTestId('notification-count')).toBeInTheDocument();
  });

  it('should initialize with empty notifications', () => {
    renderWithProvider();
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });

  it('should show success notification', async () => {
    renderWithProvider();
    
    const successButton = screen.getByText('Show Success');
    act(() => {
      successButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-success')).toBeInTheDocument();
      expect(screen.getByText('Success: Test success message')).toBeInTheDocument();
    });
  });

  it('should show error notification', async () => {
    renderWithProvider();
    
    const errorButton = screen.getByText('Show Error');
    act(() => {
      errorButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-error')).toBeInTheDocument();
      expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
    });
  });

  it('should show warning notification', async () => {
    renderWithProvider();
    
    const warningButton = screen.getByText('Show Warning');
    act(() => {
      warningButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-warning')).toBeInTheDocument();
      expect(screen.getByText('Warning: Test warning message')).toBeInTheDocument();
    });
  });

  it('should show info notification', async () => {
    renderWithProvider();
    
    const infoButton = screen.getByText('Show Info');
    act(() => {
      infoButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-info')).toBeInTheDocument();
      expect(screen.getByText('Info: Test info message')).toBeInTheDocument();
    });
  });

  it('should clear all notifications', async () => {
    renderWithProvider();
    
    // Add some notifications
    const successButton = screen.getByText('Show Success');
    const errorButton = screen.getByText('Show Error');
    
    act(() => {
      successButton.click();
      errorButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });

    // Clear all notifications
    const clearButton = screen.getByText('Clear All');
    act(() => {
      clearButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });
  });

  it('should connect to WebSocket when user is authenticated', async () => {
    renderWithProvider('ws://test-socket-url');

    await waitFor(() => {
      expect(mockSocketService.connect).toHaveBeenCalled();
    });
  });

  it('should not connect to WebSocket when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      token: null
    });

    renderWithProvider();

    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });

  it('should handle WebSocket user notifications', async () => {
    let userNotificationHandler: (data: any) => void;

    mockSocketService.on.mockImplementation((event, handler) => {
      if (event === 'user_notification') {
        userNotificationHandler = handler;
      }
      return vi.fn();
    });

    renderWithProvider();

    await waitFor(() => {
      expect(mockSocketService.on).toHaveBeenCalledWith('user_notification', expect.any(Function));
    });

    // Simulate receiving a user notification
    act(() => {
      userNotificationHandler!({
        type: 'success',
        title: 'WebSocket Notification',
        message: 'This came from WebSocket'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('WebSocket Notification: This came from WebSocket')).toBeInTheDocument();
    });
  });

  it('should auto-remove notifications after duration', async () => {
    vi.useFakeTimers();
    
    try {
      renderWithProvider();
      
      const successButton = screen.getByText('Show Success');
      act(() => {
        successButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
      });

      // Fast-forward time by 5 seconds (default success duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('should disconnect WebSocket on unmount', () => {
    const { unmount } = renderWithProvider();

    unmount();

    expect(mockSocketService.disconnect).toHaveBeenCalled();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');

    consoleSpy.mockRestore();
  });
});