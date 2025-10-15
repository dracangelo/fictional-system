import React, { useState } from 'react';
import { 
  ErrorBoundary, 
  RetryWrapper, 
  useGlobalErrorHandler, 
  OfflineIndicator,
  NetworkQualityIndicator,
  Skeleton,
  SkeletonCard,
  SkeletonEventCard,
  SkeletonDashboard,
  useRetry
} from '../components/common';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// Component that throws errors for testing
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a test error from ErrorThrowingComponent');
  }
  return <div className="p-4 bg-green-100 rounded">Component is working fine!</div>;
};

// Component demonstrating async operations with retry
const AsyncOperationDemo = () => {
  const [shouldFail, setShouldFail] = useState(false);
  
  const asyncOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (shouldFail) {
      throw new Error('Async operation failed');
    }
    return 'Success!';
  };

  const { execute, retry, reset, isLoading, error, retryCount, canRetry } = useRetry(asyncOperation, 3, 500);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Async Operation with Retry</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={shouldFail}
              onChange={(e) => setShouldFail(e.target.checked)}
              className="mr-2"
            />
            Make operation fail
          </label>
        </div>

        <div className="flex space-x-2">
          <Button onClick={execute} disabled={isLoading}>
            {isLoading ? 'Running...' : 'Execute Operation'}
          </Button>
          
          {error && canRetry && (
            <Button onClick={retry} variant="outline">
              Retry ({retryCount}/3)
            </Button>
          )}
          
          {error && (
            <Button onClick={reset} variant="outline">
              Reset
            </Button>
          )}
        </div>

        {isLoading && <div className="text-blue-600">Operation in progress...</div>}
        {error && <div className="text-red-600">Error: {error.message}</div>}
        {!isLoading && !error && retryCount === 0 && (
          <div className="text-green-600">Ready to execute</div>
        )}
      </div>
    </Card>
  );
};

// Component demonstrating global error handling
const GlobalErrorDemo = () => {
  const { showError, clearAllErrors } = useGlobalErrorHandler();

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Global Error Handling</h3>
      
      <div className="space-y-2">
        <Button 
          onClick={() => showError('This is a simple error message')}
          variant="outline"
        >
          Show Simple Error
        </Button>
        
        <Button 
          onClick={() => showError(new Error('This is an Error object'))}
          variant="outline"
        >
          Show Error Object
        </Button>
        
        <Button 
          onClick={() => showError('This is a persistent error', { persistent: true })}
          variant="outline"
        >
          Show Persistent Error
        </Button>
        
        <Button 
          onClick={() => showError('Error with action', { 
            action: { 
              label: 'Fix It', 
              onClick: () => alert('Action clicked!') 
            } 
          })}
          variant="outline"
        >
          Show Error with Action
        </Button>
        
        <Button 
          onClick={clearAllErrors}
          variant="destructive"
        >
          Clear All Errors
        </Button>
      </div>
    </Card>
  );
};

// Component demonstrating skeleton loading states
const SkeletonDemo = () => {
  const [showSkeleton, setShowSkeleton] = useState(true);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Skeleton Loading States</h3>
      
      <Button 
        onClick={() => setShowSkeleton(!showSkeleton)}
        className="mb-4"
      >
        {showSkeleton ? 'Show Content' : 'Show Skeleton'}
      </Button>

      {showSkeleton ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonEventCard />
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="text-md font-medium mb-2">Actual Content</h4>
            <p className="text-gray-600 mb-4">This is the real content that would load after the skeleton.</p>
            <div className="flex space-x-2">
              <Button size="sm">Action 1</Button>
              <Button size="sm" variant="outline">Action 2</Button>
            </div>
          </Card>
          
          <Card className="p-4">
            <img 
              src="https://via.placeholder.com/300x200" 
              alt="Event" 
              className="w-full h-48 object-cover rounded mb-4"
            />
            <h4 className="text-lg font-semibold mb-2">Sample Event</h4>
            <p className="text-gray-600 mb-2">Event location</p>
            <p className="text-gray-500 text-sm mb-4">Event description goes here...</p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">$25.00</span>
              <Button size="sm">Book Now</Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
};

export default function ErrorHandlingDemo() {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Error Handling & User Feedback Demo
          </h1>
          <p className="text-gray-600">
            Comprehensive demonstration of error handling, loading states, and user feedback components
          </p>
        </div>

        {/* Network Status */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Network Status</h2>
          <div className="flex items-center space-x-4">
            <NetworkQualityIndicator />
            <OfflineIndicator showDetails={true} />
          </div>
        </Card>

        {/* Error Boundary Demo */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Error Boundary</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setThrowError(!throwError)}
                variant={throwError ? "destructive" : "outline"}
              >
                {throwError ? 'Fix Component' : 'Break Component'}
              </Button>
            </div>
            
            <ErrorBoundary
              resetKeys={[throwError]}
              onError={(error, errorInfo) => {
                console.log('Error caught by boundary:', error, errorInfo);
              }}
            >
              <ErrorThrowingComponent shouldThrow={throwError} />
            </ErrorBoundary>
          </div>
        </Card>

        {/* Retry Wrapper Demo */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Retry Wrapper</h2>
          <RetryWrapper
            onRetry={async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              // Simulate random success/failure
              if (Math.random() > 0.5) {
                throw new Error('Random retry failure');
              }
            }}
            error={Math.random() > 0.7 ? new Error('Simulated error for retry demo') : null}
            maxRetries={3}
            retryDelay={1000}
          >
            <div className="p-4 bg-green-100 rounded">
              Retry wrapper content - this shows when there's no error
            </div>
          </RetryWrapper>
        </Card>

        {/* Global Error Handling */}
        <GlobalErrorDemo />

        {/* Async Operations */}
        <AsyncOperationDemo />

        {/* Skeleton Loading States */}
        <SkeletonDemo />

        {/* Dashboard Skeleton Demo */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Dashboard Skeleton</h2>
          <SkeletonDashboard />
        </Card>
      </div>
    </div>
  );
}