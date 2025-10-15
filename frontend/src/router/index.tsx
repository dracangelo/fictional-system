import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../components/common';

// Import pages normally for now (lazy loading can be added later when pages are properly exported)
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import CheckoutDemo from '../pages/CheckoutDemo';
import EventListingPage from '../pages/events/EventListingPage';
import SearchResultsPage from '../pages/events/SearchResultsPage';
import EventOwnerDashboard from '../pages/events/EventOwnerDashboard';
import TheaterOwnerDashboardPage from '../pages/theaters/TheaterOwnerDashboardPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import ContentModeration from '../pages/admin/ContentModeration';
import AuditLog from '../pages/admin/AuditLog';
import CustomerDashboard from '../pages/dashboard/CustomerDashboard';



export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer-dashboard',
    element: (
      <ProtectedRoute requiredRoles={['customer', 'admin']}>
        <CustomerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checkout-demo',
    element: <CheckoutDemo />,
  },
  // Customer routes
  {
    path: '/events',
    element: (
      <ProtectedRoute requiredRoles={['customer', 'admin']}>
        <EventListingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/search',
    element: <SearchResultsPage />,
  },
  {
    path: '/bookings',
    element: (
      <ProtectedRoute requiredRoles={['customer', 'admin']}>
        <CustomerDashboard />
      </ProtectedRoute>
    ),
  },
  // Event Owner routes
  {
    path: '/manage-events',
    element: (
      <ProtectedRoute requiredRoles={['event_owner', 'admin']}>
        <EventOwnerDashboard />
      </ProtectedRoute>
    ),
  },
  // Theater Owner routes
  {
    path: '/manage-theaters',
    element: (
      <ProtectedRoute requiredRoles={['theater_owner', 'admin']}>
        <TheaterOwnerDashboardPage />
      </ProtectedRoute>
    ),
  },
  // Admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute requiredRoles={['admin']}>
        <UserManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/content',
    element: (
      <ProtectedRoute requiredRoles={['admin']}>
        <ContentModeration />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/audit',
    element: (
      <ProtectedRoute requiredRoles={['admin']}>
        <AuditLog />
      </ProtectedRoute>
    ),
  },
  // Catch all route
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);