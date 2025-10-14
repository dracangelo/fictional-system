import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userService } from '../userService';
import { apiClient } from '../../api';
import type { UserProfile, UpdateProfileData, ChangePasswordData } from '../userService';

// Mock the API client
vi.mock('../../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('profile management', () => {
    it('should get user profile', async () => {
      const mockProfile: UserProfile = {
        id: 'user1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        preferences: {
          notificationSettings: {
            email: true,
            sms: false,
            push: true,
          },
          favoriteGenres: ['action', 'comedy'],
          preferredLocations: ['New York'],
          accessibilityNeeds: [],
        },
        phone_number: '+1234567890',
      };

      mockApiClient.get.mockResolvedValue(mockProfile);

      const result = await userService.getProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/profile/');
      expect(result).toEqual(mockProfile);
    });

    it('should update user profile', async () => {
      const updateData: UpdateProfileData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone_number: '+0987654321',
      };

      const mockUpdatedProfile: UserProfile = {
        id: 'user1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'customer',
        preferences: {
          notificationSettings: {
            email: true,
            sms: false,
            push: true,
          },
          favoriteGenres: ['action', 'comedy'],
          preferredLocations: ['New York'],
          accessibilityNeeds: [],
        },
        phone_number: '+0987654321',
      };

      mockApiClient.patch.mockResolvedValue(mockUpdatedProfile);

      const result = await userService.updateProfile(updateData);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/profile/', updateData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUpdatedProfile));
      expect(result).toEqual(mockUpdatedProfile);
    });

    it('should upload profile picture', async () => {
      const mockFile = new File(['image'], 'profile.jpg', { type: 'image/jpeg' });
      const mockResponse = { profile_picture_url: 'https://example.com/profile.jpg' };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.uploadProfilePicture(mockFile);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/profile/picture/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should delete profile picture', async () => {
      const mockResponse = { success: true };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await userService.deleteProfilePicture();

      expect(mockApiClient.delete).toHaveBeenCalledWith('/auth/profile/picture/');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('password management', () => {
    it('should change password', async () => {
      const passwordData: ChangePasswordData = {
        current_password: 'oldpassword',
        new_password: 'newpassword',
        confirm_password: 'newpassword',
      };

      const mockResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.changePassword(passwordData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/change-password/', passwordData);
      expect(result).toEqual(mockResponse);
    });

    it('should verify password', async () => {
      const mockResponse = { valid: true };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.verifyPassword('password123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/verify-password/', { password: 'password123' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('preferences management', () => {
    it('should get user preferences', async () => {
      const mockPreferences = {
        notificationSettings: {
          email: true,
          sms: false,
          push: true,
        },
        favoriteGenres: ['action', 'comedy'],
        preferredLocations: ['New York'],
        accessibilityNeeds: [],
      };

      mockApiClient.get.mockResolvedValue(mockPreferences);

      const result = await userService.getPreferences();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/preferences/');
      expect(result).toEqual(mockPreferences);
    });

    it('should update user preferences', async () => {
      const updateData = {
        favoriteGenres: ['drama', 'thriller'],
        preferredLocations: ['Los Angeles', 'San Francisco'],
      };

      const mockUpdatedPreferences = {
        notificationSettings: {
          email: true,
          sms: false,
          push: true,
        },
        favoriteGenres: ['drama', 'thriller'],
        preferredLocations: ['Los Angeles', 'San Francisco'],
        accessibilityNeeds: [],
      };

      mockApiClient.patch.mockResolvedValue(mockUpdatedPreferences);

      const result = await userService.updatePreferences(updateData);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/preferences/', updateData);
      expect(result).toEqual(mockUpdatedPreferences);
    });

    it('should reset preferences', async () => {
      const mockDefaultPreferences = {
        notificationSettings: {
          email: true,
          sms: true,
          push: true,
        },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      };

      mockApiClient.post.mockResolvedValue(mockDefaultPreferences);

      const result = await userService.resetPreferences();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/preferences/reset/');
      expect(result).toEqual(mockDefaultPreferences);
    });
  });

  describe('notification settings', () => {
    it('should get notification settings', async () => {
      const mockSettings = {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        marketing_emails: false,
        booking_reminders: true,
        event_updates: true,
        price_alerts: false,
      };

      mockApiClient.get.mockResolvedValue(mockSettings);

      const result = await userService.getNotificationSettings();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/notifications/');
      expect(result).toEqual(mockSettings);
    });

    it('should update notification settings', async () => {
      const updateData = {
        email_notifications: false,
        marketing_emails: true,
      };

      const mockUpdatedSettings = {
        email_notifications: false,
        sms_notifications: false,
        push_notifications: true,
        marketing_emails: true,
        booking_reminders: true,
        event_updates: true,
        price_alerts: false,
      };

      mockApiClient.patch.mockResolvedValue(mockUpdatedSettings);

      const result = await userService.updateNotificationSettings(updateData);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/notifications/', updateData);
      expect(result).toEqual(mockUpdatedSettings);
    });
  });

  describe('account management', () => {
    it('should deactivate account', async () => {
      const mockResponse = {
        success: true,
        message: 'Account deactivated successfully',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.deactivateAccount('Not using anymore');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/deactivate/', { reason: 'Not using anymore' });
      expect(result).toEqual(mockResponse);
    });

    it('should delete account', async () => {
      const mockResponse = {
        success: true,
        message: 'Account deleted successfully',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.deleteAccount('password123', 'Privacy concerns');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/delete/', {
        password: 'password123',
        reason: 'Privacy concerns',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('user activity and stats', () => {
    it('should get user activity', async () => {
      const mockActivity = {
        results: [
          {
            id: '1',
            type: 'booking',
            description: 'Booked tickets for Concert',
            timestamp: '2024-01-01T00:00:00Z',
            metadata: { booking_id: 'booking1' },
          },
        ],
        count: 1,
        next: null,
        previous: null,
      };

      mockApiClient.get.mockResolvedValue(mockActivity);

      const result = await userService.getActivity(1, 20);

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/activity/?page=1&page_size=20');
      expect(result).toEqual(mockActivity);
    });

    it('should get user stats', async () => {
      const mockStats = {
        total_bookings: 15,
        total_spent: 750,
        favorite_genres: ['action', 'comedy'],
        preferred_venues: ['Madison Square Garden', 'Lincoln Center'],
        booking_frequency: 2.5,
        average_rating_given: 4.2,
        member_since: '2023-01-01T00:00:00Z',
        loyalty_points: 1250,
        tier: 'gold',
      };

      mockApiClient.get.mockResolvedValue(mockStats);

      const result = await userService.getUserStats();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/stats/');
      expect(result).toEqual(mockStats);
    });
  });

  describe('favorites management', () => {
    it('should get favorite events', async () => {
      const mockFavorites = ['event1', 'event2', 'event3'];

      mockApiClient.get.mockResolvedValue(mockFavorites);

      const result = await userService.getFavoriteEvents();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/favorites/events/');
      expect(result).toEqual(mockFavorites);
    });

    it('should add favorite event', async () => {
      const mockResponse = { success: true };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.addFavoriteEvent('event1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/favorites/events/', { event_id: 'event1' });
      expect(result).toEqual(mockResponse);
    });

    it('should remove favorite event', async () => {
      const mockResponse = { success: true };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await userService.removeFavoriteEvent('event1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/auth/favorites/events/event1/');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('loyalty and rewards', () => {
    it('should get loyalty points', async () => {
      const mockLoyalty = {
        points: 1250,
        tier: 'gold',
        next_tier_points: 2500,
      };

      mockApiClient.get.mockResolvedValue(mockLoyalty);

      const result = await userService.getLoyaltyPoints();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/loyalty/points/');
      expect(result).toEqual(mockLoyalty);
    });

    it('should redeem points', async () => {
      const mockResponse = {
        success: true,
        message: 'Points redeemed successfully',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.redeemPoints('reward1', 500);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/loyalty/redeem/', {
        reward_id: 'reward1',
        points: 500,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('two-factor authentication', () => {
    it('should enable two-factor authentication', async () => {
      const mockResponse = {
        qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        backup_codes: ['123456', '789012', '345678'],
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.enableTwoFactor();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/2fa/enable/');
      expect(result).toEqual(mockResponse);
    });

    it('should disable two-factor authentication', async () => {
      const mockResponse = { success: true };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.disableTwoFactor('password123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/2fa/disable/', { password: 'password123' });
      expect(result).toEqual(mockResponse);
    });

    it('should verify two-factor code', async () => {
      const mockResponse = { success: true };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.verifyTwoFactor('123456');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/2fa/verify/', { code: '123456' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle profile update errors', async () => {
      const updateData: UpdateProfileData = {
        firstName: 'Jane',
      };

      const mockError = new Error('Validation failed');
      mockApiClient.patch.mockRejectedValue(mockError);

      await expect(userService.updateProfile(updateData)).rejects.toThrow('Validation failed');
    });

    it('should handle password change errors', async () => {
      const passwordData: ChangePasswordData = {
        current_password: 'wrong',
        new_password: 'new',
        confirm_password: 'new',
      };

      const mockError = new Error('Current password is incorrect');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(userService.changePassword(passwordData)).rejects.toThrow('Current password is incorrect');
    });
  });
});