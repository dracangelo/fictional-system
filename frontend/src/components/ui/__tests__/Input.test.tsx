import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../Input'

describe('Input Component', () => {
  it('renders with basic props', () => {
    render(<Input label="Email" placeholder="Enter email" />)
    
    const input = screen.getByLabelText(/email/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Enter email')
  })

  it('renders different input types', () => {
    const { rerender } = render(<Input label="Email" type="email" />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')

    rerender(<Input label="Password" type="password" />)
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')

    rerender(<Input label="Number" type="number" />)
    expect(screen.getByLabelText(/number/i)).toHaveAttribute('type', 'number')
  })

  it('shows error state correctly', () => {
    render(<Input label="Email" error="Invalid email format" />)
    
    const input = screen.getByLabelText(/email/i)
    const errorMessage = screen.getByText('Invalid email format')
    
    expect(input).toHaveClass('border-red-500')
    expect(errorMessage).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby')
  })

  it('shows helper text', () => {
    render(<Input label="Password" helperText="Must be at least 8 characters" />)
    
    const helperText = screen.getByText('Must be at least 8 characters')
    expect(helperText).toBeInTheDocument()
    
    const input = screen.getByLabelText(/password/i)
    expect(input).toHaveAttribute('aria-describedby')
  })

  it('handles required field correctly', () => {
    render(<Input label="Email" required />)
    
    const input = screen.getByLabelText(/email/i)
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('aria-required', 'true')
    
    const label = screen.getByText('Email')
    expect(label).toHaveTextContent('*') // Required indicator
  })

  it('handles disabled state', () => {
    render(<Input label="Email" disabled />)
    
    const input = screen.getByLabelText(/email/i)
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-50')
  })

  it('calls onChange handler', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<Input label="Email" onChange={handleChange} />)
    
    const input = screen.getByLabelText(/email/i)
    await user.type(input, 'test@example.com')
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('test@example.com')
  })

  it('calls onBlur and onFocus handlers', async () => {
    const user = userEvent.setup()
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    
    render(<Input label="Email" onFocus={handleFocus} onBlur={handleBlur} />)
    
    const input = screen.getByLabelText(/email/i)
    
    await user.click(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('renders with start and end adornments', () => {
    render(
      <Input 
        label="Search" 
        startAdornment={<span data-testid="search-icon">🔍</span>}
        endAdornment={<button data-testid="clear-button">×</button>}
      />
    )
    
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    expect(screen.getByTestId('clear-button')).toBeInTheDocument()
  })

  it('supports different sizes', () => {
    const { rerender } = render(<Input label="Small" size="sm" />)
    expect(screen.getByLabelText(/small/i)).toHaveClass('h-8')

    rerender(<Input label="Large" size="lg" />)
    expect(screen.getByLabelText(/large/i)).toHaveClass('h-12')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input label="Email" ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('supports custom className', () => {
    render(<Input label="Email" className="custom-input" />)
    
    const input = screen.getByLabelText(/email/i)
    expect(input).toHaveClass('custom-input')
  })

  it('handles password visibility toggle', async () => {
    const user = userEvent.setup()
    
    render(<Input label="Password" type="password" showPasswordToggle />)
    
    const input = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    expect(input).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('validates input on blur when validation function provided', async () => {
    const user = userEvent.setup()
    const validate = vi.fn((value: string) => {
      if (!value.includes('@')) return 'Invalid email'
      return null
    })
    
    render(<Input label="Email" validate={validate} />)
    
    const input = screen.getByLabelText(/email/i)
    
    await user.type(input, 'invalid-email')
    await user.tab()
    
    await waitFor(() => {
      expect(validate).toHaveBeenCalledWith('invalid-email')
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })
  })

  it('clears validation error when input becomes valid', async () => {
    const user = userEvent.setup()
    const validate = vi.fn((value: string) => {
      if (!value.includes('@')) return 'Invalid email'
      return null
    })
    
    render(<Input label="Email" validate={validate} />)
    
    const input = screen.getByLabelText(/email/i)
    
    // Enter invalid value
    await user.type(input, 'invalid')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })
    
    // Fix the value
    await user.clear(input)
    await user.type(input, 'valid@example.com')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.queryByText('Invalid email')).not.toBeInTheDocument()
    })
  })

  it('has proper ARIA attributes', () => {
    render(
      <Input 
        label="Email" 
        error="Invalid email"
        helperText="Enter your email address"
        required
      />
    )
    
    const input = screen.getByLabelText(/email/i)
    
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAttribute('aria-describedby')
    
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    
    // Check that error and helper text elements have the correct IDs
    const errorElement = screen.getByText('Invalid email')
    const helperElement = screen.getByText('Enter your email address')
    
    expect(describedBy).toContain(errorElement.id)
    expect(describedBy).toContain(helperElement.id)
  })

  it('supports autocomplete attributes', () => {
    render(<Input label="Email" autoComplete="email" />)
    
    const input = screen.getByLabelText(/email/i)
    expect(input).toHaveAttribute('autocomplete', 'email')
  })

  it('handles maxLength correctly', async () => {
    const user = userEvent.setup()
    
    render(<Input label="Short Text" maxLength={5} />)
    
    const input = screen.getByLabelText(/short text/i)
    
    await user.type(input, '12345678')
    expect(input).toHaveValue('12345')
  })
})