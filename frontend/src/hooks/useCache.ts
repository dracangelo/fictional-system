import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

/**
 * Hook for managing React Query cache
 */
export function useCache() {
  const queryClient = useQueryClient();

  // Prefetch data based on user behavior
  const prefetchData = useCallback(async (queryKey: string[], queryFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);

  // Invalidate cache for specific keys
  const invalidateCache = useCallback((queryKey: string[]) => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient]);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    return queryClient.clear();
  }, [queryClient]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(query => query.isStale()).length,
      activeQueries: queries.filter(query => query.getObserversCount() > 0).length,
      cacheSize: JSON.stringify(queries).length, // Approximate size in bytes
    };
  }, [queryClient]);

  // Background cache cleanup
  useEffect(() => {
    const cleanup = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      // Remove queries that haven't been used in 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      queries.forEach(query => {
        if (query.state.dataUpdatedAt < cutoff && query.getObserversCount() === 0) {
          cache.remove(query);
        }
      });
    };

    // Run cleanup every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  return {
    prefetchData,
    invalidateCache,
    clearAllCache,
    getCacheStats,
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  const updateCache = useCallback(<T>(
    queryKey: string[],
    updater: (oldData: T | undefined) => T
  ) => {
    queryClient.setQueryData(queryKey, updater);
  }, [queryClient]);

  const rollbackCache = useCallback((queryKey: string[], previousData: any) => {
    queryClient.setQueryData(queryKey, previousData);
  }, [queryClient]);

  return {
    updateCache,
    rollbackCache,
  };
}

/**
 * Hook for background sync
 */
export function useBackgroundSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      // Refetch all queries when coming back online
      queryClient.refetchQueries({
        type: 'active',
        stale: true,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch stale queries when tab becomes visible
        queryClient.refetchQueries({
          type: 'active',
          stale: true,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);
}