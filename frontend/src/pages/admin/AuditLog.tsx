import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select } from '../../components/ui';
import { LoadingSpinner, Pagination } from '../../components/common';
import { adminService } from '../../services';
import type { AuditLogEntry, AuditLogFilters } from '../../types/admin';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    const actionType = action.toLowerCase();
    if (actionType.includes('create')) {
      return 'bg-green-100 text-green-800';
    }
    if (actionType.includes('update') || actionType.includes('edit')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (actionType.includes('delete') || actionType.includes('remove')) {
      return 'bg-red-100 text-red-800';
    }
    if (actionType.includes('login') || actionType.includes('auth')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) {
      return 'No additional details';
    }

    return Object.entries(details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Resource
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP Address
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(log.timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{log.userEmail}</div>
                <div className="text-xs text-gray-500">ID: {log.userId}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                  {log.action}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{log.resource}</div>
                <div className="text-xs text-gray-500">ID: {log.resourceId}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                <div className="truncate" title={formatDetails(log.details)}>
                  {formatDetails(log.details)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.ipAddress}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="w-40"
      />
      <span className="text-gray-500">to</span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="w-40"
      />
    </div>
  );
};

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchLogs = async (page = 1) => {
    const filtersWithDateRange = {
      ...filters,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
    };

    try {
      setLoading(true);
      const response = await adminService.getAuditLogs(filtersWithDateRange, page, 50);
      setLogs(response.logs);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const filtersWithDateRange = {
        ...filters,
        dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      };
      
      const blob = await adminService.exportData('audit_logs', format, filtersWithDateRange);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert(`Failed to export audit logs as ${format.toUpperCase()}`);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600">Track system actions and changes</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={loading}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Search by user ID or email..."
            value={filters.userId || ''}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
          />
          <Select
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            placeholder="All Actions"
            options={[
              { value: '', label: 'All Actions' },
              { value: 'CREATE', label: 'Create' },
              { value: 'UPDATE', label: 'Update' },
              { value: 'DELETE', label: 'Delete' },
              { value: 'LOGIN', label: 'Login' },
              { value: 'LOGOUT', label: 'Logout' },
              { value: 'APPROVE', label: 'Approve' },
              { value: 'REJECT', label: 'Reject' },
            ]}
          />
          <Select
            value={filters.resource || ''}
            onChange={(e) => handleFilterChange('resource', e.target.value)}
            placeholder="All Resources"
            options={[
              { value: '', label: 'All Resources' },
              { value: 'user', label: 'User' },
              { value: 'event', label: 'Event' },
              { value: 'movie', label: 'Movie' },
              { value: 'theater', label: 'Theater' },
              { value: 'booking', label: 'Booking' },
              { value: 'ticket', label: 'Ticket' },
            ]}
          />
          <Button
            variant="outline"
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchLogs(pagination.page)}>
              Retry
            </Button>
          </div>
        ) : logs.length > 0 ? (
          <>
            <AuditLogTable logs={logs} />
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * 50) + 1} to {Math.min(pagination.page * 50, pagination.total)} of {pagination.total} entries
                </p>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-600">
              No audit logs match the current filters and date range.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;