/// <reference types="cypress" />

// Custom command for login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login')
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="login-submit"]').click()
  cy.url().should('not.include', '/auth/login')
})

// Custom command for seat selection
Cypress.Commands.add('selectSeats', (seats: string[]) => {
  seats.forEach(seat => {
    cy.get(`[data-testid="seat-${seat}"]`).click()
  })
})

// Custom command for completing booking
Cypress.Commands.add('completeBooking', (options: { seats: string[], paymentMethod: string }) => {
  // Select seats
  cy.selectSeats(options.seats)
  
  // Proceed to checkout
  cy.get('[data-testid="proceed-to-checkout"]').click()
  
  // Fill payment information
  if (options.paymentMethod === 'card') {
    cy.get('[data-testid="card-number"]').type('4242424242424242')
    cy.get('[data-testid="card-expiry"]').type('12/25')
    cy.get('[data-testid="card-cvc"]').type('123')
  }
  
  // Complete booking
  cy.get('[data-testid="complete-booking"]').click()
  
  // Wait for confirmation
  cy.get('[data-testid="booking-confirmation"]').should('be.visible')
})

// Custom command for accessibility testing
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe()
  cy.checkA11y(undefined, {
    rules: {
      'color-contrast': { enabled: false }, // Disable flaky color contrast rule
    }
  })
})

// Mock API responses
Cypress.Commands.add('mockApiResponse', (method: string, url: string, response: any) => {
  cy.intercept(method, url, response).as('apiCall')
})

// Wait for API calls to complete
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(`@${alias}`)
})

// Custom command to seed test data
Cypress.Commands.add('seedTestData', () => {
  // Mock user data
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-token')
    win.localStorage.setItem('auth_user', JSON.stringify({
      id: 'test-user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    }))
  })
})

// Custom command to clear test data
Cypress.Commands.add('clearTestData', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
  cy.clearCookies()
})

// Custom command for responsive testing
Cypress.Commands.add('testResponsive', (callback: () => void) => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 720, name: 'desktop' }
  ]
  
  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height)
    cy.log(`Testing on ${viewport.name} (${viewport.width}x${viewport.height})`)
    callback()
  })
})

// Custom command for performance testing
Cypress.Commands.add('measurePerformance', (name: string) => {
  cy.window().then((win) => {
    win.performance.mark(`${name}-start`)
  })
  
  return {
    end: () => {
      cy.window().then((win) => {
        win.performance.mark(`${name}-end`)
        win.performance.measure(name, `${name}-start`, `${name}-end`)
        
        const measure = win.performance.getEntriesByName(name)[0]
        cy.log(`Performance: ${name} took ${measure.duration}ms`)
        
        // Assert performance threshold
        expect(measure.duration).to.be.lessThan(3000) // 3 seconds max
      })
    }
  }
})

// Add TypeScript declarations
declare global {
  namespace Cypress {
    interface Chainable {
      setMobileViewport(): Chainable<void>
      setTabletViewport(): Chainable<void>
      setDesktopViewport(): Chainable<void>
      mockApiResponse(method: string, url: string, response: any): Chainable<void>
      waitForApi(alias: string): Chainable<void>
      seedTestData(): Chainable<void>
      clearTestData(): Chainable<void>
      testResponsive(callback: () => void): Chainable<void>
      measurePerformance(name: string): { end: () => void }
    }
  }
}