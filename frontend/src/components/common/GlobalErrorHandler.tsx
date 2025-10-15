import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { Toast } from '../ui/Toast';
import type { ApiError } from '../../types/api';
import type { Notification } from '../../types/notification';

interface ErrorContextType {
  showError: (error: string | Error | ApiError, options?: ErrorOptions) => void;
  clearError: (id?: string) => void;
  clearAllErrors: () => void;
}

interface ErrorOptions {
  id?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ErrorState extends Notification {
  // Extends the Notification interface from types
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  const showError = useCallback((
    error: string | Error | ApiError,
    options: ErrorOptions = {}
  ) => {
    const id = options.id || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let message: string;
    let title: string = 'Error';
    let type: 'error' | 'warning' | 'info' | 'success' = 'error';

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      // ApiError
      message = error.message;
      
      // Determine error type based on error code
      if (error.code === 'VALIDATION_ERROR') {
        type = 'warning';
        title = 'Validation Error';
      } else if (error.code === 'NETWORK_ERROR') {
        type = 'error';
        title = 'Network Error';
      }
    }

    const newError: ErrorState = {
      id,
      title,
      message,
      type,
      persistent: options.persistent || false,
      duration: options.duration || 5000,
      actions: options.action ? [{
        label: options.action.label,
        action: options.action.onClick,
        variant: 'primary' as const,
      }] : undefined,
      timestamp: new Date(),
    };

    setErrors(prev => {
      // Remove existing error with same ID if it exists
      const filtered = prev.filter(e => e.id !== id);
      return [...filtered, newError];
    });

    // Auto-remove non-persistent errors
    if (!options.persistent) {
      const duration = options.duration || 5000;
      setTimeout(() => {
        clearError(id);
      }, duration);
    }
  }, []);

  const clearError = useCallback((id?: string) => {
    if (id) {
      setErrors(prev => prev.filter(error => error.id !== id));
    } else {
      // Clear the most recent error
      setErrors(prev => prev.slice(0, -1));
    }
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, clearError, clearAllErrors }}>
      {children}
      
      {/* Error Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {errors.map((error) => (
          <Toast
            key={error.id}
            notification={error}
            onClose={() => clearError(error.id)}
          />
        ))}
      </div>
    </ErrorContext.Provider>
  );
}

// Utility functions for common error scenarios
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unexpected error occurred';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('connection');
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code) === 'NETWORK_ERROR';
  }
  
  return false;
}

export function isValidationError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code) === 'VALIDATION_ERROR';
  }
  
  return false;
}

// Global error handler for unhandled promise rejections and errors
export function setupGlobalErrorHandling(showError: (error: string | Error | ApiError) => void) {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (isNetworkError(event.reason)) {
      showError('Network connection error. Please check your internet connection.');
    } else {
      showError(getErrorMessage(event.reason));
    }
    
    // Prevent the default browser error handling
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    showError(getErrorMessage(event.error));
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      console.error('Resource loading error:', event.target);
      showError('Failed to load a required resource. Please refresh the page.');
    }
  }, true);
}