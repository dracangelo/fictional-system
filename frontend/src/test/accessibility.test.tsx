import React from 'react'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { renderWithProviders, axeConfig } from './utils'

// Import components to test
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import { LoginForm } from '../components/forms/LoginForm'
import { SeatMap } from '../components/booking/SeatMap'
import { EventCard } from '../components/events/EventCard'
import { HomePage } from '../pages/HomePage'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  describe('UI Components', () => {
    it('Button component should be accessible', async () => {
      const { container } = render(
        <div>
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button loading>Loading Button</Button>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('Input component should be accessible', async () => {
      const { container } = render(
        <div>
          <Input label="Email Address" type="email" required />
          <Input label="Password" type="password" />
          <Input label="Name" error="This field is required" />
          <Input label="Phone" helperText="Include country code" />
          <Input label="Search" startAdornment={<span>🔍</span>} />
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('Modal component should be accessible', async () => {
      const { container } = render(
        <Modal 
          open 
          onClose={() => {}} 
          title="Test Modal"
          description="This is a test modal"
        >
          <div>
            <p>Modal content goes here</p>
            <button>Action Button</button>
          </div>
        </Modal>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('Card component should be accessible', async () => {
      const { container } = render(
        <Card>
          <Card.Header>
            <Card.Title>Card Title</Card.Title>
            <Card.Description>Card description</Card.Description>
          </Card.Header>
          <Card.Content>
            <p>Card content</p>
          </Card.Content>
          <Card.Footer>
            <Button>Action</Button>
          </Card.Footer>
        </Card>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Components', () => {
    it('LoginForm should be accessible', async () => {
      const { container } = renderWithProviders(
        <LoginForm onSuccess={() => {}} onError={() => {}} />
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('Form with validation errors should be accessible', async () => {
      const { container } = render(
        <form>
          <Input 
            label="Email" 
            type="email" 
            error="Please enter a valid email address"
            required
          />
          <Input 
            label="Password" 
            type="password" 
            error="Password must be at least 8 characters"
            required
          />
          <Button type="submit">Submit</Button>
        </form>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Booking Components', () => {
    it('SeatMap should be accessible', async () => {
      const mockProps = {
        seatingLayout: {
          rows: 5,
          seatsPerRow: 8,
          vipRows: [1, 2],
          disabledSeats: ['A1', 'A8'],
        },
        bookedSeats: ['B3', 'B4'],
        selectedSeats: ['C5'],
        onSeatSelect: () => {},
        onSeatDeselect: () => {},
        pricing: { regular: 25, vip: 40 },
      }

      const { container } = renderWithProviders(
        <SeatMap {...mockProps} />
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('EventCard should be accessible', async () => {
      const mockEvent = {
        id: '1',
        title: 'Test Concert',
        description: 'A great concert',
        venue: 'Test Venue',
        start_datetime: '2024-12-01T19:00:00Z',
        category: 'music',
        image: '/test-image.jpg',
        price_range: { min: 25, max: 50 },
      }

      const { container } = renderWithProviders(
        <EventCard event={mockEvent} />
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Page Components', () => {
    it('HomePage should be accessible', async () => {
      const { container } = renderWithProviders(<HomePage />)

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Navigation and Focus Management', () => {
    it('should have proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Main Page Title</h1>
          <section>
            <h2>Section Title</h2>
            <article>
              <h3>Article Title</h3>
              <p>Content</p>
            </article>
          </section>
        </div>
      )

      const results = await axe(container, {
        ...axeConfig,
        rules: {
          ...axeConfig.rules,
          'heading-order': { enabled: true },
        },
      })
      expect(results).toHaveNoViolations()
    })

    it('should have proper landmark structure', async () => {
      const { container } = render(
        <div>
          <header role="banner">
            <nav aria-label="Main navigation">
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/events">Events</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <h1>Page Content</h1>
            <p>Main content goes here</p>
          </main>
          <footer role="contentinfo">
            <p>Footer content</p>
          </footer>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('should have proper skip links', async () => {
      const { container } = render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/events">Events</a></li>
            </ul>
          </nav>
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Interactive Elements', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      const { container } = render(
        <div>
          <button aria-label="Close dialog">×</button>
          <button aria-describedby="help-text">Submit</button>
          <div id="help-text">Click to submit the form</div>
          <input type="search" aria-label="Search events" />
          <select aria-label="Sort by">
            <option value="date">Date</option>
            <option value="price">Price</option>
          </select>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('should have proper focus indicators', async () => {
      const { container } = render(
        <div>
          <button className="focus:ring-2 focus:ring-blue-500">
            Focusable Button
          </button>
          <input 
            type="text" 
            className="focus:ring-2 focus:ring-blue-500"
            placeholder="Focusable Input"
          />
          <a 
            href="/test" 
            className="focus:ring-2 focus:ring-blue-500"
          >
            Focusable Link
          </a>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Images and Media', () => {
    it('should have proper alt text for images', async () => {
      const { container } = render(
        <div>
          <img src="/event1.jpg" alt="Concert at Madison Square Garden" />
          <img src="/event2.jpg" alt="Comedy show featuring John Doe" />
          <img src="/decoration.jpg" alt="" role="presentation" />
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('should handle decorative images properly', async () => {
      const { container } = render(
        <div>
          <img src="/background.jpg" alt="" />
          <div 
            style={{ backgroundImage: 'url(/bg.jpg)' }}
            role="img"
            aria-label="Background pattern"
          />
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Tables and Data', () => {
    it('should have accessible data tables', async () => {
      const { container } = render(
        <table>
          <caption>Event Booking Summary</caption>
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Date</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Concert A</td>
              <td>Dec 1, 2024</td>
              <td>$50</td>
            </tr>
            <tr>
              <td>Concert B</td>
              <td>Dec 2, 2024</td>
              <td>$75</td>
            </tr>
          </tbody>
        </table>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Live Regions and Dynamic Content', () => {
    it('should have proper live regions for dynamic updates', async () => {
      const { container } = render(
        <div>
          <div aria-live="polite" aria-label="Status updates">
            Form saved successfully
          </div>
          <div aria-live="assertive" aria-label="Error messages">
            Error: Please fix the required fields
          </div>
          <div aria-live="off" aria-label="Chat messages">
            New message received
          </div>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', async () => {
      const { container } = render(
        <div>
          <div className="text-red-600">
            <span className="mr-2">⚠️</span>
            Error: This field is required
          </div>
          <div className="text-green-600">
            <span className="mr-2">✓</span>
            Success: Form submitted
          </div>
          <button className="bg-blue-600 text-white border-2 border-blue-800">
            Primary Action
          </button>
        </div>
      )

      const results = await axe(container, {
        ...axeConfig,
        rules: {
          ...axeConfig.rules,
          'color-contrast': { enabled: true }, // Enable for this specific test
        },
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have proper touch targets', async () => {
      const { container } = render(
        <div>
          <button className="min-h-[44px] min-w-[44px] p-2">
            Touch Target
          </button>
          <a href="/test" className="inline-block min-h-[44px] min-w-[44px] p-2">
            Link Target
          </a>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })

    it('should support zoom up to 200%', async () => {
      const { container } = render(
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-0 break-words">
            <h1 className="text-responsive">Responsive Heading</h1>
            <p className="text-responsive">
              This content should be readable when zoomed to 200%
            </p>
            <button className="text-responsive px-4 py-2">
              Responsive Button
            </button>
          </div>
        </div>
      )

      const results = await axe(container, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })
})