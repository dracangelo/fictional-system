import React, { useState, useEffect } from 'react';
import { Card, Button, Select } from '../ui';
import { LoadingSpinner } from '../common';
import { adminService } from '../../services';
import type { PlatformAnalytics } from '../../types/admin';

interface ChartProps {
  data: Array<{ date: string; [key: string]: any }>;
  xKey: string;
  yKeys: Array<{ key: string; label: string; color: string }>;
  title: string;
}

const SimpleChart: React.FC<ChartProps> = ({ data, xKey, yKeys, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap(item => yKeys.map(yKey => item[yKey.key] || 0))
  );

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-64 relative">
        <div className="absolute inset-0 flex items-end justify-between space-x-1">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col justify-end h-full space-y-1">
                {yKeys.map((yKey, yIndex) => {
                  const value = item[yKey.key] || 0;
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  return (
                    <div
                      key={yIndex}
                      className="w-full rounded-t"
                      style={{
                        height: `${height}%`,
                        backgroundColor: yKey.color,
                        minHeight: value > 0 ? '2px' : '0px',
                      }}
                      title={`${yKey.label}: ${value.toLocaleString()}`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                {new Date(item[xKey]).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        {yKeys.map((yKey, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: yKey.color }}
            />
            <span className="text-sm text-gray-600">{yKey.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  description?: string;
  status?: 'good' | 'warning' | 'critical';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, description, status = 'good' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
      <div className={`text-2xl font-bold ${getStatusColor()}`}>
        {formatValue(value)}
        {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
};

interface TopItemsListProps {
  title: string;
  items: Array<{
    id: string;
    title?: string;
    name?: string;
    bookings: number;
    revenue: number;
  }>;
  type: 'events' | 'theaters';
}

const TopItemsList: React.FC<TopItemsListProps> = ({ title, items, type }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {type === 'events' ? item.title : item.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.bookings} bookings
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(item.revenue)}</p>
                <p className="text-sm text-gray-500">revenue</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
};

export const SystemAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const getDateRange = (range: '7d' | '30d' | '90d') => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateRange);
      const data = await adminService.getPlatformAnalytics(range);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchAnalytics}>
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
          <p className="text-gray-600">Platform performance metrics and insights</p>
        </div>
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
          className="w-32"
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
          ]}
        />
      </div>

      {/* Performance Metrics */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Average Response Time"
            value={analytics.performanceMetrics.avgResponseTime}
            unit="ms"
            description="API response time"
            status={analytics.performanceMetrics.avgResponseTime > 1000 ? 'critical' : 
                    analytics.performanceMetrics.avgResponseTime > 500 ? 'warning' : 'good'}
          />
          <MetricCard
            title="Error Rate"
            value={analytics.performanceMetrics.errorRate.toFixed(2)}
            unit="%"
            description="System error rate"
            status={analytics.performanceMetrics.errorRate > 5 ? 'critical' : 
                    analytics.performanceMetrics.errorRate > 1 ? 'warning' : 'good'}
          />
          <MetricCard
            title="System Uptime"
            value={analytics.performanceMetrics.uptime.toFixed(2)}
            unit="%"
            description="System availability"
            status={analytics.performanceMetrics.uptime < 99 ? 'critical' : 
                    analytics.performanceMetrics.uptime < 99.9 ? 'warning' : 'good'}
          />
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <SimpleChart
            data={analytics.bookingTrends}
            xKey="date"
            yKeys={[
              { key: 'bookings', label: 'Bookings', color: '#3B82F6' },
              { key: 'revenue', label: 'Revenue ($)', color: '#10B981' },
            ]}
            title="Booking Trends"
          />
        </Card>

        <Card className="p-6">
          <SimpleChart
            data={analytics.userActivity}
            xKey="date"
            yKeys={[
              { key: 'activeUsers', label: 'Active Users', color: '#8B5CF6' },
              { key: 'newUsers', label: 'New Users', color: '#F59E0B' },
            ]}
            title="User Activity"
          />
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <TopItemsList
            title="Top Events"
            items={analytics.popularEvents}
            type="events"
          />
        </Card>

        <Card className="p-6">
          <TopItemsList
            title="Top Theaters"
            items={analytics.popularTheaters}
            type="theaters"
          />
        </Card>
      </div>
    </div>
  );
};