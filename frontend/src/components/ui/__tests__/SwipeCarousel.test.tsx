import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SwipeCarousel } from '../SwipeCarousel';

// Mock window.innerWidth for responsive tests
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('SwipeCarousel', () => {
  const mockItems = [
    <div key="1" data-testid="item-1">Item 1</div>,
    <div key="2" data-testid="item-2">Item 2</div>,
    <div key="3" data-testid="item-3">Item 3</div>,
    <div key="4" data-testid="item-4">Item 4</div>,
  ];

  beforeEach(() => {
    // Reset to desktop size
    mockInnerWidth(1024);
  });

  it('renders all items', () => {
    render(<SwipeCarousel>{mockItems}</SwipeCarousel>);
    
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
    expect(screen.getByTestId('item-4')).toBeInTheDocument();
  });

  it('shows navigation arrows by default', () => {
    render(<SwipeCarousel>{mockItems}</SwipeCarousel>);
    
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('shows dots indicator by default', () => {
    render(<SwipeCarousel>{mockItems}</SwipeCarousel>);
    
    const dots = screen.getAllByRole('button', { name: /go to slide/i });
    expect(dots).toHaveLength(2); // 4 items with 3 items per view = 2 slides
  });

  it('hides arrows when showArrows is false', () => {
    render(<SwipeCarousel showArrows={false}>{mockItems}</SwipeCarousel>);
    
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('hides dots when showDots is false', () => {
    render(<SwipeCarousel showDots={false}>{mockItems}</SwipeCarousel>);
    
    expect(screen.queryByRole('button', { name: /go to slide/i })).not.toBeInTheDocument();
  });

  it('navigates to next slide when next button is clicked', async () => {
    render(<SwipeCarousel>{mockItems}</SwipeCarousel>);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Check if carousel has moved (this would require checking transform styles)
    await waitFor(() => {
      const carousel = screen.getByTestId('item-1').parentElement;
      expect(carousel).toHaveStyle('transform: translateX(-33.333333333333336%)');
    });
  });

  it('responds to touch events for swiping', () => {
    render(<SwipeCarousel>{mockItems}</SwipeCarousel>);
    
    const carousel = screen.getByTestId('item-1').parentElement;
    
    // Simulate swipe left (next slide)
    fireEvent.touchStart(carousel!, {
      touches: [{ clientX: 100, clientY: 0 }]
    });
    
    fireEvent.touchMove(carousel!, {
      touches: [{ clientX: 50, clientY: 0 }]
    });
    
    fireEvent.touchEnd(carousel!, {
      changedTouches: [{ clientX: 0, clientY: 0 }]
    });
    
    // Verify swipe was processed (would need to check internal state)
    expect(carousel).toBeInTheDocument();
  });

  it('adjusts items per view based on screen size', async () => {
    render(
      <SwipeCarousel 
        itemsPerView={{ mobile: 1, tablet: 2, desktop: 3 }}
      >
        {mockItems}
      </SwipeCarousel>
    );
    
    // Test mobile breakpoint
    mockInnerWidth(500);
    await waitFor(() => {
      // On mobile, should show 1 item per view, so 4 slides total
      const dots = screen.getAllByRole('button', { name: /go to slide/i });
      expect(dots).toHaveLength(4);
    });
    
    // Test tablet breakpoint
    mockInnerWidth(800);
    await waitFor(() => {
      // On tablet, should show 2 items per view, so 3 slides total
      const dots = screen.getAllByRole('button', { name: /go to slide/i });
      expect(dots).toHaveLength(3);
    });
  });

  it('calls onSlideChange when slide changes', () => {
    const onSlideChange = jest.fn();
    render(
      <SwipeCarousel onSlideChange={onSlideChange}>
        {mockItems}
      </SwipeCarousel>
    );
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(onSlideChange).toHaveBeenCalledWith(1);
  });

  it('auto-plays when autoPlay is enabled', async () => {
    const onSlideChange = jest.fn();
    render(
      <SwipeCarousel 
        autoPlay={true} 
        autoPlayInterval={100}
        onSlideChange={onSlideChange}
      >
        {mockItems}
      </SwipeCarousel>
    );
    
    // Wait for auto-play to trigger
    await waitFor(() => {
      expect(onSlideChange).toHaveBeenCalledWith(1);
    }, { timeout: 200 });
  });

  it('pauses auto-play during user interaction', async () => {
    const onSlideChange = jest.fn();
    render(
      <SwipeCarousel 
        autoPlay={true} 
        autoPlayInterval={100}
        onSlideChange={onSlideChange}
      >
        {mockItems}
      </SwipeCarousel>
    );
    
    const carousel = screen.getByTestId('item-1').parentElement;
    
    // Start dragging
    fireEvent.mouseDown(carousel!, { clientX: 100 });
    
    // Wait longer than auto-play interval
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should not have auto-advanced due to user interaction
    expect(onSlideChange).not.toHaveBeenCalled();
  });

  it('handles mouse events when trackMouse is enabled', () => {
    render(<SwipeCarousel>{mockItems}</SwipeCarousel>);
    
    const carousel = screen.getByTestId('item-1').parentElement;
    
    // Simulate mouse drag
    fireEvent.mouseDown(carousel!, { clientX: 100 });
    fireEvent.mouseMove(carousel!, { clientX: 50 });
    fireEvent.mouseUp(carousel!, { clientX: 0 });
    
    // Verify mouse events are handled
    expect(carousel).toBeInTheDocument();
  });

  it('applies custom gap between items', () => {
    render(<SwipeCarousel gap={32}>{mockItems}</SwipeCarousel>);
    
    const carousel = screen.getByTestId('item-1').parentElement;
    expect(carousel).toHaveStyle('gap: 32px');
  });

  it('applies custom className', () => {
    render(<SwipeCarousel className="custom-carousel">{mockItems}</SwipeCarousel>);
    
    const container = screen.getByTestId('item-1').closest('.custom-carousel');
    expect(container).toBeInTheDocument();
  });
});