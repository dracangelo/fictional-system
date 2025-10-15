import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ValidatedInput, PasswordInput, ValidatedTextArea } from '../../ui/FormField';
import { MultiStepForm } from '../MultiStepForm';
import { useFormWithAutoSave } from '../../../hooks/useFormWithAutoSave';

// Mock the hooks
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

vi.mock('../../hooks/useResponsive', () => ({
  useResponsive: vi.fn(() => ({ isMobile: false })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Form Validation Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('ValidatedInput', () => {
    it('renders with label and helper text', () => {
      render(
        <ValidatedInput
          label="Email Address"
          helperText="Enter your email"
          placeholder="email@example.com"
        />
      );

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
      render(
        <ValidatedInput
          label="Email"
          error="Invalid email address"
        />
      );

      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
    });

    it('shows required indicator when required prop is true', () => {
      render(
        <ValidatedInput
          label="Required Field"
          required
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('performs real-time validation when enabled', async () => {
      const user = userEvent.setup();
      const mockValidate = vi.fn().mockResolvedValue('Invalid value');

      render(
        <ValidatedInput
          label="Test Field"
          realTimeValidation
          onValidate={mockValidate}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      await waitFor(() => {
        expect(mockValidate).toHaveBeenCalledWith('test');
      });
    });

    it('shows validation icons when enabled', async () => {
      const user = userEvent.setup();
      const mockValidate = vi.fn().mockResolvedValue(undefined); // Valid

      render(
        <ValidatedInput
          label="Test Field"
          realTimeValidation
          showValidationIcon
          onValidate={mockValidate}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'valid');

      await waitFor(() => {
        expect(screen.getByTestId('check-icon') || screen.querySelector('[data-testid="check-icon"]')).toBeInTheDocument();
      });
    });

    it('handles different input sizes correctly', () => {
      const { rerender } = render(<ValidatedInput size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('h-8');

      rerender(<ValidatedInput size="md" />);
      expect(screen.getByRole('textbox')).toHaveClass('h-10');

      rerender(<ValidatedInput size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('h-12');
    });
  });

  describe('PasswordInput', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      
      render(<PasswordInput label="Password" />);

      const input = screen.getByLabelText('Password');
      const toggleButton = screen.getByRole('button');

      expect(input).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('shows password strength indicator', async () => {
      const user = userEvent.setup();
      
      render(
        <PasswordInput
          label="Password"
          showStrengthIndicator
        />
      );

      const input = screen.getByLabelText('Password');
      await user.type(input, 'weak');

      expect(screen.getByText('Weak')).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'StrongPass123');

      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    it('validates password strength rules', async () => {
      const user = userEvent.setup();
      
      render(
        <PasswordInput
          label="Password"
          showStrengthIndicator
          strengthRules={{
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
          }}
        />
      );

      const input = screen.getByLabelText('Password');
      await user.type(input, 'Test123!');

      await waitFor(() => {
        expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
        expect(screen.getByText('Uppercase letter')).toBeInTheDocument();
        expect(screen.getByText('Lowercase letter')).toBeInTheDocument();
        expect(screen.getByText('Number')).toBeInTheDocument();
      });
    });
  });

  describe('ValidatedTextArea', () => {
    it('shows character count when enabled', async () => {
      const user = userEvent.setup();
      
      render(
        <ValidatedTextArea
          label="Description"
          maxLength={100}
          showCharacterCount
        />
      );

      const textarea = screen.getByLabelText('Description');
      await user.type(textarea, 'Hello world');

      expect(screen.getByText('11/100')).toBeInTheDocument();
    });

    it('warns when character limit is exceeded', async () => {
      const user = userEvent.setup();
      
      render(
        <ValidatedTextArea
          label="Description"
          maxLength={10}
          showCharacterCount
        />
      );

      const textarea = screen.getByLabelText('Description');
      await user.type(textarea, 'This is too long');

      const counter = screen.getByText(/\/10/);
      expect(counter).toHaveClass('text-red-500');
    });

    it('auto-resizes when enabled', async () => {
      const user = userEvent.setup();
      
      render(
        <ValidatedTextArea
          label="Description"
          autoResize
        />
      );

      const textarea = screen.getByLabelText('Description') as HTMLTextAreaElement;
      const initialHeight = textarea.style.height;

      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4');

      // Height should change after typing multiple lines
      expect(textarea.style.height).not.toBe(initialHeight);
    });
  });
});

describe('useFormWithAutoSave Hook', () => {
  const TestComponent: React.FC<{ autoSaveKey: string }> = ({ autoSaveKey }) => {
    const form = useFormWithAutoSave({
      autoSave: {
        enabled: true,
        key: autoSaveKey,
        delay: 100,
      },
    });

    return (
      <form>
        <input {...form.register('testField')} data-testid="test-input" />
        <div data-testid="auto-save-status">
          {form.formState.isAutoSaving ? 'Saving...' : 'Saved'}
        </div>
        <div data-testid="unsaved-changes">
          {form.formState.hasUnsavedChanges ? 'Unsaved' : 'Saved'}
        </div>
        <button type="button" onClick={form.clearAutoSave} data-testid="clear-button">
          Clear
        </button>
      </form>
    );
  };

  it('auto-saves form data to localStorage', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent autoSaveKey="test-form" />);

    const input = screen.getByTestId('test-input');
    await user.type(input, 'test value');

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'form_autosave_test-form',
        expect.stringContaining('test value')
      );
    }, { timeout: 1000 });
  });

  it('restores data from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ testField: 'restored value' })
    );

    render(<TestComponent autoSaveKey="test-form" />);

    const input = screen.getByTestId('test-input') as HTMLInputElement;
    expect(input.value).toBe('restored value');
  });

  it('clears auto-save data when requested', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent autoSaveKey="test-form" />);

    const clearButton = screen.getByTestId('clear-button');
    await user.click(clearButton);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('form_autosave_test-form');
  });

  it('tracks unsaved changes correctly', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent autoSaveKey="test-form" />);

    const input = screen.getByTestId('test-input');
    const status = screen.getByTestId('unsaved-changes');

    expect(status).toHaveTextContent('Saved');

    await user.type(input, 'new value');
    expect(status).toHaveTextContent('Unsaved');
  });
});

