import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create persister for offline caching
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'movie-booking-cache',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Create a client with enhanced caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for all queries
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          if (error?.response?.status === 408 || error?.response?.status === 429) {
            return failureCount < 2;
          }
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Global defaults for all mutations
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst',
    },
  },
});

// Enhanced query client with cache management
export const cacheUtils = {
  // Prefetch commonly used data
  prefetchEvents: () => {
    return queryClient.prefetchQuery({
      queryKey: ['events'],
      queryFn: () => fetch('/api/events').then(res => res.json()),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  },
  
  // Invalidate specific cache keys
  invalidateEvents: () => {
    return queryClient.invalidateQueries({ queryKey: ['events'] });
  },
  
  // Clear all cache
  clearCache: () => {
    return queryClient.clear();
  },
  
  // Get cache size
  getCacheSize: () => {
    const cache = queryClient.getQueryCache();
    return cache.getAll().length;
  },
};

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// Export the query client for use in other parts of the app
export { queryClient };