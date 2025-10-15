import { RouterProvider } from 'react-router-dom';
import { AuthProvider, NotificationProvider } from './contexts';
import { QueryProvider } from './providers/QueryProvider';
import { ToastContainer, SystemBannerContainer } from './components/ui';
import { 
  PerformanceMonitor, 
  PerformanceReporter, 
  ErrorBoundary, 
  ErrorProvider, 
  OfflineIndicator, 
  OfflineActionQueue,
  setupGlobalErrorHandling,
  useGlobalErrorHandler
} from './components/common';
import { router } from './router';
import { useEffect } from 'react';
import './App.css';

// Component to setup global error handling
function GlobalErrorSetup() {
  const { showError } = useGlobalErrorHandler();

  useEffect(() => {
    setupGlobalErrorHandling(showError);
  }, [showError]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <QueryProvider>
          <AuthProvider>
            <NotificationProvider>
              <GlobalErrorSetup />
              <PerformanceReporter />
              <OfflineIndicator />
              <SystemBannerContainer />
              <ErrorBoundary
                resetOnPropsChange={true}
                onError={(error, errorInfo) => {
                  console.error('Router Error:', error, errorInfo);
                }}
              >
                <RouterProvider router={router} />
              </ErrorBoundary>
              <ToastContainer position="top-right" maxToasts={5} />
              <OfflineActionQueue />
              <PerformanceMonitor />
            </NotificationProvider>
          </AuthProvider>
        </QueryProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
