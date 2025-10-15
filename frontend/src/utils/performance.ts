/**
 * Performance monitoring and optimization utilities
 */

// Core Web Vitals thresholds
const THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1,  // Cumulative Layout Shift
  FCP: 1800, // First Contentful Paint
  TTFB: 800, // Time to First Byte
};

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializeObserver();
    this.measureInitialMetrics();
  }

  private initializeObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processEntry(entry);
        }
      });

      // Observe different types of performance entries
      try {
        this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        // Fallback for browsers that don't support all entry types
        console.warn('Some performance metrics not supported:', e);
      }
    }
  }

  private processEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'navigation':
        this.handleNavigationEntry(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.handlePaintEntry(entry as PerformancePaintTiming);
        break;
      case 'largest-contentful-paint':
        this.handleLCPEntry(entry as any);
        break;
      case 'first-input':
        this.handleFIDEntry(entry as any);
        break;
      case 'layout-shift':
        this.handleCLSEntry(entry as any);
        break;
    }
  }

  private handleNavigationEntry(entry: PerformanceNavigationTiming) {
    const ttfb = entry.responseStart - entry.requestStart;
    this.addMetric('TTFB', ttfb, this.getRating('TTFB', ttfb));

    const domContentLoaded = entry.domContentLoadedEventEnd - entry.navigationStart;
    this.addMetric('DCL', domContentLoaded, this.getRating('DCL', domContentLoaded));

    const loadComplete = entry.loadEventEnd - entry.navigationStart;
    this.addMetric('Load', loadComplete, this.getRating('Load', loadComplete));
  }

  private handlePaintEntry(entry: PerformancePaintTiming) {
    if (entry.name === 'first-contentful-paint') {
      this.addMetric('FCP', entry.startTime, this.getRating('FCP', entry.startTime));
    }
  }

  private handleLCPEntry(entry: any) {
    this.addMetric('LCP', entry.startTime, this.getRating('LCP', entry.startTime));
  }

  private handleFIDEntry(entry: any) {
    this.addMetric('FID', entry.processingStart - entry.startTime, this.getRating('FID', entry.processingStart - entry.startTime));
  }

  private handleCLSEntry(entry: any) {
    if (!entry.hadRecentInput) {
      this.addMetric('CLS', entry.value, this.getRating('CLS', entry.value));
    }
  }

  private addMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
    };
    
    this.metrics.push(metric);
    this.reportMetric(metric);
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[metricName as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (metricName === 'CLS') {
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    }

    if (value <= threshold) return 'good';
    if (value <= threshold * 1.5) return 'needs-improvement';
    return 'poor';
  }

  private reportMetric(metric: PerformanceMetric) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`Performance Metric - ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
    }

    // Send to analytics in production
    if (import.meta.env.PROD) {
      this.sendToAnalytics(metric);
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Implementation would send to your analytics service
    // Example: Google Analytics, DataDog, etc.
    if ('gtag' in window) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: { metric_rating: metric.rating },
      });
    }
  }

  private measureInitialMetrics() {
    // Measure initial page load metrics
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        this.handleNavigationEntry(navigationEntries[0]);
      }

      const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
      paintEntries.forEach(entry => this.handlePaintEntry(entry));
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  public getLatestMetric(name: string): PerformanceMetric | undefined {
    const metrics = this.getMetricsByName(name);
    return metrics[metrics.length - 1];
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function initializePerformanceMonitoring() {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function getPerformanceMonitor() {
  return performanceMonitor;
}

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string) {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (import.meta.env.DEV) {
      console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
    }
    
    return renderTime;
  };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Measure memory usage
 */
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Resource timing analysis
 */
export function analyzeResourceTiming() {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  const analysis = {
    totalResources: resources.length,
    totalSize: 0,
    slowestResources: [] as Array<{ name: string; duration: number; size: number }>,
    resourceTypes: {} as Record<string, number>,
  };

  resources.forEach(resource => {
    const duration = resource.responseEnd - resource.startTime;
    const size = resource.transferSize || 0;
    
    analysis.totalSize += size;
    
    // Categorize by type
    const extension = resource.name.split('.').pop()?.toLowerCase() || 'other';
    analysis.resourceTypes[extension] = (analysis.resourceTypes[extension] || 0) + 1;
    
    // Track slow resources (>1s)
    if (duration > 1000) {
      analysis.slowestResources.push({
        name: resource.name,
        duration,
        size,
      });
    }
  });

  analysis.slowestResources.sort((a, b) => b.duration - a.duration);
  
  return analysis;
}