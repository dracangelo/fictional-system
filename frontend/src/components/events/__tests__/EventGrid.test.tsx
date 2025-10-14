import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventGrid } from '../EventGrid';

describe('EventGrid', () => {
  it('renders children in a responsive grid layout', () => {
    render(
      <EventGrid>
        <div>Event 1</div>
        <div>Event 2</div>
        <div>Event 3</div>
      </EventGrid>
    );

    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
  });

  it('applies responsive grid classes', () => {
    const { container } = render(
      <EventGrid>
        <div>Event 1</div>
      </EventGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid');
    expect(gridElement).toHaveClass('grid-cols-1');
    expect(gridElement).toHaveClass('sm:grid-cols-2');
    expect(gridElement).toHaveClass('lg:grid-cols-3');
    expect(gridElement).toHaveClass('gap-6');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <EventGrid className="custom-class">
        <div>Event 1</div>
      </EventGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('custom-class');
    expect(gridElement).toHaveClass('grid'); // Should still have base classes
  });

  it('renders empty grid when no children provided', () => {
    const { container } = render(<EventGrid />);

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toBeEmptyDOMElement();
    expect(gridElement).toHaveClass('grid');
  });
});