import { apiClient } from '../api';
import type {
  SystemMetrics,
  SystemHealthIndicator,
  UserManagementData,
  UserManagementFilters,
  ContentModerationItem,
  PlatformAnalytics,
  AuditLogEntry,
  AuditLogFilters,
  UserRoleUpdate,
  UserStatusUpdate,
  ContentModerationAction,
} from '../../types/admin';

class AdminService {
  // System Metrics and Health
  async getSystemMetrics(): Promise<SystemMetrics> {
    return apiClient.get<SystemMetrics>('/admin/metrics/');
  }

  async getSystemHealth(): Promise<SystemHealthIndicator[]> {
    return apiClient.get<SystemHealthIndicator[]>('/admin/health/');
  }

  // User Management
  async getUsers(
    filters?: UserManagementFilters,
    page = 1,
    limit = 20
  ): Promise<{
    users: UserManagementData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.role) {
      params.append('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      params.append('is_active', filters.isActive.toString());
    }
    if (filters?.dateRange) {
      params.append('date_start', filters.dateRange.start);
      params.append('date_end', filters.dateRange.end);
    }

    return apiClient.get(`/admin/users/?${params.toString()}`);
  }

  async updateUserRole(data: UserRoleUpdate): Promise<void> {
    return apiClient.patch(`/admin/users/${data.userId}/role/`, {
      role: data.newRole,
    });
  }

  async updateUserStatus(data: UserStatusUpdate): Promise<void> {
    return apiClient.patch(`/admin/users/${data.userId}/status/`, {
      is_active: data.isActive,
      reason: data.reason,
    });
  }

  async deleteUser(userId: string, reason: string): Promise<void> {
    return apiClient.delete(`/admin/users/${userId}/`, {
      data: { reason },
    });
  }

  // Content Moderation
  async getContentModerationQueue(
    type?: 'event' | 'movie',
    status?: 'pending' | 'approved' | 'rejected',
    page = 1,
    limit = 20
  ): Promise<{
    items: ContentModerationItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (type) {
      params.append('type', type);
    }
    if (status) {
      params.append('status', status);
    }

    return apiClient.get(`/admin/content-moderation/?${params.toString()}`);
  }

  async moderateContent(data: ContentModerationAction): Promise<void> {
    return apiClient.post(`/admin/content-moderation/${data.itemId}/`, {
      action: data.action,
      reason: data.reason,
    });
  }

  // Platform Analytics
  async getPlatformAnalytics(
    dateRange?: { start: string; end: string }
  ): Promise<PlatformAnalytics> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('date_start', dateRange.start);
      params.append('date_end', dateRange.end);
    }

    return apiClient.get(`/admin/analytics/?${params.toString()}`);
  }

  // Audit Logs
  async getAuditLogs(
    filters?: AuditLogFilters,
    page = 1,
    limit = 50
  ): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.userId) {
      params.append('user_id', filters.userId);
    }
    if (filters?.action) {
      params.append('action', filters.action);
    }
    if (filters?.resource) {
      params.append('resource', filters.resource);
    }
    if (filters?.dateRange) {
      params.append('date_start', filters.dateRange.start);
      params.append('date_end', filters.dateRange.end);
    }

    return apiClient.get(`/admin/audit-logs/?${params.toString()}`);
  }

  // System Actions
  async exportData(
    type: 'users' | 'bookings' | 'events' | 'audit_logs',
    format: 'csv' | 'json',
    filters?: Record<string, any>
  ): Promise<Blob> {
    const params = new URLSearchParams({
      type,
      format,
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/admin/export/?${params.toString()}`, {
      responseType: 'blob',
    });

    return response;
  }

  async sendSystemNotification(
    message: string,
    type: 'info' | 'warning' | 'error',
    targetUsers?: string[]
  ): Promise<void> {
    return apiClient.post('/admin/notifications/', {
      message,
      type,
      target_users: targetUsers,
    });
  }
}

export const adminService = new AdminService();