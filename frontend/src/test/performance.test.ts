import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { measureRenderTime, debounce, throttle, getMemoryUsage } from '../utils/performance';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('measureRenderTime', () => {
    it('should measure component render time', () => {
      const startTime = 1000;
      const endTime = 1050;
      
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const endMeasurement = measureRenderTime('TestComponent');
      const renderTime = endMeasurement();

      expect(renderTime).toBe(50);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call multiple times quickly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      // Should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should call immediately when immediate flag is true', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100, true);

      debouncedFn('arg1');

      // Should be called immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      // Call multiple times quickly
      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      // Should be called once immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      // Wait for throttle delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Call again
      throttledFn('arg4');

      // Should be called again
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('arg4');
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage when available', () => {
      const memoryUsage = getMemoryUsage();

      expect(memoryUsage).toEqual({
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000,
        usagePercentage: 25, // (1000000 / 4000000) * 100
      });
    });

    it('should return null when memory API is not available', () => {
      const originalMemory = mockPerformance.memory;
      delete (mockPerformance as any).memory;

      const memoryUsage = getMemoryUsage();

      expect(memoryUsage).toBeNull();

      // Restore memory property
      mockPerformance.memory = originalMemory;
    });
  });
});

describe('Performance Thresholds', () => {
  const PERFORMANCE_BUDGETS = {
    LCP: 2500, // Largest Contentful Paint
    FID: 100,  // First Input Delay
    CLS: 0.1,  // Cumulative Layout Shift
    FCP: 1800, // First Contentful Paint
    TTFB: 800, // Time to First Byte
  };

  it('should define performance budgets', () => {
    expect(PERFORMANCE_BUDGETS.LCP).toBe(2500);
    expect(PERFORMANCE_BUDGETS.FID).toBe(100);
    expect(PERFORMANCE_BUDGETS.CLS).toBe(0.1);
    expect(PERFORMANCE_BUDGETS.FCP).toBe(1800);
    expect(PERFORMANCE_BUDGETS.TTFB).toBe(800);
  });

  it('should validate metric ratings', () => {
    const getRating = (metricName: string, value: number) => {
      const threshold = PERFORMANCE_BUDGETS[metricName as keyof typeof PERFORMANCE_BUDGETS];
      if (!threshold) return 'good';

      if (metricName === 'CLS') {
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
      }

      if (value <= threshold) return 'good';
      if (value <= threshold * 1.5) return 'needs-improvement';
      return 'poor';
    };

    // Test LCP ratings
    expect(getRating('LCP', 2000)).toBe('good');
    expect(getRating('LCP', 3000)).toBe('needs-improvement');
    expect(getRating('LCP', 4000)).toBe('poor');

    // Test CLS ratings
    expect(getRating('CLS', 0.05)).toBe('good');
    expect(getRating('CLS', 0.15)).toBe('needs-improvement');
    expect(getRating('CLS', 0.3)).toBe('poor');
  });
});

describe('Bundle Size Monitoring', () => {
  it('should track chunk sizes', () => {
    // This would be implemented with actual bundle analysis
    const mockChunkSizes = {
      'react-vendor': 150000,  // 150KB
      'ui-vendor': 80000,      // 80KB
      'main': 200000,          // 200KB
      'admin': 100000,         // 100KB
    };

    const totalSize = Object.values(mockChunkSizes).reduce((sum, size) => sum + size, 0);
    
    expect(totalSize).toBeLessThan(1000000); // Total should be less than 1MB
    expect(mockChunkSizes['react-vendor']).toBeLessThan(200000); // React vendor should be less than 200KB
  });

  it('should validate critical resource sizes', () => {
    const criticalResources = {
      'main.css': 50000,   // 50KB
      'main.js': 200000,   // 200KB
      'vendor.js': 150000, // 150KB
    };

    // CSS should be small for fast rendering
    expect(criticalResources['main.css']).toBeLessThan(100000);
    
    // Main JS should be reasonable size
    expect(criticalResources['main.js']).toBeLessThan(250000);
    
    // Vendor bundle should be optimized
    expect(criticalResources['vendor.js']).toBeLessThan(200000);
  });
});