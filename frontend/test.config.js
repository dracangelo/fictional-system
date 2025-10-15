// Test configuration for the movie booking app frontend
module.exports = {
  // Test environments
  environments: {
    unit: {
      testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      testEnvironment: 'jsdom',
    },
    integration: {
      testMatch: ['**/*.integration.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      testEnvironment: 'jsdom',
    },
    e2e: {
      testMatch: ['**/cypress/e2e/**/*.cy.{js,ts}'],
      testEnvironment: 'node',
    },
    visual: {
      testMatch: ['**/src/test/visual/**/*.spec.{js,ts}'],
      testEnvironment: 'node',
    },
  },

  // Coverage configuration
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    exclude: [
      'node_modules/',
      'src/test/',
      '**/*.d.ts',
      '**/*.config.*',
      '**/index.ts',
      'src/main.tsx',
      'src/vite-env.d.ts',
      'cypress/',
      'dist/',
    ],
    thresholds: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      // Component-specific thresholds
      'src/components/ui/': {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      'src/components/booking/': {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
      'src/hooks/': {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
      'src/services/': {
        branches: 75,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
  },

  // Performance budgets
  performance: {
    budgets: {
      // Component render times (milliseconds)
      componentRender: {
        Button: 16,
        Input: 16,
        Modal: 32,
        SeatMap: 100,
        EventGrid: 200,
      },
      
      // Bundle sizes (bytes)
      bundleSize: {
        main: 512000,      // 500KB
        vendor: 1048576,   // 1MB
        total: 2097152,    // 2MB
      },
      
      // Core Web Vitals
      webVitals: {
        LCP: 2500,  // Largest Contentful Paint
        FID: 100,   // First Input Delay
        CLS: 0.1,   // Cumulative Layout Shift
        FCP: 1800,  // First Contentful Paint
        TTFB: 800,  // Time to First Byte
      },
    },
  },

  // Accessibility configuration
  accessibility: {
    rules: {
      // Disable flaky rules in CI
      'color-contrast': { enabled: false },
      
      // Enable important rules
      'heading-order': { enabled: true },
      'landmark-one-main': { enabled: true },
      'page-has-heading-one': { enabled: true },
      'focus-order-semantics': { enabled: true },
    },
    
    // WCAG compliance level
    level: 'AA',
    
    // Tags to include/exclude
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  },

  // Visual regression configuration
  visual: {
    threshold: 0.2,
    failureThreshold: 0.3,
    failureThresholdType: 'percent',
    
    // Browsers to test
    browsers: [
      'chromium',
      'firefox',
      'webkit',
    ],
    
    // Viewports to test
    viewports: [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 1920, height: 1080, name: 'large-desktop' },
    ],
  },

  // E2E configuration
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    
    // Test data management
    testData: {
      users: {
        customer: {
          email: 'customer@test.com',
          password: 'testpass123',
          role: 'customer',
        },
        eventOwner: {
          email: 'owner@test.com',
          password: 'testpass123',
          role: 'event_owner',
        },
        theaterOwner: {
          email: 'theater@test.com',
          password: 'testpass123',
          role: 'theater_owner',
        },
        admin: {
          email: 'admin@test.com',
          password: 'testpass123',
          role: 'admin',
        },
      },
      
      events: [
        {
          id: '1',
          title: 'Test Concert',
          venue: 'Test Venue',
          start_datetime: '2024-12-01T19:00:00Z',
          ticket_types: [
            { name: 'General', price: '25.00', quantity: 100 },
            { name: 'VIP', price: '50.00', quantity: 20 },
          ],
        },
      ],
    },
  },

  // Test utilities
  utilities: {
    // Mock data generators
    generators: {
      user: () => ({
        id: `user-${Math.random().toString(36).substr(2, 9)}`,
        email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
      }),
      
      event: () => ({
        id: `event-${Math.random().toString(36).substr(2, 9)}`,
        title: `Test Event ${Math.random().toString(36).substr(2, 5)}`,
        venue: 'Test Venue',
        start_datetime: new Date(Date.now() + 86400000).toISOString(),
        category: 'music',
      }),
      
      booking: () => ({
        id: `booking-${Math.random().toString(36).substr(2, 9)}`,
        booking_reference: `BK${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        total_amount: '50.00',
        booking_status: 'confirmed',
      }),
    },
    
    // Common test patterns
    patterns: {
      // Form validation testing
      testFormValidation: (formSelector, fields) => {
        // Implementation would go here
      },
      
      // Accessibility testing
      testAccessibility: (component) => {
        // Implementation would go here
      },
      
      // Performance testing
      testPerformance: (component, budget) => {
        // Implementation would go here
      },
    },
  },

  // Reporting configuration
  reporting: {
    formats: ['json', 'html', 'junit'],
    outputDir: 'test-results',
    
    // Custom reporters
    reporters: [
      'default',
      ['html', { outputFile: 'test-results/report.html' }],
      ['json', { outputFile: 'test-results/results.json' }],
      ['junit', { outputFile: 'test-results/junit.xml' }],
    ],
    
    // Notifications
    notifications: {
      slack: {
        enabled: process.env.CI === 'true',
        webhook: process.env.SLACK_WEBHOOK_URL,
      },
      
      email: {
        enabled: false,
        recipients: ['team@example.com'],
      },
    },
  },

  // CI/CD integration
  ci: {
    // Parallel execution
    parallel: {
      enabled: true,
      workers: 4,
    },
    
    // Retry configuration
    retry: {
      unit: 0,
      e2e: 2,
      visual: 1,
    },
    
    // Timeout configuration
    timeouts: {
      unit: 10000,
      integration: 30000,
      e2e: 60000,
      visual: 30000,
    },
    
    // Artifact collection
    artifacts: {
      screenshots: true,
      videos: true,
      logs: true,
      coverage: true,
    },
  },

  // Development configuration
  development: {
    // Watch mode settings
    watch: {
      enabled: true,
      ignore: ['node_modules/', 'dist/', 'coverage/'],
    },
    
    // Debug settings
    debug: {
      enabled: process.env.NODE_ENV === 'development',
      verbose: false,
    },
    
    // Hot reload for tests
    hotReload: {
      enabled: true,
      delay: 100,
    },
  },
};