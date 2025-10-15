import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toast } from '../Toast';
import { Notification } from '../../../types/notification';

describe('Toast', () => {
  const mockOnClose = vi.fn();

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'test-notification-1',
    type: 'success',
    title: 'Test Title',
    message: 'Test message',
    timestamp: new Date(),
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification content', () => {
    const notification = createMockNotification();
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success notification with correct styling', () => {
    const notification = createMockNotification({ type: 'success' });
    
    const { container } = render(<Toast notification={notification} onClose={mockOnClose} />);

    const innerDiv = container.querySelector('.border-l-4');
    expect(innerDiv).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800');
  });

  it('should render error notification with correct styling', () => {
    const notification = createMockNotification({ type: 'error' });
    
    const { container } = render(<Toast notification={notification} onClose={mockOnClose} />);

    const innerDiv = container.querySelector('.border-l-4');
    expect(innerDiv).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
  });

  it('should render warning notification with correct styling', () => {
    const notification = createMockNotification({ type: 'warning' });
    
    const { container } = render(<Toast notification={notification} onClose={mockOnClose} />);

    const innerDiv = container.querySelector('.border-l-4');
    expect(innerDiv).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
  });

  it('should render info notification with correct styling', () => {
    const notification = createMockNotification({ type: 'info' });
    
    const { container } = render(<Toast notification={notification} onClose={mockOnClose} />);

    const innerDiv = container.querySelector('.border-l-4');
    expect(innerDiv).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
  });

  it('should call onClose when close button is clicked', () => {
    const notification = createMockNotification();
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith('test-notification-1');
  });

  it('should render action buttons when actions are provided', () => {
    const mockAction = vi.fn();
    const notification = createMockNotification({
      actions: [
        { label: 'Primary Action', action: mockAction, variant: 'primary' },
        { label: 'Secondary Action', action: mockAction, variant: 'secondary' }
      ]
    });
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Primary Action')).toBeInTheDocument();
    expect(screen.getByText('Secondary Action')).toBeInTheDocument();
  });

  it('should call action callback when action button is clicked', () => {
    const mockAction = vi.fn();
    const notification = createMockNotification({
      actions: [
        { label: 'Test Action', action: mockAction }
      ]
    });
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    const actionButton = screen.getByText('Test Action');
    fireEvent.click(actionButton);

    expect(mockAction).toHaveBeenCalled();
  });

  it('should close notification after action click for non-persistent notifications', () => {
    const mockAction = vi.fn();
    const notification = createMockNotification({
      persistent: false,
      actions: [
        { label: 'Test Action', action: mockAction }
      ]
    });
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    const actionButton = screen.getByText('Test Action');
    fireEvent.click(actionButton);

    expect(mockAction).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledWith('test-notification-1');
  });

  it('should not close notification after action click for persistent notifications', () => {
    const mockAction = vi.fn();
    const notification = createMockNotification({
      persistent: true,
      actions: [
        { label: 'Test Action', action: mockAction }
      ]
    });
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    const actionButton = screen.getByText('Test Action');
    fireEvent.click(actionButton);

    expect(mockAction).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should render progress bar for notifications with duration', () => {
    const notification = createMockNotification({
      duration: 5000,
      persistent: false
    });
    
    const { container } = render(<Toast notification={notification} onClose={mockOnClose} />);

    const progressBar = container.querySelector('.h-1.bg-gray-200');
    expect(progressBar).toBeInTheDocument();
  });

  it('should not render progress bar for persistent notifications', () => {
    const notification = createMockNotification({
      duration: 5000,
      persistent: true
    });
    
    const { container } = render(<Toast notification={notification} onClose={mockOnClose} />);

    const progressBar = container.querySelector('.h-1.bg-gray-200');
    expect(progressBar).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const notification = createMockNotification();
    
    const { container } = render(
      <Toast notification={notification} onClose={mockOnClose} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    const notification = createMockNotification();
    
    render(<Toast notification={notification} onClose={mockOnClose} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });
});