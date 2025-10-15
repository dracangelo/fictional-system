import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { axe } from 'jest-axe'
import { renderWithProviders } from '../../../test/utils'
import { LoginForm } from '../LoginForm'

const mockOnSuccess = vi.fn()
const mockOnError = vi.fn()

const defaultProps = {
  onSuccess: mockOnSuccess,
  onError: mockOnError,
}

// Mock the auth service
vi.mock('../../../services/auth', () => ({
  authService: {
    login: vi.fn(),
  },
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    await user.tab() // Trigger blur validation
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const { authService } = await import('../../../services/auth')
    
    const mockAuthResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      },
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
    }
    
    ;(authService.login as any).mockResolvedValue(mockAuthResponse)
    
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockOnSuccess).toHaveBeenCalledWith(mockAuthResponse)
    })
  })

  it('handles login errors', async () => {
    const user = userEvent.setup()
    const { authService } = await import('../../../services/auth')
    
    const mockError = new Error('Invalid credentials')
    ;(authService.login as any).mockRejectedValue(mockError)
    
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(mockError)
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const { authService } = await import('../../../services/auth')
    
    // Mock a delayed response
    ;(authService.login as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('shows remember me checkbox', () => {
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const rememberCheckbox = screen.getByLabelText(/remember me/i)
    expect(rememberCheckbox).toBeInTheDocument()
    expect(rememberCheckbox).toHaveAttribute('type', 'checkbox')
  })

  it('includes remember me in form submission', async () => {
    const user = userEvent.setup()
    const { authService } = await import('../../../services/auth')
    
    ;(authService.login as any).mockResolvedValue({})
    
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const rememberCheckbox = screen.getByLabelText(/remember me/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(rememberCheckbox)
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      })
    })
  })

  it('shows forgot password link', () => {
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i })
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password')
  })

  it('shows sign up link', () => {
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const signUpLink = screen.getByRole('link', { name: /sign up/i })
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute('href', '/auth/register')
  })

  it('supports social login options', () => {
    renderWithProviders(<LoginForm {...defaultProps} showSocialLogin />)
    
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument()
  })

  it('handles social login clicks', async () => {
    const user = userEvent.setup()
    const mockOnSocialLogin = vi.fn()
    
    renderWithProviders(
      <LoginForm {...defaultProps} showSocialLogin onSocialLogin={mockOnSocialLogin} />
    )
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    await user.click(googleButton)
    
    expect(mockOnSocialLogin).toHaveBeenCalledWith('google')
  })

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<LoginForm {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const rememberCheckbox = screen.getByLabelText(/remember me/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Tab through form elements
    await user.tab()
    expect(emailInput).toHaveFocus()
    
    await user.tab()
    expect(passwordInput).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('button', { name: /show password/i })).toHaveFocus()
    
    await user.tab()
    expect(rememberCheckbox).toHaveFocus()
    
    await user.tab()
    expect(submitButton).toHaveFocus()
  })

  it('submits form on Enter key press', async () => {
    const user = userEvent.setup()
    const { authService } = await import('../../../services/auth')
    
    ;(authService.login as any).mockResolvedValue({})
    
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalled()
    })
  })

  it('clears form errors when user starts typing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    // Submit empty form to trigger errors
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
    
    // Start typing in email field
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'test')
    
    // Error should be cleared
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
  })

  it('prevents multiple submissions', async () => {
    const user = userEvent.setup()
    const { authService } = await import('../../../services/auth')
    
    // Mock a delayed response
    ;(authService.login as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    renderWithProviders(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    // Click submit multiple times
    await user.click(submitButton)
    await user.click(submitButton)
    await user.click(submitButton)
    
    // Should only call login once
    expect(authService.login).toHaveBeenCalledTimes(1)
  })
})