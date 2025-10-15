import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SystemAnalytics } from '../SystemAnalytics';
import { adminService } from '../../../services';
import type { PlatformAnalytics } from '../../../types/admin';

// Mock the admin service
vi.mock('../../../services', () => ({
  adminService: {
    getPlatformAnalytics: vi.fn(),
  },
}));

const mockAnalytics: PlatformAnalytics = {
  bookingTrends: [
    { date: '2024-01-10', bookings: 45, revenue: 2250 },
    { date: '2024-01-11', bookings: 52, revenue: 2600 },
    { date: '2024-01-12', bookings: 38, revenue: 1900 },
    { date: '2024-01-13', bookings: 61, revenue: 3050 },
    { date: '2024-01-14', bookings: 47, revenue: 2350 },
  ],
  userActivity: [
    { date: '2024-01-10', activeUsers: 120, newUsers: 15 },
    { date: '2024-01-11', activeUsers: 135, newUsers: 22 },
    { date: '2024-01-12', activeUsers: 98, newUsers: 8 },
    { date: '2024-01-13', activeUsers: 156, newUsers: 31 },
    { date: '2024-01-14', activeUsers: 142, newUsers: 18 },
  ],
  popularEvents: [
    { id: '1', title: 'Summer Music Festival', bookings: 250, revenue: 12500 },
    { id: '2', title: 'Comedy Night', bookings: 180, revenue: 5400 },
    { id: '3', title: 'Art Exhibition', bookings: 95, revenue: 2850 },
  ],
  popularTheaters: [
    { id: '1', name: 'Grand Cinema', bookings: 420, revenue: 21000 },
    { id: '2', name: 'Downtown Theater', bookings: 315, revenue: 15750 },
    { id: '3', name: 'Mall Multiplex', bookings: 280, revenue: 14000 },
  ],
  performanceMetrics: {
    avgResponseTime: 450,
    errorRate: 0.8,
    uptime: 99.95,
  },
};

