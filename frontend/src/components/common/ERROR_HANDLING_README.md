# Comprehensive Error Handling and User Feedback System

This document describes the comprehensive error handling and user feedback system implemented for the movie booking application frontend.

## Overview

The error handling system provides multiple layers of error recovery, user feedback, and graceful degradation to ensure a robust user experience even when things go wrong.

## Components

### 1. ErrorBoundary

A React error boundary component that catches JavaScript errors anywhere in the component tree.

**Features:**
- Catches and displays user-friendly error messages
- Provides retry functionality
- Supports custom fallback UI
- Automatic reset on prop changes
- Error reporting to external services
- Development mode error details

**Usage:**
```tsx
import { ErrorBoundary } from '../components/common';

<ErrorBoundary
  resetKeys={[someKey]}
  onError={(error, errorInfo) => console.log(error)}
  fallback={<CustomErrorUI />}
>
  <YourComponent />
</ErrorBoundary>
```

### 2. GlobalErrorHandler (ErrorProvider)

A context-based global error handling system for managing application-wide errors.

**Features:**
- Toast notifications for errors
- Persistent and auto-dismissing errors
- Action buttons on error messages
- Error categorization (error, warning, info)
- Global error event listeners

**Usage:**
```tsx
import { ErrorProvider, useGlobalErrorHandler } from '../components/common';

// Wrap your app
<ErrorProvider>
  <App />
</ErrorProvider>

// Use in components
const { showError, clearError, clearAllErrors } = useGlobalErrorHandler();

showError('Something went wrong');
showError(new Error('API Error'));
showError('Persistent error', { persistent: true });
```

### 3. RetryWrapper

A wrapper component that provides retry functionality for failed operations.

**Features:**
- Configurable retry attempts and delays
- Loading states during retries
- Exponential backoff
- Custom error messages and retry buttons
- Higher-order component version available

**Usage:**
```tsx
import { RetryWrapper, useRetry } from '../components/common';

// Component wrapper
<RetryWrapper
  onRetry={async () => await apiCall()}
  error={error}
  maxRetries={3}
  retryDelay={1000}
>
  <YourContent />
</RetryWrapper>

// Hook version
const { execute, retry, reset, isLoading, error, retryCount } = useRetry(
  asyncFunction,
  maxRetries,
  retryDelay
);
```

### 4. Skeleton Components

Loading state components that provide better perceived performance.

**Available Skeletons:**
- `Skeleton` - Basic skeleton block
- `SkeletonText` - Multi-line text skeleton
- `SkeletonCard` - Generic card skeleton
- `SkeletonAvatar` - User avatar skeleton
- `SkeletonButton` - Button skeleton
- `SkeletonTable` - Table skeleton
- `SkeletonEventCard` - Event-specific card skeleton
- `SkeletonBookingCard` - Booking-specific card skeleton
- `SkeletonSeatMap` - Seat selection skeleton
- `SkeletonDashboard` - Full dashboard skeleton

**Usage:**
```tsx
import { SkeletonCard, SkeletonEventCard } from '../components/common';

{isLoading ? <SkeletonEventCard /> : <EventCard data={event} />}
```

### 5. Offline Handling

Components and hooks for managing offline scenarios and network connectivity.

**Features:**
- Offline status detection
- Network quality indicators
- Offline action queuing
- Automatic sync when back online
- Visual offline indicators

**Components:**
- `OfflineIndicator` - Shows offline status banner
- `NetworkQualityIndicator` - Shows connection quality
- `OfflineActionQueue` - Manages queued offline actions

**Usage:**
```tsx
import { 
  OfflineIndicator, 
  NetworkQualityIndicator, 
  useOfflineStatus, 
  useNetworkStatus 
} from '../components/common';

const isOffline = useOfflineStatus();
const networkInfo = useNetworkStatus();

<OfflineIndicator showDetails={true} />
<NetworkQualityIndicator />
```

### 6. Enhanced API Client

The API client has been enhanced with comprehensive error handling and retry mechanisms.

**Features:**
- Automatic retry with exponential backoff
- Network error detection
- Offline request queuing
- Token refresh handling
- Structured error responses
- Request/response interceptors

