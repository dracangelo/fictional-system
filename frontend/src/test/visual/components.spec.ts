import { test, expect } from '@playwright/test'

test.describe('Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to ensure consistent data
    await page.route('/api/**', (route) => {
      const url = route.request().url()
      
      if (url.includes('/events/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            title: 'Test Event',
            description: 'A test event for visual testing',
            venue: 'Test Venue',
            start_datetime: '2024-12-01T19:00:00Z',
            ticket_types: [
              { id: '1', name: 'General', price: '25.00', quantity_available: 100 },
              { id: '2', name: 'VIP', price: '50.00', quantity_available: 20 }
            ]
          })
        })
      } else {
        route.continue()
      }
    })
  })

  test('Button component variants', async ({ page }) => {
    await page.goto('/demo/components')
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="button-showcase"]')
    
    // Take screenshot of button variants
    await expect(page.locator('[data-testid="button-showcase"]')).toHaveScreenshot('button-variants.png')
  })

  test('Input component states', async ({ page }) => {
    await page.goto('/demo/components')
    
    await page.waitForSelector('[data-testid="input-showcase"]')
    
    // Test different input states
    await expect(page.locator('[data-testid="input-showcase"]')).toHaveScreenshot('input-states.png')
  })

  test('Modal component', async ({ page }) => {
    await page.goto('/demo/components')
    
    // Open modal
    await page.click('[data-testid="open-modal-button"]')
    await page.waitForSelector('[data-testid="modal"]')
    
    // Take screenshot of modal
    await expect(page.locator('[data-testid="modal"]')).toHaveScreenshot('modal-component.png')
  })

  test('Card component variations', async ({ page }) => {
    await page.goto('/demo/components')
    
    await page.waitForSelector('[data-testid="card-showcase"]')
    
    await expect(page.locator('[data-testid="card-showcase"]')).toHaveScreenshot('card-variations.png')
  })

  test('Form components', async ({ page }) => {
    await page.goto('/demo/forms')
    
    await page.waitForSelector('[data-testid="form-showcase"]')
    
    // Test form in different states
    await expect(page.locator('[data-testid="form-showcase"]')).toHaveScreenshot('form-components.png')
    
    // Test form with validation errors
    await page.click('[data-testid="trigger-validation"]')
    await page.waitForSelector('[data-testid="validation-errors"]')
    
    await expect(page.locator('[data-testid="form-showcase"]')).toHaveScreenshot('form-with-errors.png')
  })

  test('Loading states', async ({ page }) => {
    await page.goto('/demo/loading')
    
    await page.waitForSelector('[data-testid="loading-showcase"]')
    
    await expect(page.locator('[data-testid="loading-showcase"]')).toHaveScreenshot('loading-states.png')
  })

  test('Toast notifications', async ({ page }) => {
    await page.goto('/demo/notifications')
    
    // Trigger different types of toasts
    await page.click('[data-testid="success-toast"]')
    await page.click('[data-testid="error-toast"]')
    await page.click('[data-testid="warning-toast"]')
    
    await page.waitForSelector('[data-testid="toast-container"]')
    
    await expect(page.locator('[data-testid="toast-container"]')).toHaveScreenshot('toast-notifications.png')
  })
})

