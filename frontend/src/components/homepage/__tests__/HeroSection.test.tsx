import React from 'react';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';

import { vi } from 'vitest';

// Mock the SearchBar component
vi.mock('../SearchBar', () => ({
  SearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

describe('HeroSection', () => {
  it('renders hero content correctly', () => {
    render(<HeroSection />);
    
    // Check main heading
    expect(screen.getByText('Discover Your Next')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    
    // Check description
    expect(screen.getByText(/Find the perfect movie or event in your city/)).toBeInTheDocument();
    
    // Check call-to-action buttons
    expect(screen.getByRole('button', { name: /explore events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse movies/i })).toBeInTheDocument();
    
    // Check search bar is rendered
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('has proper styling classes for gradient background', () => {
    const { container } = render(<HeroSection />);
    
    const heroSection = container.firstChild as HTMLElement;
    expect(heroSection).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-blue-800');
  });

  it('renders decorative elements', () => {
    const { container } = render(<HeroSection />);
    
    // Check for decorative circles (they should have specific positioning classes)
    const decorativeElements = container.querySelectorAll('.absolute');
    expect(decorativeElements.length).toBeGreaterThan(0);
  });

  it('has responsive text sizing', () => {
    render(<HeroSection />);
    
    const mainHeading = screen.getByText('Discover Your Next');
    expect(mainHeading).toHaveClass('text-4xl', 'md:text-6xl');
    
    const description = screen.getByText(/Find the perfect movie or event in your city/);
    expect(description).toHaveClass('text-xl', 'md:text-2xl');
  });

  it('renders buttons with correct variants', () => {
    render(<HeroSection />);
    
    const exploreButton = screen.getByRole('button', { name: /explore events/i });
    const browseButton = screen.getByRole('button', { name: /browse movies/i });
    
    // Check button styling (these classes come from the Button component)
    expect(exploreButton).toHaveClass('bg-yellow-500');
    expect(browseButton).toHaveClass('border-white');
  });
});