import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ValidatedInput, PasswordInput } from '../../ui/FormField';
import { loginSchema, type LoginFormData } from '../../../utils/validation';

// Mock the debounce hook
vi.mock('../../../hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

// Simple test component using the form validation
const TestLoginForm: React.FC = () => {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const onSubmit = (data: LoginFormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} data-testid="login-form">
      <ValidatedInput
        label="Email"
        type="email"
        register={form.register('email')}
        error={form.formState.errors.email}
        data-testid="email-input"
      />
      
      <PasswordInput
        label="Password"
        register={form.register('password')}
        error={form.formState.errors.password}
        data-testid="password-input"
      />
      
      <button type="submit" data-testid="submit-button">
        Submit
      </button>
    </form>
  );
};

describe('Form Validation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates email field correctly', async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);

    const emailInput = screen.getByTestId('email-input');
    
    // Test invalid email
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur to show validation

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    // Test valid email
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  it('validates password field correctly', async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);

    const passwordInput = screen.getByTestId('password-input');
    
    // Test short password
    await user.type(passwordInput, 'short');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });

    // Test valid password
    await user.clear(passwordInput);
    await user.type(passwordInput, 'ValidPassword123');
    
    await waitFor(() => {
      expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
    });
  });

  it('shows password strength indicator', async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);

    const passwordInput = screen.getByTestId('password-input');
    
    await user.type(passwordInput, 'weak');
    
    await waitFor(() => {
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongPassword123');
    
    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  it('prevents form submission with invalid data', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<TestLoginForm />);

    const submitButton = screen.getByTestId('submit-button');
    
    // Try to submit without filling fields
    await user.click(submitButton);
    
    // Form should not be submitted
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Form submitted:'));
    
    consoleSpy.mockRestore();
  });

  it('allows form submission with valid data', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<TestLoginForm />);

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('submit-button');
    
    // Fill valid data
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'ValidPassword123');
    
    await user.click(submitButton);
    
    // Form should be submitted
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Form submitted:', {
        email: 'test@example.com',
        password: 'ValidPassword123',
      });
    });
    
    consoleSpy.mockRestore();
  });
});