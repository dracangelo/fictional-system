import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('BottomSheet', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div data-testid="sheet-content">Sheet Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  it('renders when isOpen is true', () => {
    render(<BottomSheet {...defaultProps} />);
    
    expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<BottomSheet {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('sheet-content')).not.toBeInTheDocument();
  });

  it('renders with title when provided', () => {
    render(<BottomSheet {...defaultProps} title="Test Title" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('shows close button when title is provided', () => {
    render(<BottomSheet {...defaultProps} title="Test Title" />);
    
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<BottomSheet {...defaultProps} onClose={onClose} />);
    
    const backdrop = screen.getByTestId('sheet-content').parentElement?.previousElementSibling;
    fireEvent.click(backdrop!);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<BottomSheet {...defaultProps} onClose={onClose} title="Test Title" />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct height class based on height prop', () => {
    const { rerender } = render(<BottomSheet {...defaultProps} height="half" />);
    
    let sheet = screen.getByTestId('sheet-content').parentElement;
    expect(sheet).toHaveClass('h-1/2');
    
    rerender(<BottomSheet {...defaultProps} height="full" />);
    sheet = screen.getByTestId('sheet-content').parentElement;
    expect(sheet).toHaveClass('h-full');
    
    rerender(<BottomSheet {...defaultProps} height="auto" />);
    sheet = screen.getByTestId('sheet-content').parentElement;
    expect(sheet).toHaveClass('max-h-[90vh]');
  });

  it('handles touch events for drag to close', async () => {
    const onClose = jest.fn();
    render(<BottomSheet {...defaultProps} onClose={onClose} />);
    
    const sheet = screen.getByTestId('sheet-content').parentElement;
    
    // Simulate drag down gesture
    fireEvent.touchStart(sheet!, {
      touches: [{ clientY: 100 }]
    });
    
    fireEvent.touchMove(sheet!, {
      touches: [{ clientY: 250 }] // Drag down 150px
    });
    
    fireEvent.touchEnd(sheet!);
    
    // Should call onClose for significant downward drag
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on small drag movements', () => {
    const onClose = jest.fn();
    render(<BottomSheet {...defaultProps} onClose={onClose} />);
    
    const sheet = screen.getByTestId('sheet-content').parentElement;
    
    // Simulate small drag
    fireEvent.touchStart(sheet!, {
      touches: [{ clientY: 100 }]
    });
    
    fireEvent.touchMove(sheet!, {
      touches: [{ clientY: 120 }] // Small drag of 20px
    });
    
    fireEvent.touchEnd(sheet!);
    
    // Should not close for small movements
    expect(onClose).not.toHaveBeenCalled();
  });

  it('prevents body scroll when open', () => {
    const originalOverflow = document.body.style.overflow;
    
    render(<BottomSheet {...defaultProps} />);
    
    expect(document.body.style.overflow).toBe('hidden');
    
    // Cleanup
    document.body.style.overflow = originalOverflow;
  });

  it('restores body scroll when closed', () => {
    const originalOverflow = document.body.style.overflow;
    
    const { rerender } = render(<BottomSheet {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<BottomSheet {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('unset');
    
    // Cleanup
    document.body.style.overflow = originalOverflow;
  });

  it('applies custom className', () => {
    render(<BottomSheet {...defaultProps} className="custom-sheet" />);
    
    const sheet = screen.getByTestId('sheet-content').parentElement;
    expect(sheet).toHaveClass('custom-sheet');
  });

  it('shows drag handle', () => {
    render(<BottomSheet {...defaultProps} />);
    
    // Look for the drag handle (gray bar)
    const dragHandle = screen.getByTestId('sheet-content').parentElement?.querySelector('.w-12.h-1.bg-gray-300.rounded-full');
    expect(dragHandle).toBeInTheDocument();
  });

  it('only renders on mobile (md:hidden class)', () => {
    render(<BottomSheet {...defaultProps} />);
    
    const container = screen.getByTestId('sheet-content').closest('.md\\:hidden');
    expect(container).toBeInTheDocument();
  });
});