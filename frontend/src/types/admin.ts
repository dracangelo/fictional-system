export interface SystemMetrics {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  activeEvents: number;
  activeTheaters: number;
  userGrowthRate: number;
  bookingGrowthRate: number;
  revenueGrowthRate: number;
}

export interface SystemHealthIndicator {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: number;
  unit: string;
  description: string;
}

export interface UserManagementData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'event_owner' | 'theater_owner' | 'admin';
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  totalBookings: number;
  totalSpent: number;
}

export interface UserManagementFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ContentModerationItem {
  id: string;
  type: 'event' | 'movie';
  title: string;
  description: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  media?: string[];
}

export interface PlatformAnalytics {
  bookingTrends: {
    date: string;
    bookings: number;
    revenue: number;
  }[];
  userActivity: {
    date: string;
    activeUsers: number;
    newUsers: number;
  }[];
  popularEvents: {
    id: string;
    title: string;
    bookings: number;
    revenue: number;
  }[];
  popularTheaters: {
    id: string;
    name: string;
    bookings: number;
    revenue: number;
  }[];
  performanceMetrics: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface UserRoleUpdate {
  userId: string;
  newRole: 'customer' | 'event_owner' | 'theater_owner' | 'admin';
}

export interface UserStatusUpdate {
  userId: string;
  isActive: boolean;
  reason?: string;
}

export interface ContentModerationAction {
  itemId: string;
  action: 'approve' | 'reject';
  reason?: string;
}