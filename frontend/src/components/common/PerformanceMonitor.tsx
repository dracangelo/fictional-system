import React, { useState } from 'react';
import { useWebVitals, useMemoryMonitoring, usePerformanceBudget } from '../../hooks/usePerformance';

interface PerformanceMonitorProps {
  showInProduction?: boolean;
}

/**
 * Development tool for monitoring performance metrics
 */
export function PerformanceMonitor({ showInProduction = false }: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { metrics, isLoading } = useWebVitals();
  const memoryUsage = useMemoryMonitoring();
  const budgetStatus = usePerformanceBudget();

  // Don't show in production unless explicitly enabled
  if (import.meta.env.PROD && !showInProduction) {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Show Performance Monitor"
      >
        📊
      </button>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMetricColor = (value: number | undefined, threshold: number, isReverse = false) => {
    if (!value) return 'text-gray-400';
    
    const isGood = isReverse ? value <= threshold : value >= threshold;
    const isOk = isReverse ? value <= threshold * 1.5 : value >= threshold * 0.75;
    
    if (isGood) return 'text-green-600';
    if (isOk) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Performance Score */}
      <div className="mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Performance Score</span>
          <span className={`text-lg font-bold ${
            budgetStatus.score >= 90 ? 'text-green-600' :
            budgetStatus.score >= 70 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {budgetStatus.score}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className={`h-2 rounded-full ${
              budgetStatus.score >= 90 ? 'bg-green-600' :
              budgetStatus.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
            }`}
            style={{ width: `${budgetStatus.score}%` }}
          />
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="space-y-2 mb-3">
        <h4 className="text-sm font-medium text-gray-700">Core Web Vitals</h4>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">LCP:</span>
            <span className={`ml-1 font-mono ${getMetricColor(metrics.LCP, 2500, true)}`}>
              {metrics.LCP ? `${metrics.LCP.toFixed(0)}ms` : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-600">FID:</span>
            <span className={`ml-1 font-mono ${getMetricColor(metrics.FID, 100, true)}`}>
              {metrics.FID ? `${metrics.FID.toFixed(0)}ms` : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-600">CLS:</span>
            <span className={`ml-1 font-mono ${getMetricColor(metrics.CLS, 0.1, true)}`}>
              {metrics.CLS ? metrics.CLS.toFixed(3) : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-600">FCP:</span>
            <span className={`ml-1 font-mono ${getMetricColor(metrics.FCP, 1800, true)}`}>
              {metrics.FCP ? `${metrics.FCP.toFixed(0)}ms` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      {memoryUsage && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Memory Usage</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Used:</span>
              <span className="font-mono">{formatBytes(memoryUsage.usedJSHeapSize)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-mono">{formatBytes(memoryUsage.totalJSHeapSize)}</span>
            </div>
            <div className="flex justify-between">
              <span>Usage:</span>
              <span className={`font-mono ${
                memoryUsage.usagePercentage > 80 ? 'text-red-600' :
                memoryUsage.usagePercentage > 60 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {memoryUsage.usagePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Budget Violations */}
      {budgetStatus.violations.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-red-600 mb-1">Budget Violations</h4>
          <div className="text-xs space-y-1">
            {budgetStatus.violations.slice(0, 3).map((violation, index) => (
              <div key={index} className="text-red-600">
                • {violation}
              </div>
            ))}
            {budgetStatus.violations.length > 3 && (
              <div className="text-red-600">
                ... and {budgetStatus.violations.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-xs text-gray-500 text-center">
          Loading metrics...
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight performance indicator for production
 */
export function PerformanceIndicator() {
  const budgetStatus = usePerformanceBudget();
  
  if (budgetStatus.isWithinBudget) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-300 rounded-md p-2 z-50">
      <div className="flex items-center space-x-2">
        <span className="text-red-600 text-sm">⚠️</span>
        <span className="text-red-800 text-xs font-medium">
          Performance issues detected
        </span>
      </div>
    </div>
  );
}