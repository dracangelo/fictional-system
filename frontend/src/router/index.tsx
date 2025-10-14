import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../components/common';
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  UnauthorizedPage,
  DashboardPage,
  HomePage,
} from '../pages';
import CheckoutDemo from '../pages/CheckoutDemo';

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
    path: '/checkout-demo',
    element: <CheckoutDemo />,
  },
  // Customer routes
  {
    path: '/events',
    element: (
      <ProtectedRoute requiredRoles={['customer', 'admin']}>
        <div>Events Page - Coming Soon</div>
      </ProtectedRoute>
    ),
  },
  {
    path: '/bookings',
    element: (
      <ProtectedRoute requiredRoles={['customer', 'admin']}>
        <div>My Bookings - Coming Soon</div>
      </ProtectedRoute>
    ),
  },
  // Event Owner routes
  {
    path: '/manage-events',
    element: (
      <ProtectedRoute requiredRoles={['event_owner', 'admin']}>
        <div>Manage Events - Coming Soon</div>
      </ProtectedRoute>
    ),
  },
  // Theater Owner routes
  {
    path: '/manage-theaters',
    element: (
      <ProtectedRoute requiredRoles={['theater_owner', 'admin']}>
        <div>Manage Theaters - Coming Soon</div>
      </ProtectedRoute>
    ),
  },
  // Admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin Panel - Coming Soon</div>
      </ProtectedRoute>
    ),
  },
  // Catch all route
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);