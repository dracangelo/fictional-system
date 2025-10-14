import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../contexts';

// Mock the auth context
const mockLogin = vi.fn();
const mockAuthContext = {
  user: null,
  loading: false,
  login: mockLogin,
  register: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  refreshToken: vi.fn(),
};

vi.mock('../../../contexts', async () => {
  const actual = await vi.importActual('../../../contexts');
  return {
    ...actual,
    useAuth: () => mockAuthContext,
  };
});

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

const renderLoginForm = (props = {}) => {
  return render(
    <BrowserRouter>
      <LoginForm {...props} />
    </BrowserRouter>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with all fields', () => {
    renderLoginForm();

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show validation error for short password', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, '123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockLogin.mockResolvedValue(undefined);

    renderLoginForm({ onSuccess });

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show error message on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValue(new Error(errorMessage));

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText('Signing In...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise to complete the test
    resolveLogin!(undefined);
    await waitFor(() => {
      expect(screen.queryByText('Signing In...')).not.toBeInTheDocument();
    });
  });

  it('should redirect to intended page after login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);

    // Mock useLocation to return state with from
    const mockUseLocation = vi.fn().mockReturnValue({
      state: { from: { pathname: '/events' } },
    });
    
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: mockUseLocation,
      };
    });

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/events', { replace: true });
    });
  });
});