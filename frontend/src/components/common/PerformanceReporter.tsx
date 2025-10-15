import { useEffect } from 'react';
import { initializePerformanceMonitoring } from '../../utils/performance';

interface PerformanceReporterProps {
  apiEndpoint?: string;
  sampleRate?: number;
  enableInDevelopment?: boolean;
}

/**
 * Component that automatically reports performance metrics to analytics
 */
export function PerformanceReporter({
  apiEndpoint = '/api/analytics/performance',
  sampleRate = 0.1, // Report 10% of sessions
  enableInDevelopment = false,
}: PerformanceReporterProps) {
  useEffect(() => {
    // Only run in production unless explicitly enabled in development
    if (import.meta.env.DEV && !enableInDevelopment) {
      return;
    }

    // Sample sessions to avoid overwhelming analytics
    if (Math.random() > sampleRate) {
      return;
    }

    const monitor = initializePerformanceMonitoring();
    
    // Report metrics after page load
    const reportMetrics = () => {
      const metrics = monitor.getMetrics();
      
      if (metrics.length === 0) return;

      // Prepare metrics for reporting
      const report = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        metrics: metrics.reduce((acc, metric) => {
          acc[metric.name] = {
            value: metric.value,
            rating: metric.rating,
          };
          return acc;
        }, {} as Record<string, { value: number; rating: string }>),
        connection: getConnectionInfo(),
        deviceInfo: getDeviceInfo(),
      };

      // Send to analytics endpoint
      sendToAnalytics(report, apiEndpoint);
    };

    // Report after initial load
    setTimeout(reportMetrics, 5000);

    // Report on page unload
    const handleUnload = () => {
      reportMetrics();
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [apiEndpoint, sampleRate, enableInDevelopment]);

  return null; // This component doesn't render anything
}

function getConnectionInfo() {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  return null;
}

function getDeviceInfo() {
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

async function sendToAnalytics(report: any, endpoint: string) {
  try {
    // Use sendBeacon if available for reliability
    if ('sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify(report)], {
        type: 'application/json',
      });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback to fetch
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
        keepalive: true,
      });
    }
  } catch (error) {
    // Silently fail - don't impact user experience
    console.debug('Performance reporting failed:', error);
  }
}