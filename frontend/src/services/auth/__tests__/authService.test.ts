import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';
import { apiClient } from '../../api';

// Mock the API client
vi.mock('../../api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        user: {
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
        },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const credentials = { email: 'test@example.com', password: 'password123' };
      const result = await authService.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login/', credentials);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on login failure', async () => {
      const error = new Error('Invalid credentials');
      (apiClient.post as any).mockRejectedValue(error);

      const credentials = { email: 'test@example.com', password: 'wrong-password' };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register successfully and store tokens', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'newuser@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'customer',
          preferences: {
            notificationSettings: { email: true, sms: false, push: true },
            favoriteGenres: [],
            preferredLocations: [],
            accessibilityNeeds: [],
          },
        },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'customer' as const,
      };

      const result = await authService.register(registerData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register/', registerData);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear storage', async () => {
      localStorageMock.getItem.mockReturnValue('mock-refresh-token');
      (apiClient.post as any).mockResolvedValue({});

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout/', { refresh: 'mock-refresh-token' });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });

    it('should clear storage even if API call fails', async () => {
      localStorageMock.getItem.mockReturnValue('mock-refresh-token');
      (apiClient.post as any).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token and user exist', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'mock-token';
        if (key === 'user') return JSON.stringify({ id: '1', email: 'test@example.com' });
        return null;
      });

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when token is missing', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return null;
        if (key === 'user') return JSON.stringify({ id: '1', email: 'test@example.com' });
        return null;
      });

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when user is missing', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'mock-token';
        if (key === 'user') return null;
        return null;
      });

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      const user = { id: '1', email: 'test@example.com', role: 'admin' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(user));

      expect(authService.hasRole('admin')).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const user = { id: '1', email: 'test@example.com', role: 'customer' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(user));

      expect(authService.hasRole('admin')).toBe(false);
    });

    it('should return false when no user is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(authService.hasRole('admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const user = { id: '1', email: 'test@example.com', role: 'event_owner' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(user));

      expect(authService.hasAnyRole(['admin', 'event_owner'])).toBe(true);
    });

    it('should return false when user does not have any of the specified roles', () => {
      const user = { id: '1', email: 'test@example.com', role: 'customer' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(user));

      expect(authService.hasAnyRole(['admin', 'event_owner'])).toBe(false);
    });
  });
});