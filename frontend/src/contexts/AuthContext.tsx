import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type {
  User,
  LoginCredentials,
  RegisterData,
  PasswordResetConfirm,
  AuthContextType,
} from '../types/auth';
import { authService } from '../services/auth';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user is stored locally
      const storedUser = authService.getStoredUser();
      const token = authService.getStoredToken();

      if (storedUser && token) {
        // Verify token is still valid by fetching current user
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Token is invalid, clear storage
          await authService.logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear invalid auth data
      await authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      const response = await authService.register(data);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if API call fails
      setUser(null);
    }
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    try {
      await authService.requestPasswordReset(email);
    } catch (error) {
      throw error;
    }
  };

  const confirmPasswordReset = async (data: PasswordResetConfirm): Promise<void> => {
    try {
      await authService.confirmPasswordReset(data);
    } catch (error) {
      throw error;
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      await authService.refreshToken();
    } catch (error) {
      // If refresh fails, logout user
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};