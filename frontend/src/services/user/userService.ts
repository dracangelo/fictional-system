import { apiClient } from '../api';
import type { User, UserPreferences } from '../../types/auth';
import type { PaginatedResponse } from '../../types/api';

export interface UserProfile extends User {
  phone_number?: string;
  date_of_birth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: UserProfile['address'];
  emergency_contact?: UserProfile['emergency_contact'];
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  booking_reminders: boolean;
  event_updates: boolean;
  price_alerts: boolean;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends';
  show_booking_history: boolean;
  show_reviews: boolean;
  allow_friend_requests: boolean;
  data_sharing_consent: boolean;
}

export interface UserActivity {
  id: string;
  type: 'booking' | 'review' | 'login' | 'profile_update' | 'password_change';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserStats {
  total_bookings: number;
  total_spent: number;
  favorite_genres: string[];
  preferred_venues: string[];
  booking_frequency: number;
  average_rating_given: number;
  member_since: string;
  loyalty_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

class UserService {
  // Profile management
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/auth/profile/');
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const updatedUser = await apiClient.patch<UserProfile>('/auth/profile/', data);
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  }

  async uploadProfilePicture(file: File): Promise<{ profile_picture_url: string }> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    return apiClient.post<{ profile_picture_url: string }>('/auth/profile/picture/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteProfilePicture(): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>('/auth/profile/picture/');
  }

  // Password management
  async changePassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/change-password/', data);
  }

  async verifyPassword(password: string): Promise<{ valid: boolean }> {
    return apiClient.post<{ valid: boolean }>('/auth/verify-password/', { password });
  }

  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>('/auth/preferences/');
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return apiClient.patch<UserPreferences>('/auth/preferences/', preferences);
  }

  async resetPreferences(): Promise<UserPreferences> {
    return apiClient.post<UserPreferences>('/auth/preferences/reset/');
  }

  // Notification settings
  async getNotificationSettings(): Promise<NotificationSettings> {
    return apiClient.get<NotificationSettings>('/auth/notifications/');
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return apiClient.patch<NotificationSettings>('/auth/notifications/', settings);
  }

  // Privacy settings
  async getPrivacySettings(): Promise<PrivacySettings> {
    return apiClient.get<PrivacySettings>('/auth/privacy/');
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    return apiClient.patch<PrivacySettings>('/auth/privacy/', settings);
  }

  // Account management
  async deactivateAccount(reason?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/deactivate/', { reason });
  }

  async reactivateAccount(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/reactivate/');
  }

  async deleteAccount(password: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/delete/', { password, reason });
  }

  // User activity and history
  async getActivity(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<UserActivity>> {
    return apiClient.get<PaginatedResponse<UserActivity>>(`/auth/activity/?page=${page}&page_size=${pageSize}`);
  }

  async getUserStats(): Promise<UserStats> {
    return apiClient.get<UserStats>('/auth/stats/');
  }

  // Favorites and wishlist
  async getFavoriteEvents(): Promise<string[]> {
    return apiClient.get<string[]>('/auth/favorites/events/');
  }

  async addFavoriteEvent(eventId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/auth/favorites/events/', { event_id: eventId });
  }

  async removeFavoriteEvent(eventId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/auth/favorites/events/${eventId}/`);
  }

  async getFavoriteTheaters(): Promise<string[]> {
    return apiClient.get<string[]>('/auth/favorites/theaters/');
  }

  async addFavoriteTheater(theaterId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/auth/favorites/theaters/', { theater_id: theaterId });
  }

  async removeFavoriteTheater(theaterId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/auth/favorites/theaters/${theaterId}/`);
  }

  // Social features
  async getFriends(): Promise<User[]> {
    return apiClient.get<User[]>('/auth/friends/');
  }

  async sendFriendRequest(userId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/friends/request/', { user_id: userId });
  }

  async acceptFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`/auth/friends/requests/${requestId}/accept/`);
  }

  async rejectFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`/auth/friends/requests/${requestId}/reject/`);
  }

  async removeFriend(userId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/auth/friends/${userId}/`);
  }

  // Loyalty and rewards
  async getLoyaltyPoints(): Promise<{ points: number; tier: string; next_tier_points: number }> {
    return apiClient.get('/auth/loyalty/points/');
  }

  async getLoyaltyHistory(): Promise<Array<{
    id: string;
    type: 'earned' | 'redeemed';
    points: number;
    description: string;
    date: string;
  }>> {
    return apiClient.get('/auth/loyalty/history/');
  }

  async redeemPoints(rewardId: string, points: number): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/auth/loyalty/redeem/', { reward_id: rewardId, points });
  }

  // Data export and privacy compliance
  async exportUserData(): Promise<{ download_url: string; expires_at: string }> {
    return apiClient.post<{ download_url: string; expires_at: string }>('/auth/export-data/');
  }

  async requestDataDeletion(): Promise<{ success: boolean; message: string; deletion_date: string }> {
    return apiClient.post<{ success: boolean; message: string; deletion_date: string }>('/auth/request-deletion/');
  }

  // Email verification
  async resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/resend-verification/');
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/verify-email/', { token });
  }

  // Two-factor authentication
  async enableTwoFactor(): Promise<{ qr_code: string; backup_codes: string[] }> {
    return apiClient.post<{ qr_code: string; backup_codes: string[] }>('/auth/2fa/enable/');
  }

  async disableTwoFactor(password: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/auth/2fa/disable/', { password });
  }

  async verifyTwoFactor(code: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/auth/2fa/verify/', { code });
  }

  async generateBackupCodes(): Promise<{ backup_codes: string[] }> {
    return apiClient.post<{ backup_codes: string[] }>('/auth/2fa/backup-codes/');
  }
}

export const userService = new UserService();