import { apiClient } from '../api';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '../../types/auth';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login/', credentials);
    
    // Store tokens and user data
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register/', data);
    
    // Store tokens and user data
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/password-reset/', { email });
  }

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    await apiClient.post('/auth/password-reset/confirm/', data);
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ access: string; refresh: string }>(
      '/auth/refresh/',
      { refresh: refreshToken }
    );

    localStorage.setItem('token', response.access);
    localStorage.setItem('refreshToken', response.refresh);
    
    return response.access;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiClient.get<User>('/auth/profile/');
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      return null;
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const user = await apiClient.patch<User>('/auth/profile/', data);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getStoredUser();
    return user ? roles.includes(user.role) : false;
  }
}

export const authService = new AuthService();