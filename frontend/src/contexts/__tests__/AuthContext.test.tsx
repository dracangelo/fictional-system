import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../services/auth';

// Mock the auth service
vi.mock('../../services/auth', () => ({
  authService: {
    getStoredUser: vi.fn(),
    getStoredToken: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-info">
        {user ? `Welcome ${user.firstName}` : 'Not logged in'}
      </div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide auth context to children', async () => {
    (authService.getStoredUser as any).mockReturnValue(null);
    (authService.getStoredToken as any).mockReturnValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });

  it('should initialize with stored user if valid token exists', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    (authService.getStoredUser as any).mockReturnValue(mockUser);
    (authService.getStoredToken as any).mockReturnValue('valid-token');
    (authService.getCurrentUser as any).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome John')).toBeInTheDocument();
    });
  });

  it('should clear auth data if token is invalid', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    (authService.getStoredUser as any).mockReturnValue(mockUser);
    (authService.getStoredToken as any).mockReturnValue('invalid-token');
    (authService.getCurrentUser as any).mockResolvedValue(null);
    (authService.logout as any).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    expect(authService.logout).toHaveBeenCalled();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should handle login success', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    const mockAuthResponse = {
      user: mockUser,
      token: 'new-token',
      refreshToken: 'new-refresh-token',
    };

    (authService.getStoredUser as any).mockReturnValue(null);
    (authService.getStoredToken as any).mockReturnValue(null);
    (authService.login as any).mockResolvedValue(mockAuthResponse);

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    // Simulate login
    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });
  });

  it('should handle logout', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    (authService.getStoredUser as any).mockReturnValue(mockUser);
    (authService.getStoredToken as any).mockReturnValue('valid-token');
    (authService.getCurrentUser as any).mockResolvedValue(mockUser);
    (authService.logout as any).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome John')).toBeInTheDocument();
    });

    // Simulate logout
    const logoutButton = screen.getByText('Logout');
    logoutButton.click();

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
  });
});