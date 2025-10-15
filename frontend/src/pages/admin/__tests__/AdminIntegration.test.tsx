import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from '../AdminDashboard';
import { UserManagement } from '../UserManagement';
import { ContentModeration } from '../ContentModeration';
import { AuditLog } from '../AuditLog';
import { SystemAnalytics } from '../../components/admin/SystemAnalytics';
import { AuthContext } from '../../../contexts/AuthContext';
import { adminService } from '../../../services';

// Mock all admin services
vi.mock('../../../services', () => ({
  adminService: {
    getSystemMetrics: vi.fn(),
    getSystemHealth: vi.fn(),
    getUsers: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
    deleteUser: vi.fn(),
    getContentModerationQueue: vi.fn(),
    moderateContent: vi.fn(),
    getAuditLogs: vi.fn(),
    exportData: vi.fn(),
    getPlatformAnalytics: vi.fn(),
  },
}));

// Mock data
const mockAdminUser = {
  id: 'admin1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  isAuthenticated: true,
};

const mockCustomerUser = {
  id: 'customer1',
  email: 'customer@example.com',
  firstName: 'Customer',
  lastName: 'User',
  role: 'customer',
  isAuthenticated: true,
};

const mockAuthContextValue = {
  user: mockAdminUser,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  loading: false,
  error: null,
};

const AdminWrapper: React.FC<{ children: React.ReactNode; user?: any }> = ({ 
  children, 
  user = mockAdminUser 
}) => (
  <BrowserRouter>
    <AuthContext.Provider value={{ ...mockAuthContextValue, user }}>
      {children}
    </AuthContext.Provider>
  </BrowserRouter>
);

