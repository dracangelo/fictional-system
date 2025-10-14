import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../ProtectedRoute';

// Mock the auth context
const mockAuthContext = {
  user: null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  refreshToken: vi.fn(),
};

vi.mock('../../../contexts', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

const TestComponent = () => <div>Protected Content</div>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
  });

  it('should show loading spinner when loading', () => {
    mockAuthContext.loading = true;

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    mockAuthContext.user = null;
    mockAuthContext.loading = false;

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login');
  });

  it('should render children when authenticated', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to unauthorized when user lacks required role', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/unauthorized');
  });

  it('should render children when user has required role', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin', 'event_owner']}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should use custom fallback path', () => {
    mockAuthContext.user = null;

    renderWithRouter(
      <ProtectedRoute fallbackPath="/custom-login">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-login');
  });
});

describe('PublicRoute', () => {
  beforeEach(() => {
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
  });

  it('should show loading spinner when loading', () => {
    mockAuthContext.loading = true;

    renderWithRouter(
      <PublicRoute>
        <TestComponent />
      </PublicRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render children when not authenticated', () => {
    mockAuthContext.user = null;

    renderWithRouter(
      <PublicRoute>
        <TestComponent />
      </PublicRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to dashboard when authenticated', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    renderWithRouter(
      <PublicRoute>
        <TestComponent />
      </PublicRoute>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/dashboard');
  });

  it('should use custom redirect path', () => {
    mockAuthContext.user = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferences: {
        notificationSettings: { email: true, sms: false, push: true },
        favoriteGenres: [],
        preferredLocations: [],
        accessibilityNeeds: [],
      },
    };

    renderWithRouter(
      <PublicRoute redirectPath="/custom-dashboard">
        <TestComponent />
      </PublicRoute>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-dashboard');
  });
});