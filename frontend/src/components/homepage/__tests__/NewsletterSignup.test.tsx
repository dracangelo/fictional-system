import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { NewsletterSignup } from '../NewsletterSignup';

describe('NewsletterSignup', () => {
  it('renders newsletter signup form', () => {
    render(<NewsletterSignup />);
    
    expect(screen.getByText('Stay in the Loop')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe now/i })).toBeInTheDocument();
  });

  it('renders preference checkboxes', () => {
    render(<NewsletterSignup />);
    
    expect(screen.getByLabelText(/live events/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/movies/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exclusive deals/i)).toBeInTheDocument();
  });

  it('validates email input', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);
    
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    
    // Try to submit without email
    await user.click(submitButton);
    
    expect(screen.getByText('Email address is required')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<NewsletterSignup />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    
    // Enter valid email
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    // Should show loading state
    expect(screen.getByText('Subscribing...')).toBeInTheDocument();
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Welcome Aboard!')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Should log form data
    expect(consoleSpy).toHaveBeenCalledWith('Newsletter signup:', expect.objectContaining({
      email: 'test@example.com',
      preferences: expect.objectContaining({
        events: true,
        movies: true,
        deals: true,
      })
    }));
    
    consoleSpy.mockRestore();
  });

  it('toggles preference checkboxes', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);
    
    const eventsCheckbox = screen.getByLabelText(/live events/i);
    
    // Should be checked by default
    expect(eventsCheckbox).toBeChecked();
    
    // Uncheck it
    await user.click(eventsCheckbox);
    expect(eventsCheckbox).not.toBeChecked();
    
    // Check it again
    await user.click(eventsCheckbox);
    expect(eventsCheckbox).toBeChecked();
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    
    // Trigger validation error
    await user.click(submitButton);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
    });
    
    // Start typing
    await user.type(emailInput, 'test');
    
    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Email address is required')).not.toBeInTheDocument();
    });
  });

  it('disables submit button when email is empty', () => {
    render(<NewsletterSignup />);
    
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when email is provided', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    
    await user.type(emailInput, 'test@example.com');
    
    expect(submitButton).not.toBeDisabled();
  });

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /subscribe now/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome Aboard!')).toBeInTheDocument();
      expect(screen.getByText(/Thank you for subscribing/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});