**Usage:**
```tsx
import { apiClient } from '../services/api/client';

// Automatic retry configuration
const data = await apiClient.get('/api/events', {
  retryConfig: {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error) => error.response?.status >= 500
  }
});
```

## Integration

### App-Level Integration

The error handling system is integrated at the app level:

```tsx
import { 
  ErrorBoundary, 
  ErrorProvider, 
  OfflineIndicator, 
  setupGlobalErrorHandling 
} from './components/common';

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <GlobalErrorSetup />
        <OfflineIndicator />
        <YourAppContent />
      </ErrorProvider>
    </ErrorBoundary>
  );
}
```

### Global Error Setup

```tsx
function GlobalErrorSetup() {
  const { showError } = useGlobalErrorHandler();

  useEffect(() => {
    setupGlobalErrorHandling(showError);
  }, [showError]);

  return null;
}
```

## Error Types and Handling

### 1. Component Errors
- Caught by ErrorBoundary
- Display fallback UI
- Provide retry mechanism
- Log to error reporting service

### 2. API Errors
- Handled by enhanced API client
- Automatic retry for transient errors
- User-friendly error messages
- Offline queuing for network errors

### 3. Network Errors
- Offline detection and indicators
- Request queuing and replay
- Connection quality monitoring
- Graceful degradation

### 4. Validation Errors
- Structured error responses
- Field-specific error messages
- Real-time validation feedback
- Form state management

## Best Practices

### 1. Error Boundaries
- Place at strategic component boundaries
- Provide meaningful fallback UI
- Include retry mechanisms
- Log errors for debugging

### 2. Loading States
- Use skeleton components for better UX
- Show progress indicators for long operations
- Provide cancel options where appropriate
- Handle loading state transitions smoothly

### 3. Offline Handling
- Queue important actions when offline
- Provide clear offline indicators
- Sync automatically when back online
- Handle conflicts gracefully

### 4. User Feedback
- Use appropriate error message tone
- Provide actionable error messages
- Include recovery suggestions
- Avoid technical jargon

## Testing

The error handling system includes comprehensive tests:

- `ErrorBoundary.test.tsx` - Error boundary functionality
- `SimpleErrorHandler.test.tsx` - Global error handling
- `RetryWrapper.test.tsx` - Retry mechanisms
- `ErrorHandlingIntegration.test.tsx` - Integration scenarios

## Demo

A comprehensive demo page is available at `/error-handling-demo` that showcases all error handling features:

- Error boundary demonstrations
- Global error handling
- Retry mechanisms
- Skeleton loading states
- Offline scenarios
- Network status indicators

## Configuration

### Error Reporting

Configure error reporting in production:

```tsx
// In ErrorBoundary component
private reportError = (error: Error, errorInfo: ErrorInfo) => {
  // Configure your error reporting service
  // Examples: Sentry, LogRocket, Bugsnag
  errorReportingService.captureException(error, {
    extra: errorInfo,
    tags: { component: 'ErrorBoundary' }
  });
};
```

### Retry Configuration

Default retry configuration can be customized:

```tsx
const defaultRetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // Customize retry conditions
    return !error.response || error.response.status >= 500;
  }
};
```

### Offline Settings

Offline behavior can be configured:

```tsx
const offlineConfig = {
  queueActions: true,
  maxQueueSize: 100,
  syncOnReconnect: true,
  showOfflineIndicator: true
};
```

## Performance Considerations

1. **Skeleton Components**: Use appropriate skeleton complexity
2. **Error Boundaries**: Place strategically to avoid over-catching
3. **Retry Logic**: Use exponential backoff to avoid overwhelming servers
4. **Offline Queue**: Limit queue size to prevent memory issues
5. **Error Reporting**: Throttle error reports to avoid spam

## Accessibility

The error handling system includes accessibility features:

- ARIA labels and roles
- Screen reader announcements
- Keyboard navigation support
- High contrast error indicators
- Focus management during errors

## Browser Support

The error handling system supports:
- Modern browsers with ES2018+ support
- Progressive enhancement for older browsers
- Graceful degradation of advanced features
- Polyfills for missing APIs where needed