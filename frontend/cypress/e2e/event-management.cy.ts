describe('Event Management', () => {
  beforeEach(() => {
    cy.clearTestData()
    cy.seedTestData() // Login as event owner
    
    // Mock event owner user
    cy.window().then((win) => {
      win.localStorage.setItem('auth_user', JSON.stringify({
        id: 'event-owner-1',
        email: 'owner@example.com',
        firstName: 'Event',
        lastName: 'Owner',
        role: 'event_owner'
      }))
    })
  })

  describe('Event Creation', () => {
    it('should create a new event successfully', () => {
      cy.mockApiResponse('POST', '/api/events/', {
        id: '1',
        title: 'New Concert',
        description: 'A great concert',
        venue: 'Concert Hall',
        start_datetime: '2024-12-01T19:00:00Z',
        end_datetime: '2024-12-01T22:00:00Z',
        category: 'music',
        status: 'draft'
      })

      cy.visit('/events/create')
      
      // Fill event details
      cy.get('[data-testid="event-title"]').type('New Concert')
      cy.get('[data-testid="event-description"]').type('A great concert featuring amazing artists')
      cy.get('[data-testid="event-venue"]').type('Concert Hall')
      cy.get('[data-testid="event-address"]').type('123 Music Street, City')
      
      // Set date and time
      cy.get('[data-testid="start-date"]').type('2024-12-01')
      cy.get('[data-testid="start-time"]').type('19:00')
      cy.get('[data-testid="end-date"]').type('2024-12-01')
      cy.get('[data-testid="end-time"]').type('22:00')
      
      // Select category
      cy.get('[data-testid="event-category"]').select('music')
      
      // Upload image
      cy.get('[data-testid="image-upload"]').selectFile('cypress/fixtures/event-image.jpg')
      
      // Add ticket types
      cy.get('[data-testid="add-ticket-type"]').click()
      cy.get('[data-testid="ticket-name-0"]').type('General Admission')
      cy.get('[data-testid="ticket-price-0"]').type('25.00')
      cy.get('[data-testid="ticket-quantity-0"]').type('100')
      
      cy.get('[data-testid="add-ticket-type"]').click()
      cy.get('[data-testid="ticket-name-1"]').type('VIP')
      cy.get('[data-testid="ticket-price-1"]').type('50.00')
      cy.get('[data-testid="ticket-quantity-1"]').type('20')
      
      // Save as draft
      cy.get('[data-testid="save-draft"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should show success message
      cy.get('[data-testid="success-message"]').should('contain', 'Event saved as draft')
      
      // Should redirect to event details
      cy.url().should('include', '/events/1')
    })

    it('should validate required fields', () => {
      cy.visit('/events/create')
      
      // Try to save without filling required fields
      cy.get('[data-testid="save-draft"]').click()
      
      // Should show validation errors
      cy.get('[data-testid="title-error"]').should('contain', 'Title is required')
      cy.get('[data-testid="venue-error"]').should('contain', 'Venue is required')
      cy.get('[data-testid="start-date-error"]').should('contain', 'Start date is required')
    })

    it('should validate date and time logic', () => {
      cy.visit('/events/create')
      
      // Set end date before start date
      cy.get('[data-testid="start-date"]').type('2024-12-01')
      cy.get('[data-testid="start-time"]').type('19:00')
      cy.get('[data-testid="end-date"]').type('2024-11-30')
      cy.get('[data-testid="end-time"]').type('22:00')
      
      cy.get('[data-testid="save-draft"]').click()
      
      cy.get('[data-testid="date-error"]').should('contain', 'End date must be after start date')
    })

    it('should handle image upload validation', () => {
      cy.visit('/events/create')
      
      // Try to upload invalid file type
      cy.get('[data-testid="image-upload"]').selectFile('cypress/fixtures/invalid-file.txt')
      
      cy.get('[data-testid="upload-error"]').should('contain', 'Only image files are allowed')
    })
  })

  describe('Event Management Dashboard', () => {
    beforeEach(() => {
      cy.mockApiResponse('GET', '/api/events/', {
        results: [
          {
            id: '1',
            title: 'Concert A',
            venue: 'Venue A',
            start_datetime: '2024-12-01T19:00:00Z',
            status: 'published',
            ticket_sales: { sold: 50, total: 100 }
          },
          {
            id: '2',
            title: 'Concert B',
            venue: 'Venue B',
            start_datetime: '2024-12-15T20:00:00Z',
            status: 'draft',
            ticket_sales: { sold: 0, total: 80 }
          }
        ],
        count: 2
      })
    })

    it('should display event list with key information', () => {
      cy.visit('/dashboard/events')
      
      cy.waitForApi('apiCall')
      
      // Should show events
      cy.get('[data-testid="event-item"]').should('have.length', 2)
      
      // Check first event
      cy.get('[data-testid="event-item"]').first().within(() => {
        cy.get('[data-testid="event-title"]').should('contain', 'Concert A')
        cy.get('[data-testid="event-venue"]').should('contain', 'Venue A')
        cy.get('[data-testid="event-status"]').should('contain', 'Published')
        cy.get('[data-testid="ticket-sales"]').should('contain', '50/100')
      })
    })

    it('should allow filtering events by status', () => {
      cy.visit('/dashboard/events')
      
      cy.waitForApi('apiCall')
      
      // Filter by draft status
      cy.get('[data-testid="status-filter"]').select('draft')
      
      // Should show only draft events
      cy.get('[data-testid="event-item"]').should('have.length', 1)
      cy.get('[data-testid="event-title"]').should('contain', 'Concert B')
    })

    it('should allow searching events', () => {
      cy.visit('/dashboard/events')
      
      cy.waitForApi('apiCall')
      
      // Search for specific event
      cy.get('[data-testid="event-search"]').type('Concert A')
      
      // Should show filtered results
      cy.get('[data-testid="event-item"]').should('have.length', 1)
      cy.get('[data-testid="event-title"]').should('contain', 'Concert A')
    })
  })

  describe('Event Editing', () => {
    beforeEach(() => {
      cy.mockApiResponse('GET', '/api/events/1/', {
        id: '1',
        title: 'Existing Concert',
        description: 'An existing concert',
        venue: 'Concert Hall',
        start_datetime: '2024-12-01T19:00:00Z',
        end_datetime: '2024-12-01T22:00:00Z',
        category: 'music',
        status: 'draft',
        ticket_types: [
          { id: '1', name: 'General', price: '25.00', quantity_available: 100 }
        ]
      })
    })

    it('should load existing event data for editing', () => {
      cy.visit('/events/1/edit')
      
      cy.waitForApi('apiCall')
      
      // Should populate form with existing data
      cy.get('[data-testid="event-title"]').should('have.value', 'Existing Concert')
      cy.get('[data-testid="event-venue"]').should('have.value', 'Concert Hall')
      cy.get('[data-testid="event-category"]').should('have.value', 'music')
      
      // Should show existing ticket types
      cy.get('[data-testid="ticket-name-0"]').should('have.value', 'General')
      cy.get('[data-testid="ticket-price-0"]').should('have.value', '25.00')
    })

    it('should update event successfully', () => {
      cy.mockApiResponse('PUT', '/api/events/1/', {
        id: '1',
        title: 'Updated Concert',
        description: 'An updated concert',
        venue: 'Updated Venue',
        status: 'draft'
      })

      cy.visit('/events/1/edit')
      
      cy.waitForApi('apiCall')
      
      // Update event details
      cy.get('[data-testid="event-title"]').clear().type('Updated Concert')
      cy.get('[data-testid="event-venue"]').clear().type('Updated Venue')
      
      // Save changes
      cy.get('[data-testid="save-changes"]').click()
      
      cy.waitForApi('apiCall')
      
      cy.get('[data-testid="success-message"]').should('contain', 'Event updated successfully')
    })

    it('should publish event', () => {
      cy.mockApiResponse('POST', '/api/events/1/publish/', {
        id: '1',
        status: 'published'
      })

      cy.visit('/events/1/edit')
      
      cy.waitForApi('apiCall')
      
      // Publish event
      cy.get('[data-testid="publish-event"]').click()
      
      // Confirm publication
      cy.get('[data-testid="confirm-publish"]').click()
      
      cy.waitForApi('apiCall')
      
      cy.get('[data-testid="success-message"]').should('contain', 'Event published successfully')
    })
  })

  describe('Event Analytics', () => {
    beforeEach(() => {
      cy.mockApiResponse('GET', '/api/events/1/analytics/', {
        total_sales: 1250.00,
        tickets_sold: 50,
        tickets_available: 50,
        revenue_by_day: [
          { date: '2024-11-01', revenue: 500.00, tickets: 20 },
          { date: '2024-11-02', revenue: 750.00, tickets: 30 }
        ],
        top_ticket_types: [
          { name: 'General', sold: 30, revenue: 750.00 },
          { name: 'VIP', sold: 20, revenue: 500.00 }
        ]
      })
    })

    it('should display event analytics', () => {
      cy.visit('/events/1/analytics')
      
      cy.waitForApi('apiCall')
      
      // Should show key metrics
      cy.get('[data-testid="total-revenue"]').should('contain', '$1,250.00')
      cy.get('[data-testid="tickets-sold"]').should('contain', '50')
      cy.get('[data-testid="tickets-available"]').should('contain', '50')
      
      // Should show charts
      cy.get('[data-testid="revenue-chart"]').should('be.visible')
      cy.get('[data-testid="ticket-types-chart"]').should('be.visible')
    })

    it('should allow exporting analytics data', () => {
      cy.visit('/events/1/analytics')
      
      cy.waitForApi('apiCall')
      
      // Export as CSV
      cy.get('[data-testid="export-csv"]').click()
      
      // Should trigger download
      cy.readFile('cypress/downloads/event-analytics.csv').should('exist')
    })
  })

  describe('Discount Management', () => {
    it('should create discount codes', () => {
      cy.mockApiResponse('POST', '/api/events/1/discounts/', {
        id: '1',
        code: 'EARLY20',
        discount_type: 'percentage',
        discount_value: 20,
        usage_limit: 100
      })

      cy.visit('/events/1/discounts')
      
      // Create new discount
      cy.get('[data-testid="create-discount"]').click()
      
      cy.get('[data-testid="discount-code"]').type('EARLY20')
      cy.get('[data-testid="discount-type"]').select('percentage')
      cy.get('[data-testid="discount-value"]').type('20')
      cy.get('[data-testid="usage-limit"]').type('100')
      
      cy.get('[data-testid="save-discount"]').click()
      
      cy.waitForApi('apiCall')
      
      cy.get('[data-testid="success-message"]').should('contain', 'Discount created successfully')
    })

    it('should validate discount codes', () => {
      cy.visit('/events/1/discounts')
      
      cy.get('[data-testid="create-discount"]').click()
      
      // Try to save without required fields
      cy.get('[data-testid="save-discount"]').click()
      
      cy.get('[data-testid="code-error"]').should('contain', 'Discount code is required')
      cy.get('[data-testid="value-error"]').should('contain', 'Discount value is required')
    })
  })

  describe('Mobile Event Management', () => {
    it('should work on mobile devices', () => {
      cy.setMobileViewport()
      
      cy.visit('/dashboard/events')
      
      // Should show mobile-optimized layout
      cy.get('[data-testid="mobile-event-list"]').should('be.visible')
      
      // Should be able to create event on mobile
      cy.get('[data-testid="mobile-create-event"]').click()
      cy.get('[data-testid="mobile-event-form"]').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.visit('/events/create')
      cy.checkA11y()
      
      cy.visit('/dashboard/events')
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.visit('/dashboard/events')
      
      // Tab through event items
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-testid', 'event-item')
      
      // Enter should open event details
      cy.focused().type('{enter}')
      cy.url().should('include', '/events/')
    })
  })

  describe('Performance', () => {
    it('should load event dashboard quickly', () => {
      const performance = cy.measurePerformance('event-dashboard-load')
      
      cy.visit('/dashboard/events')
      cy.get('[data-testid="event-list"]').should('be.visible')
      
      performance.end()
    })

    it('should handle large event lists efficiently', () => {
      // Mock large event list
      cy.mockApiResponse('GET', '/api/events/', {
        results: Array.from({ length: 100 }, (_, i) => ({
          id: `${i + 1}`,
          title: `Event ${i + 1}`,
          venue: `Venue ${i + 1}`,
          start_datetime: '2024-12-01T19:00:00Z',
          status: 'published'
        })),
        count: 100
      })

      const performance = cy.measurePerformance('large-event-list')
      
      cy.visit('/dashboard/events')
      cy.get('[data-testid="event-item"]').should('have.length.at.least', 10)
      
      performance.end()
    })
  })
})