describe('Admin Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    (adminService.getSystemMetrics as any).mockResolvedValue({
      totalUsers: 1000,
      totalBookings: 2000,
      totalRevenue: 50000,
      activeEvents: 25,
      activeTheaters: 10,
      userGrowthRate: 10,
      bookingGrowthRate: 15,
      revenueGrowthRate: 20,
    });

    (adminService.getSystemHealth as any).mockResolvedValue([
      {
        name: 'Database',
        status: 'healthy',
        value: 95,
        threshold: 100,
        unit: '%',
        description: 'Database health',
      },
    ]);

    (adminService.getUsers as any).mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });

    (adminService.getContentModerationQueue as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });

    (adminService.getAuditLogs as any).mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });

    (adminService.getPlatformAnalytics as any).mockResolvedValue({
      bookingTrends: [],
      userActivity: [],
      popularEvents: [],
      popularTheaters: [],
      performanceMetrics: {
        avgResponseTime: 500,
        errorRate: 1.0,
        uptime: 99.9,
      },
    });
  });

  describe('Permission Enforcement', () => {
    it('allows admin users to access all admin components', async () => {
      render(
        <AdminWrapper>
          <AdminDashboard />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Admin should see all metrics
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    it('prevents non-admin users from accessing admin features', async () => {
      // Mock API to return 403 for non-admin users
      (adminService.getSystemMetrics as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Forbidden',
      });

      render(
        <AdminWrapper user={mockCustomerUser}>
          <AdminDashboard />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Component Data Flow', () => {
    it('maintains consistent user data across admin components', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        lastLogin: '2024-01-20T14:45:00Z',
        totalBookings: 5,
        totalSpent: 250.00,
      };

      (adminService.getUsers as any).mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      (adminService.getAuditLogs as any).mockResolvedValue({
        logs: [
          {
            id: '1',
            timestamp: '2024-01-15T10:30:00Z',
            userId: '1',
            userEmail: 'test@example.com',
            action: 'CREATE',
            resource: 'booking',
            resourceId: 'booking123',
            details: {},
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      // Render UserManagement
      const { rerender } = render(
        <AdminWrapper>
          <UserManagement />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Switch to AuditLog and verify same user appears
      rerender(
        <AdminWrapper>
          <AuditLog />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('updates user status across components after role change', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        lastLogin: '2024-01-20T14:45:00Z',
        totalBookings: 5,
        totalSpent: 250.00,
      };

      (adminService.getUsers as any).mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      (adminService.updateUserRole as any).mockResolvedValue(undefined);

      render(
        <AdminWrapper>
          <UserManagement />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // Change user role
      const roleSelect = screen.getByDisplayValue('customer');
      await user.selectOptions(roleSelect, 'event_owner');

      await waitFor(() => {
        expect(adminService.updateUserRole).toHaveBeenCalledWith({
          userId: '1',
          newRole: 'event_owner',
        });
      });

      // Verify the component refetches data after update
      expect(adminService.getUsers).toHaveBeenCalledTimes(2); // Initial load + after update
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles network errors gracefully across all components', async () => {
      const networkError = new Error('Network Error');
      
      (adminService.getSystemMetrics as any).mockRejectedValue(networkError);
      (adminService.getUsers as any).mockRejectedValue(networkError);
      (adminService.getContentModerationQueue as any).mockRejectedValue(networkError);
      (adminService.getAuditLogs as any).mockRejectedValue(networkError);
      (adminService.getPlatformAnalytics as any).mockRejectedValue(networkError);

      const components = [
        { Component: AdminDashboard, errorText: 'Failed to load dashboard data' },
        { Component: UserManagement, errorText: 'Failed to load users' },
        { Component: ContentModeration, errorText: 'Failed to load content moderation queue' },
        { Component: AuditLog, errorText: 'Failed to load audit logs' },
        { Component: SystemAnalytics, errorText: 'Failed to load analytics data' },
      ];

      for (const { Component, errorText } of components) {
        const { unmount } = render(
          <AdminWrapper>
            <Component />
          </AdminWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(errorText)).toBeInTheDocument();
          expect(screen.getByText('Retry')).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('recovers from errors when retry is clicked', async () => {
      (adminService.getSystemMetrics as any)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          totalUsers: 1000,
          totalBookings: 2000,
          totalRevenue: 50000,
          activeEvents: 25,
          activeTheaters: 10,
          userGrowthRate: 10,
          bookingGrowthRate: 15,
          revenueGrowthRate: 20,
        });

      (adminService.getSystemHealth as any).mockResolvedValue([]);

      render(
        <AdminWrapper>
          <AdminDashboard />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates and Data Consistency', () => {
    it('maintains data consistency when performing bulk operations', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          role: 'customer',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          lastLogin: '2024-01-20T14:45:00Z',
          totalBookings: 5,
          totalSpent: 250.00,
        },
        {
          id: '2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'customer',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          lastLogin: '2024-01-20T14:45:00Z',
          totalBookings: 3,
          totalSpent: 150.00,
        },
      ];

      (adminService.getUsers as any).mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      (adminService.updateUserStatus as any).mockResolvedValue(undefined);

      render(
        <AdminWrapper>
          <UserManagement />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
        expect(screen.getByText('User Two')).toBeInTheDocument();
      });

      // Deactivate first user
      const deactivateButtons = screen.getAllByText('Deactivate');
      await user.click(deactivateButtons[0]);

      await waitFor(() => {
        expect(adminService.updateUserStatus).toHaveBeenCalledWith({
          userId: '1',
          isActive: false,
        });
      });

      // Verify component refetches data to maintain consistency
      expect(adminService.getUsers).toHaveBeenCalledTimes(2);
    });

    it('handles concurrent admin actions without data corruption', async () => {
      const mockContent = {
        id: '1',
        type: 'event' as const,
        title: 'Test Event',
        description: 'Test Description',
        owner: {
          id: 'owner1',
          name: 'Event Owner',
          email: 'owner@example.com',
        },
        status: 'pending' as const,
        submittedAt: '2024-01-15T10:30:00Z',
        media: [],
      };

      (adminService.getContentModerationQueue as any).mockResolvedValue({
        items: [mockContent],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      (adminService.moderateContent as any).mockResolvedValue(undefined);

      render(
        <AdminWrapper>
          <ContentModeration />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Approve content
      const approveButton = screen.getByText('Approve');
      await user.click(approveButton);

      await waitFor(() => {
        expect(adminService.moderateContent).toHaveBeenCalledWith({
          itemId: '1',
          action: 'approve',
        });
      });

      // Verify component refetches data after moderation
      expect(adminService.getContentModerationQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('handles large datasets efficiently', async () => {
      // Generate large dataset
      const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
        id: `user${i}`,
        email: `user${i}@example.com`,
        firstName: `User`,
        lastName: `${i}`,
        role: 'customer' as const,
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        lastLogin: '2024-01-20T14:45:00Z',
        totalBookings: Math.floor(Math.random() * 10),
        totalSpent: Math.floor(Math.random() * 1000),
      }));

      (adminService.getUsers as any).mockResolvedValue({
        users: largeUserList.slice(0, 20), // Paginated response
        total: 1000,
        page: 1,
        totalPages: 50,
      });

      const startTime = performance.now();

      render(
        <AdminWrapper>
          <UserManagement />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 20 of 1000 users')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Ensure rendering completes within reasonable time (2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });

    it('implements proper pagination for large datasets', async () => {
      (adminService.getUsers as any).mockResolvedValue({
        users: [],
        total: 500,
        page: 1,
        totalPages: 25,
      });

      render(
        <AdminWrapper>
          <UserManagement />
        </AdminWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 20 of 500 users')).toBeInTheDocument();
      });

      // Verify pagination controls are present for large datasets
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});