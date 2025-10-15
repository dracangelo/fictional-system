import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SystemBanner } from '../SystemBanner';
import { SystemBanner as SystemBannerType } from '../../../types/notification';

describe('SystemBanner', () => {
  const mockOnDismiss = vi.fn();

  const createMockBanner = (overrides: Partial<SystemBannerType> = {}): SystemBannerType => ({
    id: 'test-banner-1',
    type: 'info',
    title: 'Test Banner',
    message: 'Test banner message',
    startTime: new Date(Date.now() - 1000), // Started 1 second ago
    dismissible: true,
    priority: 'medium',
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render banner content', () => {
    const banner = createMockBanner();
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Banner')).toBeInTheDocument();
    expect(screen.getByText(/Test banner message/)).toBeInTheDocument();
  });

  it('should render maintenance banner with correct styling', () => {
    const banner = createMockBanner({ type: 'maintenance' });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(container.firstChild).toHaveClass('bg-orange-50', 'border-orange-200');
  });

  it('should render announcement banner with correct styling', () => {
    const banner = createMockBanner({ type: 'announcement' });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(container.firstChild).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('should render warning banner with correct styling', () => {
    const banner = createMockBanner({ type: 'warning' });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(container.firstChild).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('should render info banner with correct styling', () => {
    const banner = createMockBanner({ type: 'info' });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(container.firstChild).toHaveClass('bg-gray-50', 'border-gray-200');
  });

  it('should apply priority border styling', () => {
    const lowPriorityBanner = createMockBanner({ priority: 'low' });
    const { container: lowContainer } = render(<SystemBanner banner={lowPriorityBanner} />);
    expect(lowContainer.firstChild).toHaveClass('border-l-2');

    const mediumPriorityBanner = createMockBanner({ priority: 'medium' });
    const { container: mediumContainer } = render(<SystemBanner banner={mediumPriorityBanner} />);
    expect(mediumContainer.firstChild).toHaveClass('border-l-4');

    const highPriorityBanner = createMockBanner({ priority: 'high' });
    const { container: highContainer } = render(<SystemBanner banner={highPriorityBanner} />);
    expect(highContainer.firstChild).toHaveClass('border-l-8');
  });

  it('should show dismiss button when banner is dismissible', () => {
    const banner = createMockBanner({ dismissible: true });
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(screen.getByLabelText('Dismiss banner')).toBeInTheDocument();
  });

  it('should not show dismiss button when banner is not dismissible', () => {
    const banner = createMockBanner({ dismissible: false });
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(screen.queryByLabelText('Dismiss banner')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const banner = createMockBanner({ dismissible: true });
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss banner');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('test-banner-1');
  });

  it('should not call onDismiss when banner is not dismissible', () => {
    const banner = createMockBanner({ dismissible: false });
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    // Should not have dismiss button, so onDismiss should not be called
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('should show end time when provided', () => {
    const endTime = new Date(Date.now() + 3600000); // 1 hour from now
    const banner = createMockBanner({ endTime });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(screen.getByText(/Until/)).toBeInTheDocument();
    // Check that the container includes the formatted end time
    expect(container.textContent).toContain('Until');
  });

  it('should not render when banner is not within active time range (before start)', () => {
    const banner = createMockBanner({
      startTime: new Date(Date.now() + 1000) // Starts 1 second from now
    });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render when banner is past end time', () => {
    const banner = createMockBanner({
      startTime: new Date(Date.now() - 2000), // Started 2 seconds ago
      endTime: new Date(Date.now() - 1000) // Ended 1 second ago
    });
    
    const { container } = render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render when banner is within active time range', () => {
    const banner = createMockBanner({
      startTime: new Date(Date.now() - 1000), // Started 1 second ago
      endTime: new Date(Date.now() + 1000) // Ends 1 second from now
    });
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Banner')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const banner = createMockBanner();
    
    const { container } = render(
      <SystemBanner banner={banner} onDismiss={mockOnDismiss} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    const banner = createMockBanner();
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    const bannerElement = screen.getByRole('banner');
    expect(bannerElement).toHaveAttribute('aria-live', 'polite');
  });

  it('should render banner without message', () => {
    const banner = createMockBanner({ message: '' });
    
    render(<SystemBanner banner={banner} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Test Banner')).toBeInTheDocument();
    expect(screen.queryByText(' - ')).not.toBeInTheDocument();
  });
});