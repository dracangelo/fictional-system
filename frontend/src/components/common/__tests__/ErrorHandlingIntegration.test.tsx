import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  ErrorBoundary, 
  ErrorProvider, 
  RetryWrapper, 
  OfflineIndicator,
  useGlobalErrorHandler,
  useRetry
} from '../index';

// Mock components for testing
const FailingComponent = ({ shouldFail = false }: { shouldFail?: boolean }) => {
  if (shouldFail) {
    throw new Error('Component failed');
  }
  return <div>Component working</div>;
};

const AsyncFailingComponent = () => {
  const { showError } = useGlobalErrorHandler();
  const mockAsyncOperation = async () => {
    throw new Error('Async operation failed');
  };
  
  const { execute, isLoading, error } = useRetry(mockAsyncOperation);
  
  return (
    <div>
      <button onClick={execute}>Execute Async</button>
      {isLoading && <div>Loading async...</div>}
      {error && <div>Async error: {error.message}</div>}
      <button onClick={() => showError('Manual error')}>Show Manual Error</button>
    </div>
  );
};

const NetworkAwareComponent = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <div>
      <div>Network status: {isOnline ? 'Online' : 'Offline'}</div>
      <OfflineIndicator showDetails={true} />
    </div>
  );
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </ErrorProvider>
    </QueryClientProvider>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles component errors with ErrorBoundary', () => {
    render(
      <TestWrapper>
        <FailingComponent shouldFail={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows global error toasts for manual errors', async () => {
    render(
      <TestWrapper>
        <AsyncFailingComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Show Manual Error'));

    await waitFor(() => {
      expect(screen.getByText('Manual error')).toBeInTheDocument();
    });
  });

  it('handles async operation errors with retry functionality', async () => {
    render(
      <TestWrapper>
        <AsyncFailingComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Execute Async'));

    await waitFor(() => {
      expect(screen.getByText('Async error: Async operation failed')).toBeInTheDocument();
    });
  });

  it('integrates RetryWrapper with ErrorBoundary', async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const error = new Error('Retry test error');

    render(
      <TestWrapper>
        <RetryWrapper onRetry={mockRetry} error={error}>
          <div>Content</div>
        </RetryWrapper>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Try Again'));
    
    expect(mockRetry).toHaveBeenCalled();
  });

  it('handles offline scenarios', async () => {
    render(
      <TestWrapper>
        <NetworkAwareComponent />
      </TestWrapper>
    );

    expect(screen.getByText('Network status: Online')).toBeInTheDocument();

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));

    await waitFor(() => {
      expect(screen.getByText('Network status: Offline')).toBeInTheDocument();
    });
  });

  it('auto-dismisses non-persistent error toasts', async () => {
    render(
      <TestWrapper>
        <AsyncFailingComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Show Manual Error'));

    await waitFor(() => {
      expect(screen.getByText('Manual error')).toBeInTheDocument();
    });

    // Fast-forward time to auto-dismiss
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Manual error')).not.toBeInTheDocument();
    });
  });

  it('recovers from errors when component props change', async () => {
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary resetOnPropsChange={true}>
          <FailingComponent shouldFail={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Rerender with working component
    rerender(
      <TestWrapper>
        <ErrorBoundary resetOnPropsChange={true}>
          <FailingComponent shouldFail={false} />
        </ErrorBoundary>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Component working')).toBeInTheDocument();
    });
  });

  it('handles multiple error types simultaneously', async () => {
    const MultiErrorComponent = () => {
      const { showError } = useGlobalErrorHandler();
      
      return (
        <div>
          <button onClick={() => showError('Error 1')}>Error 1</button>
          <button onClick={() => showError('Error 2')}>Error 2</button>
          <button onClick={() => showError('Persistent Error', { persistent: true })}>
            Persistent Error
          </button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <MultiErrorComponent />
      </TestWrapper>
    );

    // Show multiple errors
    fireEvent.click(screen.getByText('Error 1'));
    fireEvent.click(screen.getByText('Error 2'));
    fireEvent.click(screen.getByText('Persistent Error'));

    await waitFor(() => {
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Persistent Error')).toBeInTheDocument();
    });

    // Auto-dismiss non-persistent errors
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Error 2')).not.toBeInTheDocument();
      expect(screen.getByText('Persistent Error')).toBeInTheDocument();
    });
  });

  it('provides error context throughout component tree', () => {
    const DeepComponent = () => {
      const { showError } = useGlobalErrorHandler();
      return <button onClick={() => showError('Deep error')}>Deep Error</button>;
    };

    const MiddleComponent = () => (
      <div>
        <DeepComponent />
      </div>
    );

    render(
      <TestWrapper>
        <MiddleComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Deep Error'));

    expect(screen.getByText('Deep error')).toBeInTheDocument();
  });

  it('handles error boundary reset with custom reset keys', async () => {
    let resetKey = 'key1';
    
    const { rerender } = render(
      <TestWrapper>
        <ErrorBoundary resetKeys={[resetKey]}>
          <FailingComponent shouldFail={true} />
        </ErrorBoundary>
      </TestWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change reset key to trigger reset
    resetKey = 'key2';
    rerender(
      <TestWrapper>
        <ErrorBoundary resetKeys={[resetKey]}>
          <FailingComponent shouldFail={false} />
        </ErrorBoundary>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Component working')).toBeInTheDocument();
    });
  });
});