test.describe('Page Visual Tests', () => {
  test('Homepage layout', async ({ page }) => {
    await page.goto('/')
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="hero-section"]')
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', { fullPage: true })
    
    // Take screenshot of hero section only
    await expect(page.locator('[data-testid="hero-section"]')).toHaveScreenshot('hero-section.png')
  })

  test('Event listing page', async ({ page }) => {
    // Mock events API
    await page.route('/api/events/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: Array.from({ length: 6 }, (_, i) => ({
            id: `${i + 1}`,
            title: `Event ${i + 1}`,
            description: `Description for event ${i + 1}`,
            venue: `Venue ${i + 1}`,
            start_datetime: '2024-12-01T19:00:00Z',
            category: 'music',
            image: '/placeholder-event.jpg'
          })),
          count: 6
        })
      })
    })

    await page.goto('/events')
    
    await page.waitForSelector('[data-testid="event-grid"]')
    
    await expect(page).toHaveScreenshot('event-listing.png', { fullPage: true })
  })

  test('Event details page', async ({ page }) => {
    await page.goto('/events/1')
    
    await page.waitForSelector('[data-testid="event-details"]')
    
    await expect(page).toHaveScreenshot('event-details.png', { fullPage: true })
  })

  test('Seat selection interface', async ({ page }) => {
    // Mock showtime API
    await page.route('/api/showtimes/1/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          movie: { title: 'Test Movie' },
          theater: { name: 'Test Theater' },
          seating_layout: { rows: 10, seatsPerRow: 12 },
          booked_seats: ['A1', 'A2', 'B5', 'C3'],
          pricing: { regular: 15, vip: 25 }
        })
      })
    })

    await page.goto('/showtimes/1')
    
    await page.waitForSelector('[data-testid="seat-map"]')
    
    // Take screenshot of seat map
    await expect(page.locator('[data-testid="seat-map"]')).toHaveScreenshot('seat-map.png')
    
    // Select some seats
    await page.click('[data-testid="seat-D5"]')
    await page.click('[data-testid="seat-D6"]')
    
    await expect(page.locator('[data-testid="seat-map"]')).toHaveScreenshot('seat-map-with-selection.png')
  })

  test('Checkout flow', async ({ page }) => {
    await page.goto('/checkout')
    
    await page.waitForSelector('[data-testid="checkout-form"]')
    
    // Screenshot of empty checkout form
    await expect(page.locator('[data-testid="checkout-form"]')).toHaveScreenshot('checkout-empty.png')
    
    // Fill form and take another screenshot
    await page.fill('[data-testid="customer-name"]', 'John Doe')
    await page.fill('[data-testid="customer-email"]', 'john@example.com')
    await page.fill('[data-testid="card-number"]', '4242 4242 4242 4242')
    
    await expect(page.locator('[data-testid="checkout-form"]')).toHaveScreenshot('checkout-filled.png')
  })

  test('Dashboard layout', async ({ page }) => {
    await page.goto('/dashboard')
    
    await page.waitForSelector('[data-testid="dashboard-content"]')
    
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true })
  })

  test('Mobile responsive layouts', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="mobile-navigation"]')
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', { fullPage: true })
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await expect(page).toHaveScreenshot('homepage-tablet.png', { fullPage: true })
  })
})

test.describe('Dark Mode Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode
    await page.goto('/')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
  })

  test('Homepage in dark mode', async ({ page }) => {
    await page.waitForSelector('[data-testid="hero-section"]')
    
    await expect(page).toHaveScreenshot('homepage-dark.png', { fullPage: true })
  })

  test('Components in dark mode', async ({ page }) => {
    await page.goto('/demo/components')
    
    await page.waitForSelector('[data-testid="component-showcase"]')
    
    await expect(page.locator('[data-testid="component-showcase"]')).toHaveScreenshot('components-dark.png')
  })
})

test.describe('Error State Visual Tests', () => {
  test('404 page', async ({ page }) => {
    await page.goto('/non-existent-page')
    
    await page.waitForSelector('[data-testid="404-page"]')
    
    await expect(page).toHaveScreenshot('404-page.png')
  })

  test('Network error state', async ({ page }) => {
    // Mock network failure
    await page.route('/api/**', (route) => {
      route.abort('failed')
    })

    await page.goto('/events')
    
    await page.waitForSelector('[data-testid="error-state"]')
    
    await expect(page.locator('[data-testid="error-state"]')).toHaveScreenshot('network-error.png')
  })

  test('Empty state', async ({ page }) => {
    // Mock empty response
    await page.route('/api/events/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], count: 0 })
      })
    })

    await page.goto('/events')
    
    await page.waitForSelector('[data-testid="empty-state"]')
    
    await expect(page.locator('[data-testid="empty-state"]')).toHaveScreenshot('empty-state.png')
  })
})