describe('SystemAnalytics', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getPlatformAnalytics as any).mockResolvedValue(mockAnalytics);
  });

  it('renders system analytics interface', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Platform performance metrics and insights')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument(); // Default date range
  });

  it('displays performance metrics with correct status colors', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Average Response Time')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('ms')).toBeInTheDocument();

      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('0.80')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();

      expect(screen.getByText('System Uptime')).toBeInTheDocument();
      expect(screen.getByText('99.95')).toBeInTheDocument();
    });
  });

  it('renders booking trends chart', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Booking Trends')).toBeInTheDocument();
    });

    // Check chart legend
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('Revenue ($)')).toBeInTheDocument();
  });

  it('renders user activity chart', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
    });

    // Check chart legend
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('New Users')).toBeInTheDocument();
  });

  it('displays top events list', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Top Events')).toBeInTheDocument();
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
      expect(screen.getByText('Comedy Night')).toBeInTheDocument();
      expect(screen.getByText('Art Exhibition')).toBeInTheDocument();
    });

    // Check booking counts and revenue
    expect(screen.getByText('250 bookings')).toBeInTheDocument();
    expect(screen.getByText('$12,500')).toBeInTheDocument();
    expect(screen.getByText('180 bookings')).toBeInTheDocument();
    expect(screen.getByText('$5,400')).toBeInTheDocument();
  });

  it('displays top theaters list', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Top Theaters')).toBeInTheDocument();
      expect(screen.getByText('Grand Cinema')).toBeInTheDocument();
      expect(screen.getByText('Downtown Theater')).toBeInTheDocument();
      expect(screen.getByText('Mall Multiplex')).toBeInTheDocument();
    });

    // Check booking counts and revenue
    expect(screen.getByText('420 bookings')).toBeInTheDocument();
    expect(screen.getByText('$21,000')).toBeInTheDocument();
  });

  it('handles date range changes', async () => {
    render(<SystemAnalytics />);

    const dateRangeSelect = screen.getByDisplayValue('Last 30 days');
    await user.selectOptions(dateRangeSelect, '7d');

    await waitFor(() => {
      expect(adminService.getPlatformAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String),
        })
      );
    });
  });

  it('calculates date ranges correctly', async () => {
    render(<SystemAnalytics />);

    // Test 7 days range
    const dateRangeSelect = screen.getByDisplayValue('Last 30 days');
    await user.selectOptions(dateRangeSelect, '7d');

    await waitFor(() => {
      const calls = (adminService.getPlatformAnalytics as any).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      
      const startDate = new Date(lastCall.start);
      const endDate = new Date(lastCall.end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBe(7);
    });
  });

  it('handles API errors gracefully', async () => {
    (adminService.getPlatformAnalytics as any).mockRejectedValue(new Error('API Error'));
    
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    (adminService.getPlatformAnalytics as any).mockImplementation(() => new Promise(() => {}));
    
    render(<SystemAnalytics />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    (adminService.getPlatformAnalytics as any).mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockAnalytics);
    
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });
  });

  it('formats large numbers correctly in charts', async () => {
    const largeNumberAnalytics: PlatformAnalytics = {
      ...mockAnalytics,
      popularEvents: [
        { id: '1', title: 'Mega Event', bookings: 1500000, revenue: 75000000 },
      ],
      popularTheaters: [
        { id: '1', name: 'Super Theater', bookings: 2500000, revenue: 125000000 },
      ],
    };

    (adminService.getPlatformAnalytics as any).mockResolvedValue(largeNumberAnalytics);
    
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('$75,000,000')).toBeInTheDocument();
      expect(screen.getByText('$125,000,000')).toBeInTheDocument();
    });
  });

  it('shows empty state when no data is available', async () => {
    const emptyAnalytics: PlatformAnalytics = {
      bookingTrends: [],
      userActivity: [],
      popularEvents: [],
      popularTheaters: [],
      performanceMetrics: {
        avgResponseTime: 0,
        errorRate: 0,
        uptime: 0,
      },
    };

    (adminService.getPlatformAnalytics as any).mockResolvedValue(emptyAnalytics);
    
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getAllByText('No data available')).toHaveLength(4); // 2 charts + 2 lists
    });
  });

  it('applies correct status colors for performance metrics', async () => {
    const criticalMetrics: PlatformAnalytics = {
      ...mockAnalytics,
      performanceMetrics: {
        avgResponseTime: 1500, // Critical (>1000)
        errorRate: 6.5, // Critical (>5)
        uptime: 98.5, // Critical (<99)
      },
    };

    (adminService.getPlatformAnalytics as any).mockResolvedValue(criticalMetrics);
    
    render(<SystemAnalytics />);

    await waitFor(() => {
      const responseTimeValue = screen.getByText('1500');
      const errorRateValue = screen.getByText('6.50');
      const uptimeValue = screen.getByText('98.50');

      expect(responseTimeValue).toHaveClass('text-red-600');
      expect(errorRateValue).toHaveClass('text-red-600');
      expect(uptimeValue).toHaveClass('text-red-600');
    });
  });

  it('shows warning status for borderline metrics', async () => {
    const warningMetrics: PlatformAnalytics = {
      ...mockAnalytics,
      performanceMetrics: {
        avgResponseTime: 750, // Warning (500-1000)
        errorRate: 3.0, // Warning (1-5)
        uptime: 99.5, // Warning (99-99.9)
      },
    };

    (adminService.getPlatformAnalytics as any).mockResolvedValue(warningMetrics);
    
    render(<SystemAnalytics />);

    await waitFor(() => {
      const responseTimeValue = screen.getByText('750');
      const errorRateValue = screen.getByText('3.00');
      const uptimeValue = screen.getByText('99.50');

      expect(responseTimeValue).toHaveClass('text-yellow-600');
      expect(errorRateValue).toHaveClass('text-yellow-600');
      expect(uptimeValue).toHaveClass('text-yellow-600');
    });
  });

  it('renders chart tooltips on hover', async () => {
    render(<SystemAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Booking Trends')).toBeInTheDocument();
    });

    // Find chart bars and check they have title attributes for tooltips
    const chartBars = screen.getAllByTitle(/Bookings: \d+/);
    expect(chartBars.length).toBeGreaterThan(0);
  });
});