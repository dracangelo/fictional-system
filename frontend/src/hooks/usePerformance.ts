import { useEffect, useState, useCallback } from 'react';
import { initializePerformanceMonitoring, getPerformanceMonitor, measureRenderTime } from '../utils/performance';

interface PerformanceMetrics {
  LCP?: number;
  FID?: number;
  CLS?: number;
  FCP?: number;
  TTFB?: number;
}

/**
 * Hook for monitoring Core Web Vitals
 */
export function useWebVitals() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const monitor = initializePerformanceMonitoring();
    
    // Update metrics when new ones are available
    const updateMetrics = () => {
      const allMetrics = monitor.getMetrics();
      const latest: PerformanceMetrics = {};
      
      ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].forEach(metricName => {
        const metric = monitor.getLatestMetric(metricName);
        if (metric) {
          latest[metricName as keyof PerformanceMetrics] = metric.value;
        }
      });
      
      setMetrics(latest);
      setIsLoading(false);
    };

    // Initial update
    updateMetrics();
    
    // Update periodically
    const interval = setInterval(updateMetrics, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return { metrics, isLoading };
}

/**
 * Hook for measuring component performance
 */
export function useComponentPerformance(componentName: string) {
  const [renderTime, setRenderTime] = useState<number | null>(null);
  
  const startMeasurement = useCallback(() => {
    const endMeasurement = measureRenderTime(componentName);
    
    return () => {
      const time = endMeasurement();
      setRenderTime(time);
    };
  }, [componentName]);

  return { renderTime, startMeasurement };
}

/**
 * Hook for monitoring memory usage
 */
export function useMemoryMonitoring() {
  const [memoryUsage, setMemoryUsage] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        });
      }
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
}

/**
 * Hook for performance budget monitoring
 */
export function usePerformanceBudget() {
  const [budgetStatus, setBudgetStatus] = useState<{
    isWithinBudget: boolean;
    violations: string[];
    score: number;
  }>({
    isWithinBudget: true,
    violations: [],
    score: 100,
  });

  const { metrics } = useWebVitals();
  const memoryUsage = useMemoryMonitoring();

  useEffect(() => {
    const violations: string[] = [];
    let score = 100;

    // Check Core Web Vitals thresholds
    if (metrics.LCP && metrics.LCP > 2500) {
      violations.push(`LCP too slow: ${metrics.LCP.toFixed(0)}ms (should be < 2500ms)`);
      score -= 20;
    }

    if (metrics.FID && metrics.FID > 100) {
      violations.push(`FID too slow: ${metrics.FID.toFixed(0)}ms (should be < 100ms)`);
      score -= 15;
    }

    if (metrics.CLS && metrics.CLS > 0.1) {
      violations.push(`CLS too high: ${metrics.CLS.toFixed(3)} (should be < 0.1)`);
      score -= 15;
    }

    if (metrics.FCP && metrics.FCP > 1800) {
      violations.push(`FCP too slow: ${metrics.FCP.toFixed(0)}ms (should be < 1800ms)`);
      score -= 10;
    }

    if (metrics.TTFB && metrics.TTFB > 800) {
      violations.push(`TTFB too slow: ${metrics.TTFB.toFixed(0)}ms (should be < 800ms)`);
      score -= 10;
    }

    // Check memory usage
    if (memoryUsage && memoryUsage.usagePercentage > 80) {
      violations.push(`Memory usage too high: ${memoryUsage.usagePercentage.toFixed(1)}% (should be < 80%)`);
      score -= 15;
    }

    setBudgetStatus({
      isWithinBudget: violations.length === 0,
      violations,
      score: Math.max(0, score),
    });
  }, [metrics, memoryUsage]);

  return budgetStatus;
}