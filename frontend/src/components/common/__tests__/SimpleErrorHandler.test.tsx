import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ErrorProvider, 
  useErrorHandler as useGlobalErrorHandler, 
  getErrorMessage, 
  isNetworkError, 
  isValidationError 
} from '../GlobalErrorHandler';

// Simple test component that uses the error handler
const SimpleTestComponent = () => {
  const { showError, clearError, clearAllErrors } = useGlobalErrorHandler();
  
  return (
    <div>
      <button onClick={() => showError('Test error message')}>
        Show Error
      </button>
      <button onClick={() => clearError()}>
        Clear Error
      </button>
      <button onClick={clearAllErrors}>
        Clear All Errors
      </button>
      <div>Test content</div>
    </div>
  );
};

describe('Simple Error Handler Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides error context without throwing', () => {
    render(
      <ErrorProvider>
        <SimpleTestComponent />
      </ErrorProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
  });

  it('throws error when useErrorHandler is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<SimpleTestComponent />);
    }).toThrow('useErrorHandler must be used within an ErrorProvider');
    
    consoleSpy.mockRestore();
  });

  it('can call showError without crashing', () => {
    render(
      <ErrorProvider>
        <SimpleTestComponent />
      </ErrorProvider>
    );

    // This should not throw
    fireEvent.click(screen.getByText('Show Error'));
    
    // The component should still be rendered
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});

describe('Utility functions', () => {
  describe('getErrorMessage', () => {
    it('returns string as-is', () => {
      expect(getErrorMessage('Test error')).toBe('Test error');
    });

    it('returns Error message', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('returns message from object with message property', () => {
      const error = { message: 'Object error message' };
      expect(getErrorMessage(error)).toBe('Object error message');
    });

    it('returns default message for unknown error types', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    });
  });

  describe('isNetworkError', () => {
    it('identifies network errors from Error messages', () => {
      expect(isNetworkError(new Error('Network error occurred'))).toBe(true);
      expect(isNetworkError(new Error('Fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
      expect(isNetworkError(new Error('Regular error'))).toBe(false);
    });

    it('identifies network errors from error codes', () => {
      expect(isNetworkError({ code: 'NETWORK_ERROR' })).toBe(true);
      expect(isNetworkError({ code: 'OTHER_ERROR' })).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('identifies validation errors from error codes', () => {
      expect(isValidationError({ code: 'VALIDATION_ERROR' })).toBe(true);
      expect(isValidationError({ code: 'OTHER_ERROR' })).toBe(false);
    });
  });
});