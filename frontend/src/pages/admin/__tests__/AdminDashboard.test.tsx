import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AdminDashboard } from '../AdminDashboard';
import { adminService } from '../../../services';
import type { SystemMetrics, SystemHealthIndicator } from '../../../types';

// Mock the admin service
vi.mock('../../../services', () => ({
  adminService: {
    getSystemMetrics: vi.fn(),
    getSystemHealth: vi.fn(),
  },
}));

const mockMetrics: SystemMetrics = {
  totalUsers: 1250,
  totalBookings: 3420,
  totalRevenue: 125000,
  activeEvents: 45,
  activeTheaters: 12,
  userGrowthRate: 15.5,
  bookingGrowthRate: 22.3,
  revenueGrowthRate: 18.7,
};

const mockHealthIndicators: SystemHealthIndicator[] = [
  {
    name: 'Database Connection',
    status: 'healthy',
    value: 95,
    threshold: 100,
    unit: '%',
    description: 'Database connection pool utilization',
  },
  {
    name: 'Memory Usage',
    status: 'warning',
    value: 75,
    threshold: 80,
    unit: '%',
    description: 'System memory utilization',
  },
  {
    name: 'API Response Time',
    status: 'critical',
    value: 1200,
    threshold: 1000,
    unit: 'ms',
    description: 'Average API response time',
  },
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (adminService.getSystemMetrics as any).mockImplementation(() => new Promise(() => {}));
    (adminService.getSystemHealth as any).mockImplementation(() => new Promise(() => {}));

    render(<AdminDashboard />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders dashboard with metrics and health indicators', async () => {
    (adminService.getSystemMetrics as any).mockResolvedValue(mockMetrics);
    (adminService.getSystemHealth as any).mockResolvedValue(mockHealthIndicators);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Check metrics are displayed
    expect(screen.getByText('1.3K')).toBeInTheDocument(); // Total Users formatted
    expect(screen.getByText('3.4K')).toBeInTheDocument(); // Total Bookings formatted
    expect(screen.getByText('125K')).toBeInTheDocument(); // Total Revenue formatted
    expect(screen.getByText('45')).toBeInTheDocument(); // Active Events

    // Check growth rates
    expect(screen.getByText('+15.5% from last month')).toBeInTheDocument();
    expect(screen.getByText('+22.3% from last month')).toBeInTheDocument();
    expect(screen.getByText('+18.7% from last month')).toBeInTheDocument();

    // Check health indicators
    expect(screen.getByText('Database Connection')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('API Response Time')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('handles error state correctly', async () => {
    (adminService.getSystemMetrics as any).mockRejectedValue(new Error('API Error'));
    (adminService.getSystemHealth as any).mockRejectedValue(new Error('API Error'));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('formats large numbers correctly', async () => {
    const largeMetrics: SystemMetrics = {
      ...mockMetrics,
      totalUsers: 1500000, // 1.5M
      totalBookings: 2500000, // 2.5M
      totalRevenue: 50000000, // 50M
    };

    (adminService.getSystemMetrics as any).mockResolvedValue(largeMetrics);
    (adminService.getSystemHealth as any).mockResolvedValue(mockHealthIndicators);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1.5M')).toBeInTheDocument();
      expect(screen.getByText('2.5M')).toBeInTheDocument();
      expect(screen.getByText('50.0M')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', async () => {
    (adminService.getSystemMetrics as any).mockResolvedValue(mockMetrics);
    (adminService.getSystemHealth as any).mockResolvedValue(mockHealthIndicators);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('Content Moderation')).toBeInTheDocument();
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
    });
  });

  it('handles negative growth rates correctly', async () => {
    const negativeGrowthMetrics: SystemMetrics = {
      ...mockMetrics,
      userGrowthRate: -5.2,
      bookingGrowthRate: -10.1,
    };

    (adminService.getSystemMetrics as any).mockResolvedValue(negativeGrowthMetrics);
    (adminService.getSystemHealth as any).mockResolvedValue(mockHealthIndicators);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('-5.2% from last month')).toBeInTheDocument();
      expect(screen.getByText('-10.1% from last month')).toBeInTheDocument();
    });
  });

  it('renders health indicator progress bars correctly', async () => {
    (adminService.getSystemMetrics as any).mockResolvedValue(mockMetrics);
    (adminService.getSystemHealth as any).mockResolvedValue(mockHealthIndicators);

    render(<AdminDashboard />);

    await waitFor(() => {
      // Check that progress bars are rendered
      const progressBars = screen.getAllByRole('progressbar', { hidden: true });
      expect(progressBars).toHaveLength(mockHealthIndicators.length);
    });
  });
});