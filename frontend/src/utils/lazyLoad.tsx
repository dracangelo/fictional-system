import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Utility function to create lazy-loaded components with better error handling
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
): LazyExoticComponent<T> {
  const LazyComponent = lazy(async () => {
    try {
      const module = await importFunc();
      return module;
    } catch (error) {
      console.error('Failed to load component:', error);
      // Return a fallback component if loading fails
      if (fallback) {
        return { default: fallback };
      }
      // Return a generic error component
      return {
        default: (() => (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Failed to load component
              </h3>
              <p className="text-gray-600">
                Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )) as T,
      };
    }
  });

  return LazyComponent;
}

/**
 * Preload a lazy component to improve perceived performance
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): Promise<void> {
  return importFunc().then(() => {
    // Component is now loaded and cached
  }).catch((error) => {
    console.warn('Failed to preload component:', error);
  });
}

/**
 * Higher-order component for lazy loading with retry functionality
 */
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  displayName?: string
) {
  const LazyComponent = lazyLoad(importFunc);
  
  if (displayName) {
    LazyComponent.displayName = `LazyLoaded(${displayName})`;
  }
  
  return LazyComponent;
}