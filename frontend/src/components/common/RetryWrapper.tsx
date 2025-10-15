import React, { useState, useCallback, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from './LoadingSpinner';

interface RetryWrapperProps {
  children: ReactNode;
  onRetry: () => Promise<void> | void;
  error?: Error | null;
  loading?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallback?: ReactNode;
  showRetryButton?: boolean;
  retryButtonText?: string;
  errorMessage?: string;
}

export function RetryWrapper({
  children,
  onRetry,
  error,
  loading = false,
  maxRetries = 3,
  retryDelay = 1000,
  fallback,
  showRetryButton = true,
  retryButtonText = 'Try Again',
  errorMessage,
}: RetryWrapperProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryCount, maxRetries, retryDelay]);

  const handleReset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  // Show loading state
  if (loading || isRetrying) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" label={isRetrying ? 'Retrying...' : 'Loading...'} />
      </div>
    );
  }

  // Show error state
  if (error) {
    // Custom fallback
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default error UI
    return (
      <Card className="p-6 text-center max-w-md mx-auto">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {errorMessage || 'Something went wrong'}
          </h3>
          
          <p className="text-gray-600 text-sm mb-4">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>

          {retryCount > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              Attempt {retryCount} of {maxRetries}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {showRetryButton && retryCount < maxRetries && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant="primary"
                size="sm"
              >
                {isRetrying ? 'Retrying...' : retryButtonText}
              </Button>
            )}
            
            {retryCount >= maxRetries && (
              <div className="space-y-2">
                <p className="text-sm text-red-600 mb-2">
                  Maximum retry attempts reached
                </p>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Show children when no error
  return <>{children}</>;
}

// Hook for retry logic
export function useRetry(
  asyncFunction: () => Promise<void>,
  maxRetries: number = 3,
  retryDelay: number = 1000
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await asyncFunction();
      setRetryCount(0); // Reset on success
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction]);

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setRetryCount(prev => prev + 1);
    
    // Add delay before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    await execute();
  }, [execute, retryCount, maxRetries, retryDelay]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, []);

  return {
    execute,
    retry,
    reset,
    isLoading,
    error,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}

// Higher-order component for automatic retry
export function withRetry<P extends object>(
  Component: React.ComponentType<P>,
  retryOptions: {
    maxRetries?: number;
    retryDelay?: number;
    errorMessage?: string;
  } = {}
) {
  return function RetryComponent(props: P & { onRetry?: () => Promise<void> | void }) {
    const { onRetry, ...componentProps } = props;
    const [error, setError] = useState<Error | null>(null);

    const handleError = useCallback((error: Error) => {
      setError(error);
    }, []);

    const handleRetry = useCallback(async () => {
      setError(null);
      if (onRetry) {
        try {
          await onRetry();
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Retry failed'));
        }
      }
    }, [onRetry]);

    return (
      <RetryWrapper
        error={error}
        onRetry={handleRetry}
        maxRetries={retryOptions.maxRetries}
        retryDelay={retryOptions.retryDelay}
        errorMessage={retryOptions.errorMessage}
      >
        <Component {...(componentProps as P)} onError={handleError} />
      </RetryWrapper>
    );
  };
}