describe('MultiStepForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders first step initially', () => {
    render(<MultiStepForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
  });

  it('navigates between steps correctly', async () => {
    const user = userEvent.setup();
    
    render(<MultiStepForm onSubmit={mockOnSubmit} />);

    // Fill required fields in first step
    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com');

    // Navigate to next step
    const nextButton = screen.getByText('Continue');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Account Setup')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });
  });

  it('prevents navigation to next step with invalid data', async () => {
    const user = userEvent.setup();
    
    render(<MultiStepForm onSubmit={mockOnSubmit} />);

    // Try to navigate without filling required fields
    const nextButton = screen.getByText('Continue');
    await user.click(nextButton);

    // Should still be on first step
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<MultiStepForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('submits form data when all steps are complete', async () => {
    const user = userEvent.setup();
    
    render(<MultiStepForm onSubmit={mockOnSubmit} />);

    // Step 1: Personal Info
    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
    await user.click(screen.getByText('Continue'));

    // Step 2: Account Setup
    await waitFor(() => {
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Username'), 'johndoe');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Password123');
    await user.selectOptions(screen.getByRole('combobox'), 'customer');
    await user.click(screen.getByText('Continue'));

    // Step 3: Preferences (optional)
    await waitFor(() => {
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          username: 'johndoe',
          role: 'customer',
        })
      );
    });
  });

  it('shows auto-save indicators', async () => {
    const user = userEvent.setup();
    
    render(<MultiStepForm onSubmit={mockOnSubmit} autoSaveKey="test-multi-step" />);

    const input = screen.getByLabelText('First Name');
    await user.type(input, 'John');

    // Should show unsaved changes indicator
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  it('restores form data from auto-save', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        firstName: 'Restored',
        lastName: 'User',
        email: 'restored@example.com',
      })
    );

    render(<MultiStepForm onSubmit={mockOnSubmit} autoSaveKey="test-restore" />);

    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Restored');
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('User');
    expect((screen.getByLabelText('Email Address') as HTMLInputElement).value).toBe('restored@example.com');
  });
});