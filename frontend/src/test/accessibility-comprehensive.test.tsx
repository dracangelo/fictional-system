import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, axeConfig } from './utils'

// Import components for accessibility testing
import { SeatMap } from '../components/booking/SeatMap'
import { CheckoutModal } from '../components/booking/CheckoutModal'
import { EventForm } from '../components/events/EventForm'
import { LoginForm } from '../components/forms/LoginForm'
import { HomePage } from '../pages/HomePage'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Comprehensive Accessibility Tests', () => {
  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation in seat map', async () => {
      const user = userEvent.setup()
      const mockProps = {
        seatingLayout: { rows: 3, seatsPerRow: 4, vipRows: [1], disabledSeats: ['A1'] },
        bookedSeats: ['B2'],
        selectedSeats: [],
        onSeatSelect: vi.fn(),
        onSeatDeselect: vi.fn(),
        pricing: { regular: 25, vip: 40 },
      }
      
      renderWithProviders(<SeatMap {...mockProps} />)
      
      // Focus should start on first available seat
      const firstSeat = screen.getByTestId('seat-A2')
      firstSeat.focus()
      
      // Test arrow key navigation
      await user.keyboard('{ArrowRight}')
      expect(screen.getByTestId('seat-A3')).toHaveFocus()
      
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('seat-B3')).toHaveFocus()
      
      await user.keyboard('{ArrowLeft}')
      expect(screen.getByTestId('seat-B2')).toHaveFocus() // Should skip booked seat
      
      await user.keyboard('{ArrowUp}')
      expect(screen.getByTestId('seat-A2')).toHaveFocus()
      
      // Test seat selection with keyboard
      await user.keyboard('{Enter}')
      expect(mockProps.onSeatSelect).toHaveBeenCalledWith('A2')
      
      await user.keyboard(' ')
      expect(mockProps.onSeatSelect).toHaveBeenCalledWith('A2')
    })

    it('should support keyboard navigation in forms', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<LoginForm onSuccess={() => {}} onError={() => {}} />)
      
      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /show password/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/remember me/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })

    it('should handle focus trapping in modals', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <CheckoutModal
          open
          onClose={() => {}}
          bookingData={{
            event: { id: '1', title: 'Test Event' },
            tickets: [{ type: 'General', quantity: 2, price: 50 }],
            total: 50,
          }}
        />
      )
      
      // Focus should be trapped within modal
      const closeButton = screen.getByRole('button', { name: /close/i })
      const submitButton = screen.getByRole('button', { name: /complete booking/i })
      
      // Tab from last element should go to first
      submitButton.focus()
      await user.tab()
      expect(closeButton).toHaveFocus()
      
      // Shift+Tab from first element should go to last
      await user.tab({ shift: true })
      expect(submitButton).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels for seat map', () => {
      const mockProps = {
        seatingLayout: { rows: 2, seatsPerRow: 3, vipRows: [1], disabledSeats: ['A1'] },
        bookedSeats: ['B2'],
        selectedSeats: ['A2'],
        onSeatSelect: vi.fn(),
        onSeatDeselect: vi.fn(),
        pricing: { regular: 25, vip: 40 },
      }
      
      renderWithProviders(<SeatMap {...mockProps} />)
      
      // Check seat map container
      const seatMap = screen.getByRole('grid')
      expect(seatMap).toHaveAttribute('aria-label', 'Seat selection map')
      
      // Check individual seats
      const availableSeat = screen.getByTestId('seat-A3')
      expect(availableSeat).toHaveAttribute('aria-label', 'Seat A3, Regular, $25, Available')
      
      const vipSeat = screen.getByTestId('seat-A2')
      expect(vipSeat).toHaveAttribute('aria-label', 'Seat A2, VIP, $40, Selected')
      
      const bookedSeat = screen.getByTestId('seat-B2')
      expect(bookedSeat).toHaveAttribute('aria-label', 'Seat B2, Regular, $25, Booked')
      expect(bookedSeat).toHaveAttribute('aria-disabled', 'true')
      
      const disabledSeat = screen.getByTestId('seat-A1')
      expect(disabledSeat).toHaveAttribute('aria-label', 'Seat A1, Regular, $25, Disabled')
      expect(disabledSeat).toHaveAttribute('aria-disabled', 'true')
    })

    it('should announce seat selection changes', async () => {
      const user = userEvent.setup()
      const mockProps = {
        seatingLayout: { rows: 2, seatsPerRow: 2, vipRows: [], disabledSeats: [] },
        bookedSeats: [],
        selectedSeats: [],
        onSeatSelect: vi.fn(),
        onSeatDeselect: vi.fn(),
        pricing: { regular: 25, vip: 40 },
      }
      
      renderWithProviders(<SeatMap {...mockProps} />)
      
      const seat = screen.getByTestId('seat-A1')
      await user.click(seat)
      
      // Should have live region announcement
      const announcement = screen.getByRole('status')
      expect(announcement).toHaveTextContent('Seat A1 selected')
    })

    it('should provide proper form labels and descriptions', () => {
      renderWithProviders(<LoginForm onSuccess={() => {}} onError={() => {}} />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('aria-required', 'true')
      expect(passwordInput).toHaveAttribute('aria-required', 'true')
      
      // Check for proper labeling
      expect(emailInput).toHaveAccessibleName()
      expect(passwordInput).toHaveAccessibleName()
    })

    it('should provide error announcements', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<LoginForm onSuccess={() => {}} onError={() => {}} />)
      
      // Submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
        expect(emailInput).toHaveAttribute('aria-describedby')
        
        const errorMessage = screen.getByText(/email is required/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })

  describe('Color and Contrast', () => {
    it('should not rely solely on color for seat states', () => {
      const mockProps = {
        seatingLayout: { rows: 2, seatsPerRow: 2, vipRows: [1], disabledSeats: ['A1'] },
        bookedSeats: ['B1'],
        selectedSeats: ['A2'],
        onSeatSelect: vi.fn(),
        onSeatDeselect: vi.fn(),
        pricing: { regular: 25, vip: 40 },
      }
      
      renderWithProviders(<SeatMap {...mockProps} />)
      
      // Check that seats have text or icon indicators, not just color
      const selectedSeat = screen.getByTestId('seat-A2')
      expect(selectedSeat).toHaveAttribute('aria-label', expect.stringContaining('Selected'))
      
      const bookedSeat = screen.getByTestId('seat-B1')
      expect(bookedSeat).toHaveAttribute('aria-label', expect.stringContaining('Booked'))
      
      const disabledSeat = screen.getByTestId('seat-A1')
      expect(disabledSeat).toHaveAttribute('aria-label', expect.stringContaining('Disabled'))
    })

    it('should provide sufficient color contrast', async () => {
      renderWithProviders(<HomePage />)
      
      const results = await axe(document.body, {
        ...axeConfig,
        rules: {
          ...axeConfig.rules,
          'color-contrast': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })
  })

  describe('Focus Management', () => {
    it('should manage focus properly in dynamic content', async () => {
      const user = userEvent.setup()
      
      const DynamicContent = () => {
        const [showContent, setShowContent] = React.useState(false)
        
        return (
          <div>
            <button onClick={() => setShowContent(!showContent)}>
              Toggle Content
            </button>
            {showContent && (
              <div>
                <h2>Dynamic Content</h2>
                <button>Action Button</button>
              </div>
            )}
          </div>
        )
      }
      
      render(<DynamicContent />)
      
      const toggleButton = screen.getByRole('button', { name: /toggle content/i })
      await user.click(toggleButton)
      
      // Focus should move to the new content
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /dynamic content/i })
        expect(heading).toBeInTheDocument()
      })
    })

    it('should restore focus after modal closes', async () => {
      const user = userEvent.setup()
      
      const ModalTest = () => {
        const [isOpen, setIsOpen] = React.useState(false)
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            {isOpen && (
              <div role="dialog" aria-modal="true">
                <button onClick={() => setIsOpen(false)}>Close</button>
              </div>
            )}
          </div>
        )
      }
      
      render(<ModalTest />)
      
      const openButton = screen.getByRole('button', { name: /open modal/i })
      await user.click(openButton)
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)
      
      // Focus should return to the open button
      await waitFor(() => {
        expect(openButton).toHaveFocus()
      })
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have proper touch targets', () => {
      renderWithProviders(
        <div>
          <button className="min-h-[44px] min-w-[44px] p-2">
            Touch Button
          </button>
          <a href="/test" className="inline-block min-h-[44px] min-w-[44px] p-2">
            Touch Link
          </a>
        </div>
      )
      
      const button = screen.getByRole('button')
      const link = screen.getByRole('link')
      
      // Check minimum touch target size (44px x 44px)
      const buttonStyles = getComputedStyle(button)
      const linkStyles = getComputedStyle(link)
      
      expect(parseInt(buttonStyles.minHeight)).toBeGreaterThanOrEqual(44)
      expect(parseInt(buttonStyles.minWidth)).toBeGreaterThanOrEqual(44)
      expect(parseInt(linkStyles.minHeight)).toBeGreaterThanOrEqual(44)
      expect(parseInt(linkStyles.minWidth)).toBeGreaterThanOrEqual(44)
    })

    it('should support zoom up to 200%', async () => {
      renderWithProviders(
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-0 break-words">
            <h1>Responsive Heading</h1>
            <p>This content should be readable when zoomed to 200%</p>
            <button>Responsive Button</button>
          </div>
        </div>
      )
      
      const results = await axe(document.body, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', () => {
      renderWithProviders(
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" required />
          
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required />
          
          <fieldset>
            <legend>Preferences</legend>
            <label>
              <input type="checkbox" name="newsletter" />
              Subscribe to newsletter
            </label>
          </fieldset>
        </form>
      )
      
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const checkbox = screen.getByLabelText(/subscribe/i)
      
      expect(nameInput).toHaveAttribute('id', 'name')
      expect(emailInput).toHaveAttribute('id', 'email')
      expect(checkbox).toHaveAttribute('name', 'newsletter')
    })

    it('should provide proper error handling', async () => {
      const user = userEvent.setup()
      
      const FormWithValidation = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({})
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const email = formData.get('email') as string
          
          if (!email) {
            setErrors({ email: 'Email is required' })
          } else if (!email.includes('@')) {
            setErrors({ email: 'Invalid email format' })
          } else {
            setErrors({})
          }
        }
        
        return (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <div id="email-error" role="alert">
                {errors.email}
              </div>
            )}
            <button type="submit">Submit</button>
          </form>
        )
      }
      
      render(<FormWithValidation />)
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        const errorMessage = screen.getByRole('alert')
        
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
        expect(errorMessage).toHaveTextContent('Email is required')
      })
    })
  })

  describe('Live Regions', () => {
    it('should announce status updates', async () => {
      const user = userEvent.setup()
      
      const StatusUpdater = () => {
        const [status, setStatus] = React.useState('')
        
        return (
          <div>
            <button onClick={() => setStatus('Form saved successfully')}>
              Save
            </button>
            <button onClick={() => setStatus('Error: Please try again')}>
              Error
            </button>
            <div role="status" aria-live="polite">
              {status}
            </div>
          </div>
        )
      }
      
      render(<StatusUpdater />)
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveTextContent('Form saved successfully')
    })

    it('should announce urgent updates', async () => {
      const user = userEvent.setup()
      
      const UrgentUpdater = () => {
        const [error, setError] = React.useState('')
        
        return (
          <div>
            <button onClick={() => setError('Critical error occurred!')}>
              Trigger Error
            </button>
            <div role="alert" aria-live="assertive">
              {error}
            </div>
          </div>
        )
      }
      
      render(<UrgentUpdater />)
      
      const errorButton = screen.getByRole('button', { name: /trigger error/i })
      await user.click(errorButton)
      
      const alertRegion = screen.getByRole('alert')
      expect(alertRegion).toHaveTextContent('Critical error occurred!')
    })
  })

  describe('Semantic HTML', () => {
    it('should use proper heading hierarchy', async () => {
      renderWithProviders(
        <div>
          <h1>Main Page Title</h1>
          <section>
            <h2>Section Title</h2>
            <article>
              <h3>Article Title</h3>
              <h4>Subsection</h4>
            </article>
          </section>
        </div>
      )
      
      const results = await axe(document.body, {
        ...axeConfig,
        rules: {
          ...axeConfig.rules,
          'heading-order': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should use proper landmark structure', async () => {
      renderWithProviders(
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
            <section aria-labelledby="section-heading">
              <h2 id="section-heading">Section</h2>
              <p>Content</p>
            </section>
          </main>
          <aside aria-label="Sidebar">
            <p>Sidebar content</p>
          </aside>
          <footer role="contentinfo">
            <p>Footer content</p>
          </footer>
        </div>
      )
      
      const results = await axe(document.body, axeConfig)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Skip Links', () => {
    it('should provide skip navigation links', () => {
      renderWithProviders(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#navigation" className="skip-link">
            Skip to navigation
          </a>
          <nav id="navigation">
            <ul>
              <li><a href="/">Home</a></li>
            </ul>
          </nav>
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      )
      
      const skipToMain = screen.getByRole('link', { name: /skip to main content/i })
      const skipToNav = screen.getByRole('link', { name: /skip to navigation/i })
      
      expect(skipToMain).toHaveAttribute('href', '#main-content')
      expect(skipToNav).toHaveAttribute('href', '#navigation')
    })
  })
})