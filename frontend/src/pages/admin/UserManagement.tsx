import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Modal } from '../../components/ui';
import { LoadingSpinner, Pagination } from '../../components/common';
import { adminService } from '../../services';
import type { UserManagementData, UserManagementFilters, UserRoleUpdate, UserStatusUpdate } from '../../types';

interface UserTableProps {
  users: UserManagementData[];
  onRoleUpdate: (userId: string, newRole: string) => void;
  onStatusUpdate: (userId: string, isActive: boolean) => void;
  onDeleteUser: (userId: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onRoleUpdate, onStatusUpdate, onDeleteUser }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'event_owner':
        return 'bg-blue-100 text-blue-800';
      case 'theater_owner':
        return 'bg-green-100 text-green-800';
      case 'customer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400">
                    Joined {formatDate(user.createdAt)}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                  {user.role.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-gray-900">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>{user.totalBookings} bookings</div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(user.totalSpent)} spent
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <Select
                  value={user.role}
                  onChange={(e) => onRoleUpdate(user.id, e.target.value)}
                  className="text-xs"
                  options={[
                    { value: 'customer', label: 'Customer' },
                    { value: 'event_owner', label: 'Event Owner' },
                    { value: 'theater_owner', label: 'Theater Owner' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
                <Button
                  variant={user.isActive ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => onStatusUpdate(user.id, !user.isActive)}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteUser(user.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userEmail: string;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ isOpen, onClose, onConfirm, userEmail }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete the user <strong>{userEmail}</strong>? This action cannot be undone.
          </p>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for deletion *
          </label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for deletion"
            required
          />
        </div>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700">
            Delete User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserManagementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserManagementFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: string;
    userEmail: string;
  }>({
    isOpen: false,
    userId: '',
    userEmail: '',
  });

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(filters, page, 20);
      setUsers(response.users);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [filters]);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await adminService.updateUserRole({ userId, newRole } as UserRoleUpdate);
      await fetchUsers(pagination.page);
    } catch (err) {
      console.error('Role update error:', err);
      alert('Failed to update user role');
    }
  };

  const handleStatusUpdate = async (userId: string, isActive: boolean) => {
    try {
      await adminService.updateUserStatus({ userId, isActive } as UserStatusUpdate);
      await fetchUsers(pagination.page);
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setDeleteModal({
        isOpen: true,
        userId,
        userEmail: user.email,
      });
    }
  };

  const confirmDeleteUser = async (reason: string) => {
    try {
      await adminService.deleteUser(deleteModal.userId, reason);
      await fetchUsers(pagination.page);
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Failed to delete user');
    }
  };

  const handleFilterChange = (key: keyof UserManagementFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search users..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <Select
            value={filters.role || ''}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            placeholder="All Roles"
            options={[
              { value: '', label: 'All Roles' },
              { value: 'customer', label: 'Customer' },
              { value: 'event_owner', label: 'Event Owner' },
              { value: 'theater_owner', label: 'Theater Owner' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Select
            value={filters.isActive?.toString() || ''}
            onChange={(e) => handleFilterChange('isActive', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
            placeholder="All Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
          <Button
            variant="outline"
            onClick={() => setFilters({})}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchUsers(pagination.page)}>
              Retry
            </Button>
          </div>
        ) : users.length > 0 ? (
          <>
            <UserTable
              users={users}
              onRoleUpdate={handleRoleUpdate}
              onStatusUpdate={handleStatusUpdate}
              onDeleteUser={handleDeleteUser}
            />
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} users
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
            <p className="text-gray-600">No users found</p>
          </div>
        )}
      </Card>

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userId: '', userEmail: '' })}
        onConfirm={confirmDeleteUser}
        userEmail={deleteModal.userEmail}
      />
    </div>
  );
};

export default UserManagement;