describe('Booking Flow', () => {
  beforeEach(() => {
    cy.clearTestData()
    cy.seedTestData() // Login as customer
    
    // Mock API responses
    cy.mockApiResponse('GET', '/api/events/*', {
      id: '1',
      title: 'Test Concert',
      description: 'A great concert',
      venue: 'Test Venue',
      start_datetime: '2024-12-01T19:00:00Z',
      ticket_types: [
        { id: '1', name: 'General', price: '25.00', quantity_available: 100 },
        { id: '2', name: 'VIP', price: '50.00', quantity_available: 20 }
      ]
    })
    
    cy.mockApiResponse('GET', '/api/showtimes/*', {
      id: '1',
      movie: { title: 'Test Movie' },
      theater: { name: 'Test Theater' },
      start_time: '2024-12-01T19:00:00Z',
      available_seats: 80,
      booked_seats: ['A1', 'A2', 'B5']
    })
  })

  describe('Event Booking', () => {
    it('should complete event booking successfully', () => {
      cy.mockApiResponse('POST', '/api/bookings/', {
        id: '1',
        booking_reference: 'BK123456',
        total_amount: '50.00',
        booking_status: 'confirmed'
      })

      cy.visit('/events/1')
      
      // Event details should be visible
      cy.get('[data-testid="event-title"]').should('contain', 'Test Concert')
      cy.get('[data-testid="event-venue"]').should('contain', 'Test Venue')
      
      // Select ticket type and quantity
      cy.get('[data-testid="ticket-type-general"]').click()
      cy.get('[data-testid="quantity-selector"]').select('2')
      
      // Proceed to checkout
      cy.get('[data-testid="add-to-cart"]').click()
      cy.get('[data-testid="proceed-to-checkout"]').click()
      
      // Fill customer information
      cy.get('[data-testid="customer-name"]').type('John Doe')
      cy.get('[data-testid="customer-email"]').type('john@example.com')
      cy.get('[data-testid="customer-phone"]').type('+1234567890')
      
      // Fill payment information
      cy.get('[data-testid="card-number"]').type('4242424242424242')
      cy.get('[data-testid="card-expiry"]').type('12/25')
      cy.get('[data-testid="card-cvc"]').type('123')
      cy.get('[data-testid="cardholder-name"]').type('John Doe')
      
      // Complete booking
      cy.get('[data-testid="complete-booking"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should show confirmation
      cy.get('[data-testid="booking-confirmation"]').should('be.visible')
      cy.get('[data-testid="booking-reference"]').should('contain', 'BK123456')
      cy.get('[data-testid="total-amount"]').should('contain', '$50.00')
    })

    it('should show validation errors for incomplete information', () => {
      cy.visit('/events/1')
      
      cy.get('[data-testid="ticket-type-general"]').click()
      cy.get('[data-testid="add-to-cart"]').click()
      cy.get('[data-testid="proceed-to-checkout"]').click()
      
      // Try to complete without filling required fields
      cy.get('[data-testid="complete-booking"]').click()
      
      // Should show validation errors
      cy.get('[data-testid="name-error"]').should('contain', 'Name is required')
      cy.get('[data-testid="email-error"]').should('contain', 'Email is required')
      cy.get('[data-testid="card-error"]').should('contain', 'Card number is required')
    })

    it('should handle payment failures gracefully', () => {
      cy.mockApiResponse('POST', '/api/bookings/', {
        statusCode: 400,
        body: { message: 'Payment failed' }
      })

      cy.visit('/events/1')
      
      cy.get('[data-testid="ticket-type-general"]').click()
      cy.get('[data-testid="add-to-cart"]').click()
      cy.get('[data-testid="proceed-to-checkout"]').click()
      
      // Fill all required information
      cy.get('[data-testid="customer-name"]').type('John Doe')
      cy.get('[data-testid="customer-email"]').type('john@example.com')
      cy.get('[data-testid="card-number"]').type('4000000000000002') // Declined card
      cy.get('[data-testid="card-expiry"]').type('12/25')
      cy.get('[data-testid="card-cvc"]').type('123')
      
      cy.get('[data-testid="complete-booking"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should show error message
      cy.get('[data-testid="payment-error"]').should('contain', 'Payment failed')
      
      // Should allow retry
      cy.get('[data-testid="retry-payment"]').should('be.visible')
    })
  })

  describe('Movie Booking with Seat Selection', () => {
    it('should complete movie booking with seat selection', () => {
      cy.mockApiResponse('POST', '/api/bookings/', {
        id: '1',
        booking_reference: 'BK789012',
        total_amount: '30.00',
        booking_status: 'confirmed'
      })

      cy.visit('/showtimes/1')
      
      // Should show seat map
      cy.get('[data-testid="seat-map"]').should('be.visible')
      
      // Select available seats
      cy.get('[data-testid="seat-C3"]').click()
      cy.get('[data-testid="seat-C4"]').click()
      
      // Should show selected seats in summary
      cy.get('[data-testid="selected-seats"]').should('contain', 'C3, C4')
      cy.get('[data-testid="total-price"]').should('contain', '$30.00')
      
      // Proceed to checkout
      cy.get('[data-testid="proceed-to-checkout"]').click()
      
      // Fill payment information
      cy.get('[data-testid="card-number"]').type('4242424242424242')
      cy.get('[data-testid="card-expiry"]').type('12/25')
      cy.get('[data-testid="card-cvc"]').type('123')
      
      cy.get('[data-testid="complete-booking"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should show confirmation with seat details
      cy.get('[data-testid="booking-confirmation"]').should('be.visible')
      cy.get('[data-testid="confirmed-seats"]').should('contain', 'C3, C4')
    })

    it('should prevent selection of booked seats', () => {
      cy.visit('/showtimes/1')
      
      // Try to select a booked seat
      cy.get('[data-testid="seat-A1"]').should('have.class', 'seat-booked')
      cy.get('[data-testid="seat-A1"]').should('be.disabled')
      
      // Click should not select the seat
      cy.get('[data-testid="seat-A1"]').click({ force: true })
      cy.get('[data-testid="selected-seats"]').should('not.contain', 'A1')
    })

    it('should show real-time seat updates', () => {
      cy.visit('/showtimes/1')
      
      // Initially seat C5 is available
      cy.get('[data-testid="seat-C5"]').should('not.have.class', 'seat-booked')
      
      // Simulate real-time update (another user books the seat)
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('seat-update', {
          detail: { seatNumber: 'C5', status: 'booked' }
        }))
      })
      
      // Seat should now be marked as booked
      cy.get('[data-testid="seat-C5"]').should('have.class', 'seat-booked')
    })

    it('should handle seat selection limits', () => {
      cy.visit('/showtimes/1')
      
      // Select maximum allowed seats (assume limit is 6)
      const seats = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']
      seats.forEach(seat => {
        cy.get(`[data-testid="seat-${seat}"]`).click()
      })
      
      // Try to select one more seat
      cy.get('[data-testid="seat-C7"]').click()
      
      // Should show limit message
      cy.get('[data-testid="seat-limit-message"]').should('contain', 'Maximum 6 seats')
      
      // Seat should not be selected
      cy.get('[data-testid="selected-seats"]').should('not.contain', 'C7')
    })
  })

  describe('Booking Management', () => {
    it('should display booking history', () => {
      cy.mockApiResponse('GET', '/api/bookings/', {
        results: [
          {
            id: '1',
            booking_reference: 'BK123456',
            event: { title: 'Past Concert' },
            total_amount: '50.00',
            booking_status: 'confirmed',
            created_at: '2024-11-01T10:00:00Z'
          }
        ]
      })

      cy.visit('/dashboard/bookings')
      
      cy.waitForApi('apiCall')
      
      // Should show booking history
      cy.get('[data-testid="booking-item"]').should('have.length', 1)
      cy.get('[data-testid="booking-reference"]').should('contain', 'BK123456')
      cy.get('[data-testid="booking-event"]').should('contain', 'Past Concert')
      cy.get('[data-testid="booking-amount"]').should('contain', '$50.00')
    })

    it('should allow booking cancellation', () => {
      cy.mockApiResponse('POST', '/api/bookings/1/cancel/', {
        message: 'Booking cancelled successfully'
      })

      cy.visit('/dashboard/bookings/1')
      
      // Should show booking details
      cy.get('[data-testid="booking-details"]').should('be.visible')
      
      // Cancel booking
      cy.get('[data-testid="cancel-booking"]').click()
      
      // Confirm cancellation
      cy.get('[data-testid="confirm-cancel"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should show cancellation confirmation
      cy.get('[data-testid="cancellation-success"]').should('contain', 'Booking cancelled')
    })

    it('should show booking QR codes', () => {
      cy.mockApiResponse('GET', '/api/bookings/1/', {
        id: '1',
        booking_reference: 'BK123456',
        tickets: [
          { id: '1', ticket_number: 'TK001', qr_code: 'mock-qr-code-data' }
        ]
      })

      cy.visit('/dashboard/bookings/1')
      
      cy.waitForApi('apiCall')
      
      // Should show QR code
      cy.get('[data-testid="ticket-qr-code"]').should('be.visible')
      cy.get('[data-testid="ticket-number"]').should('contain', 'TK001')
    })
  })

  describe('Mobile Booking Experience', () => {
    it('should work on mobile devices', () => {
      cy.setMobileViewport()
      
      cy.visit('/events/1')
      
      // Should show mobile-optimized layout
      cy.get('[data-testid="mobile-event-header"]').should('be.visible')
      
      // Booking flow should work on mobile
      cy.get('[data-testid="ticket-type-general"]').click()
      cy.get('[data-testid="mobile-checkout-button"]').click()
      
      // Should show mobile checkout modal
      cy.get('[data-testid="mobile-checkout-modal"]').should('be.visible')
    })

    it('should support touch gestures for seat selection', () => {
      cy.setMobileViewport()
      cy.visit('/showtimes/1')
      
      // Should show mobile seat map
      cy.get('[data-testid="mobile-seat-map"]').should('be.visible')
      
      // Touch gestures should work
      cy.get('[data-testid="seat-C3"]').trigger('touchstart')
      cy.get('[data-testid="seat-C3"]').trigger('touchend')
      
      cy.get('[data-testid="selected-seats"]').should('contain', 'C3')
    })
  })

  describe('Performance', () => {
    it('should load booking page quickly', () => {
      const performance = cy.measurePerformance('booking-page-load')
      
      cy.visit('/events/1')
      
      cy.get('[data-testid="event-title"]').should('be.visible')
      
      performance.end()
    })

    it('should handle large seat maps efficiently', () => {
      // Mock large theater with 500 seats
      cy.mockApiResponse('GET', '/api/showtimes/*', {
        id: '1',
        seating_layout: { rows: 25, seatsPerRow: 20 },
        booked_seats: Array.from({ length: 100 }, (_, i) => `A${i + 1}`)
      })

      const performance = cy.measurePerformance('large-seat-map')
      
      cy.visit('/showtimes/1')
      
      cy.get('[data-testid="seat-map"]').should('be.visible')
      cy.get('[data-testid="seat-A1"]').should('be.visible')
      
      performance.end()
    })
  })

  describe('Accessibility', () => {
    it('should be accessible during booking flow', () => {
      cy.visit('/events/1')
      cy.checkA11y()
      
      cy.get('[data-testid="ticket-type-general"]').click()
      cy.get('[data-testid="proceed-to-checkout"]').click()
      cy.checkA11y()
    })

    it('should support keyboard navigation in seat map', () => {
      cy.visit('/showtimes/1')
      
      // Focus first available seat
      cy.get('[data-testid="seat-B1"]').focus()
      
      // Arrow keys should navigate
      cy.focused().type('{rightarrow}')
      cy.focused().should('have.attr', 'data-testid', 'seat-B2')
      
      cy.focused().type('{downarrow}')
      cy.focused().should('have.attr', 'data-testid', 'seat-C2')
      
      // Enter should select seat
      cy.focused().type('{enter}')
      cy.get('[data-testid="selected-seats"]').should('contain', 'C2')
    })

    it('should announce seat selection to screen readers', () => {
      cy.visit('/showtimes/1')
      
      cy.get('[data-testid="seat-C3"]').click()
      
      // Should have live region announcement
      cy.get('[data-testid="seat-announcement"]').should('contain', 'Seat C3 selected')
    })
  })
})