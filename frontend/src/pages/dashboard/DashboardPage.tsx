import React from 'react';
import { useAuth } from '../../contexts';
import { Button, Card } from '../../components/ui';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'customer':
        return 'Customer';
      case 'event_owner':
        return 'Event Owner';
      case 'theater_owner':
        return 'Theater Owner';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.firstName}!</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Role:</span> {getRoleDisplayName(user?.role || '')}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <div className="space-y-2">
              {user?.role === 'customer' && (
                <>
                  <Button variant="primary" size="sm" className="w-full">
                    Browse Events
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    My Bookings
                  </Button>
                </>
              )}
              {user?.role === 'event_owner' && (
                <>
                  <Button variant="primary" size="sm" className="w-full">
                    Create Event
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Events
                  </Button>
                </>
              )}
              {user?.role === 'theater_owner' && (
                <>
                  <Button variant="primary" size="sm" className="w-full">
                    Add Theater
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Showtimes
                  </Button>
                </>
              )}
              {user?.role === 'admin' && (
                <>
                  <Button variant="primary" size="sm" className="w-full">
                    System Analytics
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    User Management
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
            <p className="text-gray-600 text-sm">No recent activity to display.</p>
          </Card>
        </div>
      </div>
    </div>
  );
};