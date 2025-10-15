import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { UserManagement } from '../UserManagement';
import { adminService } from '../../../services';
import type { UserManagementData } from '../../../types';

// Mock the admin service
vi.mock('../../../services', () => ({
  adminService: {
    getUsers: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

const mockUsers: UserManagementData[] = [
  {
    id: '1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'customer',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    lastLogin: '2024-01-20T14:45:00Z',
    totalBookings: 5,
    totalSpent: 250.00,
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'event_owner',
    isActive: false,
    createdAt: '2024-01-10T09:15:00Z',
    lastLogin: '2024-01-18T11:20:00Z',
    totalBookings: 0,
    totalSpent: 0,
  },
];

const mockUsersResponse = {
  users: mockUsers,
  total: 2,
  page: 1,
  totalPages: 1,
};

describe('UserManagement', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getUsers as any).mockResolvedValue(mockUsersResponse);
  });

  it('renders user management interface', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
  });

  it('displays users in table format', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    });

    // Check role badges
    expect(screen.getByText('customer')).toBeInTheDocument();
    expect(screen.getByText('event owner')).toBeInTheDocument();

    // Check status indicators
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    // Check activity data
    expect(screen.getByText('5 bookings')).toBeInTheDocument();
    expect(screen.getByText('$250.00 spent')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<UserManagement />);

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        { search: 'john' },
        1,
        20
      );
    });
  });

  it('handles role filtering', async () => {
    render(<UserManagement />);

    const roleSelect = screen.getByDisplayValue('All Roles');
    await user.selectOptions(roleSelect, 'customer');

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        { role: 'customer' },
        1,
        20
      );
    });
  });

  it('handles status filtering', async () => {
    render(<UserManagement />);

    const statusSelect = screen.getByDisplayValue('All Status');
    await user.selectOptions(statusSelect, 'true');

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        { isActive: true },
        1,
        20
      );
    });
  });

  it('clears filters when clear button is clicked', async () => {
    render(<UserManagement />);

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'test');

    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('handles role updates', async () => {
    (adminService.updateUserRole as any).mockResolvedValue(undefined);
    
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find the role select for John Doe and change it
    const roleSelects = screen.getAllByDisplayValue('customer');
    await user.selectOptions(roleSelects[0], 'admin');

    await waitFor(() => {
      expect(adminService.updateUserRole).toHaveBeenCalledWith({
        userId: '1',
        newRole: 'admin',
      });
    });
  });

  it('handles status updates', async () => {
    (adminService.updateUserStatus as any).mockResolvedValue(undefined);
    
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the deactivate button for John Doe
    const deactivateButton = screen.getByText('Deactivate');
    await user.click(deactivateButton);

    await waitFor(() => {
      expect(adminService.updateUserStatus).toHaveBeenCalledWith({
        userId: '1',
        isActive: false,
      });
    });
  });

  it('opens delete confirmation modal', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the delete button for John Doe
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete the user/)).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });
  });

  it('handles user deletion with reason', async () => {
    (adminService.deleteUser as any).mockResolvedValue(undefined);
    
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open delete modal
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    // Enter deletion reason
    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion');
    await user.type(reasonInput, 'Spam account');

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete User' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith('1', 'Spam account');
    });
  });

  it('prevents deletion without reason', async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open delete modal
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    // Try to confirm without reason
    const confirmButton = screen.getByRole('button', { name: 'Delete User' });
    await user.click(confirmButton);

    // Modal should still be open
    expect(screen.getByText('Delete User')).toBeInTheDocument();
    expect(adminService.deleteUser).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    (adminService.getUsers as any).mockRejectedValue(new Error('API Error'));
    
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays pagination when multiple pages exist', async () => {
    const multiPageResponse = {
      ...mockUsersResponse,
      total: 50,
      totalPages: 3,
    };
    (adminService.getUsers as any).mockResolvedValue(multiPageResponse);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 20 of 50 users')).toBeInTheDocument();
    });
  });

  it('handles role update errors', async () => {
    (adminService.updateUserRole as any).mockRejectedValue(new Error('Update failed'));
    
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const roleSelects = screen.getAllByDisplayValue('customer');
    await user.selectOptions(roleSelects[0], 'admin');

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to update user role');
    });

    alertSpy.mockRestore();
  });
});