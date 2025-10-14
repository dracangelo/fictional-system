export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'event_owner' | 'theater_owner' | 'admin';
  preferences: UserPreferences;
}

export interface UserPreferences {
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  favoriteGenres: string[];
  preferredLocations: string[];
  accessibilityNeeds: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'event_owner' | 'theater_owner';
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (data: PasswordResetConfirm) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export interface TokenData {
  token: string;
  refreshToken: string;
  expiresAt: number;
}