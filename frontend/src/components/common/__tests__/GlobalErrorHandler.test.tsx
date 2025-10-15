import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ErrorProvider, 
  useErrorHandler, 
  getErrorMessage, 
  isNetworkError, 
  isValidationError,
  setupGlobalErrorHandling 
} from '../GlobalErrorHandler';

// Test component that uses the error handler
const TestComponent = () => {
  const { showError, clearError, clearAllErrors } = useErrorHandler();
  
  return (
    <div>
      <button onClick={() => showError('Test error message')}>
        Show String Error
      </button>
      <button onClick={() => showError(new Error('Test Error object'))}>
        Show Error Object
      </button>
      <button onClick={() => showError({ message: 'API Error', code: 'API_ERROR', timestamp: new Date().toISOString() })}>
        Show API Error
      </button>
      <button onClick={() => showError('Persistent error', { persistent: true })}>
        Show Persistent Error
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

describe('ErrorProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children without errors', () => {
    render(
      <ErrorProvider>
        <div>Test content</div>
      </ErrorProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows error toast when showError is called with string', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByText('Show String Error'));

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  it('shows error toast when showError is called with Error object', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByText('Show Error Object'));

    await waitFor(() => {
      expect(screen.getByText('Test Error object')).toBeInTheDocument();
    });
  });

  it('shows error toast when showError is called with API error', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByText('Show API Error'));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('auto-removes non-persistent errors after timeout', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByText('Show String Error'));

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    // Fast-forward time to trigger auto-removal
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
    });
  });

  it('keeps persistent errors until manually cleared', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByText('Show Persistent Error'));

    await waitFor(() => {
      expect(screen.getByText('Persistent error')).toBeInTheDocument();
    });

    // Fast-forward time - persistent error should remain
    vi.advanceTimersByTime(10000);

    expect(screen.getByText('Persistent error')).toBeInTheDocument();
  });

  it('clears specific error when clearError is called', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    fireEvent.click(screen.getByText('Show String Error'));

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear Error'));

    await waitFor(() => {
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
    });
  });

  it('clears all errors when clearAllErrors is called', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Show multiple errors
    fireEvent.click(screen.getByText('Show String Error'));
    fireEvent.click(screen.getByText('Show Persistent Error'));

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Persistent error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear All Errors'));

    await waitFor(() => {
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
      expect(screen.queryByText('Persistent error')).not.toBeInTheDocument();
    });
  });

  it('throws error when useErrorHandler is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useErrorHandler must be used within an ErrorProvider');
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

describe('setupGlobalErrorHandling', () => {
  let mockShowError: ReturnType<typeof vi.fn>;
  let originalAddEventListener: typeof window.addEventListener;

  beforeEach(() => {
    mockShowError = vi.fn();
    originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn();
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
  });

  it('sets up event listeners for global error handling', () => {
    setupGlobalErrorHandling(mockShowError);

    expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function), true);
  });

  it('handles unhandled promise rejections', () => {
    setupGlobalErrorHandling(mockShowError);

    const mockEvent = {
      reason: new Error('Unhandled promise rejection'),
      preventDefault: vi.fn(),
    };

    // Get the event handler that was registered
    const calls = (window.addEventListener as any).mock.calls;
    const unhandledRejectionHandler = calls.find(call => call[0] === 'unhandledrejection')[1];

    unhandledRejectionHandler(mockEvent);

    expect(mockShowError).toHaveBeenCalledWith('Unhandled promise rejection');
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('handles network errors specially', () => {
    setupGlobalErrorHandling(mockShowError);

    const mockEvent = {
      reason: new Error('Network connection failed'),
      preventDefault: vi.fn(),
    };

    const calls = (window.addEventListener as any).mock.calls;
    const unhandledRejectionHandler = calls.find(call => call[0] === 'unhandledrejection')[1];

    unhandledRejectionHandler(mockEvent);

    expect(mockShowError).toHaveBeenCalledWith('Network connection error. Please check your internet connection.');
  });
});