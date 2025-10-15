import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RetryWrapper, useRetry, withRetry } from '../RetryWrapper';

describe('RetryWrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children when no error', () => {
    render(
      <RetryWrapper onRetry={() => {}}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(
      <RetryWrapper onRetry={() => {}} loading={true}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
  });

  it('shows error state when error prop is provided', () => {
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={() => {}} error={error}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={mockRetry} error={error}>
        <div>Test content</div>
      </RetryWrapper>
    );

    fireEvent.click(screen.getByText('Try Again'));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('shows retry count and limits retries', async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={mockRetry} error={error} maxRetries={2}>
        <div>Test content</div>
      </RetryWrapper>
    );

    // First retry
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.getByText('Attempt 1 of 2')).toBeInTheDocument();
    });

    // Second retry
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.getByText('Attempt 2 of 2')).toBeInTheDocument();
    });

    // Should show max retries reached
    await waitFor(() => {
      expect(screen.getByText('Maximum retry attempts reached')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });

  it('resets retry count when reset button is clicked', async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const error = new Error('Test error');
    
    const { rerender } = render(
      <RetryWrapper onRetry={mockRetry} error={error} maxRetries={1}>
        <div>Test content</div>
      </RetryWrapper>
    );

    // Exhaust retries
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    // Reset
    fireEvent.click(screen.getByText('Reset'));

    // Rerender without error to simulate successful reset
    rerender(
      <RetryWrapper onRetry={mockRetry}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    const error = new Error('Test error');
    const customFallback = <div>Custom error UI</div>;
    
    render(
      <RetryWrapper onRetry={() => {}} error={error} fallback={customFallback}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('applies retry delay', async () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={mockRetry} error={error} retryDelay={1000}>
        <div>Test content</div>
      </RetryWrapper>
    );

    fireEvent.click(screen.getByText('Try Again'));

    // Should show retrying state immediately
    expect(screen.getByLabelText('Retrying...')).toBeInTheDocument();

    // Advance timers to complete the delay
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  it('customizes retry button text', () => {
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={() => {}} error={error} retryButtonText="Retry Now">
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Retry Now')).toBeInTheDocument();
  });

  it('customizes error message', () => {
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={() => {}} error={error} errorMessage="Custom error occurred">
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.getByText('Custom error occurred')).toBeInTheDocument();
  });

  it('hides retry button when showRetryButton is false', () => {
    const error = new Error('Test error');
    
    render(
      <RetryWrapper onRetry={() => {}} error={error} showRetryButton={false}>
        <div>Test content</div>
      </RetryWrapper>
    );

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});

describe('useRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes async function successfully', async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue('success');
    
    const TestComponent = () => {
      const { execute, isLoading, error } = useRetry(mockAsyncFn);
      
      return (
        <div>
          <button onClick={execute}>Execute</button>
          {isLoading && <div>Loading...</div>}
          {error && <div>Error: {error.message}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Execute'));

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockAsyncFn).toHaveBeenCalled();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('handles async function errors', async () => {
    const mockAsyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
    
    const TestComponent = () => {
      const { execute, isLoading, error } = useRetry(mockAsyncFn);
      
      return (
        <div>
          <button onClick={execute}>Execute</button>
          {isLoading && <div>Loading...</div>}
          {error && <div>Error: {error.message}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByText('Error: Async error')).toBeInTheDocument();
    });
  });

  it('retries with delay and limits', async () => {
    const mockAsyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
    
    const TestComponent = () => {
      const { execute, retry, retryCount, canRetry } = useRetry(mockAsyncFn, 2, 500);
      
      return (
        <div>
          <button onClick={execute}>Execute</button>
          <button onClick={retry} disabled={!canRetry}>Retry</button>
          <div>Retry count: {retryCount}</div>
          <div>Can retry: {canRetry.toString()}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Initial execution
    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByText('Can retry: true')).toBeInTheDocument();
    });

    // First retry
    fireEvent.click(screen.getByText('Retry'));
    
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.getByText('Retry count: 1')).toBeInTheDocument();
    });

    // Second retry
    fireEvent.click(screen.getByText('Retry'));
    
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.getByText('Retry count: 2')).toBeInTheDocument();
      expect(screen.getByText('Can retry: false')).toBeInTheDocument();
    });
  });

  it('resets state when reset is called', async () => {
    const mockAsyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
    
    const TestComponent = () => {
      const { execute, reset, error, retryCount } = useRetry(mockAsyncFn);
      
      return (
        <div>
          <button onClick={execute}>Execute</button>
          <button onClick={reset}>Reset</button>
          {error && <div>Error: {error.message}</div>}
          <div>Retry count: {retryCount}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Execute and get error
    fireEvent.click(screen.getByText('Execute'));

    await waitFor(() => {
      expect(screen.getByText('Error: Async error')).toBeInTheDocument();
    });

    // Reset
    fireEvent.click(screen.getByText('Reset'));

    expect(screen.queryByText('Error: Async error')).not.toBeInTheDocument();
    expect(screen.getByText('Retry count: 0')).toBeInTheDocument();
  });
});

describe('withRetry HOC', () => {
  it('wraps component with retry functionality', () => {
    const TestComponent = ({ onError }: { onError?: (error: Error) => void }) => {
      return (
        <div>
          <button onClick={() => onError?.(new Error('Component error'))}>
            Trigger Error
          </button>
          <div>Test content</div>
        </div>
      );
    };

    const WrappedComponent = withRetry(TestComponent);

    render(<WrappedComponent onRetry={() => Promise.resolve()} />);

    expect(screen.getByText('Test content')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});