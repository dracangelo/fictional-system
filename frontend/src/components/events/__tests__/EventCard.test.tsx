import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../../test/utils'
import { EventCard } from '../EventCard'

const mockEvent = {
  id: '1',
  title: 'Test Concert',
  description: 'A great concert featuring amazing artists',
  venue: 'Concert Hall',
  address: '123 Music Street, City',
  start_datetime: '2024-12-01T19:00:00Z',
  end_datetime: '2024-12-01T22:00:00Z',
  category: 'music',
  image: '/test-image.jpg',
  price_range: { min: 25, max: 50 },
  status: 'published',
  ticket_types: [
    { id: '1', name: 'General', price: '25.00', quantity_available: 100 },
    { id: '2', name: 'VIP', price: '50.00', quantity_available: 20 },
  ],
}

describe('EventCard Component', () => {
  it('renders event information correctly', () => {
    renderWithProviders(<EventCard event={mockEvent} />)
    
    expect(screen.getByText('Test Concert')).toBeInTheDocument()
    expect(screen.getByText('Concert Hall')).toBeInTheDocument()
    expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/7:00 PM/)).toBeInTheDocument()
    expect(screen.getByText('$25 - $50')).toBeInTheDocument()
  })

  it('displays event image with proper alt text', () => {
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', '/test-image.jpg')
    expect(image).toHaveAttribute('alt', 'Test Concert')
  })

  it('shows fallback image when no image provided', () => {
    const eventWithoutImage = { ...mockEvent, image: undefined }
    renderWithProviders(<EventCard event={eventWithoutImage} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', '/placeholder-event.jpg')
  })

  it('displays category badge', () => {
    renderWithProviders(<EventCard event={mockEvent} />)
    
    expect(screen.getByText('Music')).toBeInTheDocument()
    expect(screen.getByTestId('category-badge')).toHaveClass('category-music')
  })

  it('shows sold out status when no tickets available', () => {
    const soldOutEvent = {
      ...mockEvent,
      ticket_types: [
        { id: '1', name: 'General', price: '25.00', quantity_available: 0 },
      ],
    }
    
    renderWithProviders(<EventCard event={soldOutEvent} />)
    
    expect(screen.getByText('Sold Out')).toBeInTheDocument()
    expect(screen.getByTestId('sold-out-badge')).toBeInTheDocument()
  })

  it('shows limited tickets warning when few tickets left', () => {
    const limitedEvent = {
      ...mockEvent,
      ticket_types: [
        { id: '1', name: 'General', price: '25.00', quantity_available: 5 },
      ],
    }
    
    renderWithProviders(<EventCard event={limitedEvent} />)
    
    expect(screen.getByText('Only 5 tickets left')).toBeInTheDocument()
    expect(screen.getByTestId('limited-tickets-warning')).toBeInTheDocument()
  })

  it('handles click to navigate to event details', async () => {
    const user = userEvent.setup()
    const mockNavigate = vi.fn()
    
    // Mock useNavigate hook
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      }
    })
    
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const card = screen.getByTestId('event-card')
    await user.click(card)
    
    expect(mockNavigate).toHaveBeenCalledWith('/events/1')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    const mockNavigate = vi.fn()
    
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      }
    })
    
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const card = screen.getByTestId('event-card')
    card.focus()
    
    await user.keyboard('{Enter}')
    expect(mockNavigate).toHaveBeenCalledWith('/events/1')
    
    await user.keyboard(' ')
    expect(mockNavigate).toHaveBeenCalledTimes(2)
  })

  it('shows wishlist button for authenticated users', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer' as const,
    }
    
    renderWithProviders(<EventCard event={mockEvent} />, { user: mockUser })
    
    expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument()
  })

  it('does not show wishlist button for unauthenticated users', () => {
    renderWithProviders(<EventCard event={mockEvent} />, { user: null })
    
    expect(screen.queryByRole('button', { name: /add to wishlist/i })).not.toBeInTheDocument()
  })

  it('handles wishlist toggle', async () => {
    const user = userEvent.setup()
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer' as const,
    }
    
    const mockAddToWishlist = vi.fn()
    const mockRemoveFromWishlist = vi.fn()
    
    renderWithProviders(
      <EventCard 
        event={mockEvent} 
        onAddToWishlist={mockAddToWishlist}
        onRemoveFromWishlist={mockRemoveFromWishlist}
      />, 
      { user: mockUser }
    )
    
    const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i })
    await user.click(wishlistButton)
    
    expect(mockAddToWishlist).toHaveBeenCalledWith('1')
  })

  it('shows different states for past events', () => {
    const pastEvent = {
      ...mockEvent,
      start_datetime: '2023-12-01T19:00:00Z',
      end_datetime: '2023-12-01T22:00:00Z',
    }
    
    renderWithProviders(<EventCard event={pastEvent} />)
    
    expect(screen.getByTestId('event-card')).toHaveClass('event-past')
    expect(screen.getByText('Past Event')).toBeInTheDocument()
  })

  it('shows upcoming event indicator', () => {
    const upcomingEvent = {
      ...mockEvent,
      start_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    }
    
    renderWithProviders(<EventCard event={upcomingEvent} />)
    
    expect(screen.getByText(/in \d+ day/)).toBeInTheDocument()
  })

  it('displays event rating when available', () => {
    const ratedEvent = {
      ...mockEvent,
      rating: 4.5,
      review_count: 123,
    }
    
    renderWithProviders(<EventCard event={ratedEvent} />)
    
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('(123 reviews)')).toBeInTheDocument()
    expect(screen.getAllByTestId('star-icon')).toHaveLength(5)
  })

  it('shows loading state', () => {
    renderWithProviders(<EventCard event={mockEvent} loading />)
    
    expect(screen.getByTestId('event-card-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Test Concert')).not.toBeInTheDocument()
  })

  it('handles image loading errors', async () => {
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const image = screen.getByRole('img')
    
    // Simulate image load error
    fireEvent.error(image)
    
    await waitFor(() => {
      expect(image).toHaveAttribute('src', '/placeholder-event.jpg')
    })
  })

  it('shows event tags when available', () => {
    const taggedEvent = {
      ...mockEvent,
      tags: ['rock', 'live-music', 'outdoor'],
    }
    
    renderWithProviders(<EventCard event={taggedEvent} />)
    
    expect(screen.getByText('rock')).toBeInTheDocument()
    expect(screen.getByText('live-music')).toBeInTheDocument()
    expect(screen.getByText('outdoor')).toBeInTheDocument()
  })

  it('displays discount badge when event has active discounts', () => {
    const discountedEvent = {
      ...mockEvent,
      has_active_discount: true,
      discount_percentage: 20,
    }
    
    renderWithProviders(<EventCard event={discountedEvent} />)
    
    expect(screen.getByText('20% OFF')).toBeInTheDocument()
    expect(screen.getByTestId('discount-badge')).toBeInTheDocument()
  })

  it('shows venue capacity information', () => {
    const eventWithCapacity = {
      ...mockEvent,
      venue_capacity: 500,
      tickets_sold: 350,
    }
    
    renderWithProviders(<EventCard event={eventWithCapacity} />)
    
    expect(screen.getByText('350/500 tickets sold')).toBeInTheDocument()
    expect(screen.getByTestId('capacity-indicator')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const card = screen.getByTestId('event-card')
    expect(card).toHaveAttribute('role', 'article')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('Test Concert'))
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('alt', 'Test Concert')
    
    const title = screen.getByRole('heading', { level: 3 })
    expect(title).toHaveTextContent('Test Concert')
  })

  it('supports different card sizes', () => {
    const { rerender } = renderWithProviders(<EventCard event={mockEvent} size="sm" />)
    expect(screen.getByTestId('event-card')).toHaveClass('event-card-sm')
    
    rerender(<EventCard event={mockEvent} size="lg" />)
    expect(screen.getByTestId('event-card')).toHaveClass('event-card-lg')
  })

  it('shows quick action buttons on hover', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const card = screen.getByTestId('event-card')
    await user.hover(card)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /quick book/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    })
  })

  it('handles share functionality', async () => {
    const user = userEvent.setup()
    const mockShare = vi.fn()
    
    // Mock Web Share API
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    })
    
    renderWithProviders(<EventCard event={mockEvent} />)
    
    const card = screen.getByTestId('event-card')
    await user.hover(card)
    
    const shareButton = await screen.findByRole('button', { name: /share/i })
    await user.click(shareButton)
    
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test Concert',
      text: 'Check out this event: Test Concert',
      url: expect.stringContaining('/events/1'),
    })
  })
})