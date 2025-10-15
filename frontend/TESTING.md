# Testing Guide

This document provides comprehensive information about the testing setup and practices for the Movie Booking App frontend.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Configuration](#test-configuration)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Our testing strategy follows a comprehensive approach covering:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: Full user workflow testing
- **Visual Regression Tests**: UI consistency testing
- **Accessibility Tests**: WCAG compliance testing
- **Performance Tests**: Performance benchmarking

### Test Stack

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Cypress
- **Visual**: Playwright
- **Accessibility**: jest-axe
- **Performance**: Custom benchmarks

## Test Types

### Unit Tests

Test individual components, hooks, and utilities in isolation.

```bash
# Run all unit tests
npm run test:unit

# Run specific component tests
npm run test:components

# Run hook tests
npm run test:hooks

# Run service tests
npm run test:services
```

**Location**: `src/**/*.test.{ts,tsx}`

**Example**:
```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
})
```

### Integration Tests

Test component interactions and data flow.

```bash
# Run integration tests
npm run test:integration
```

**Location**: `src/**/*.integration.test.{ts,tsx}`

**Example**:
```typescript
// src/components/booking/__tests__/BookingFlow.integration.test.tsx
describe('Booking Flow Integration', () => {
  it('completes full booking process', async () => {
    // Test seat selection → checkout → payment → confirmation
  })
})
```

### End-to-End Tests

Test complete user workflows across the application.

```bash
# Run E2E tests headlessly
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:open

# Run E2E tests in headed mode
npm run test:e2e:headed
```

**Location**: `cypress/e2e/**/*.cy.{js,ts}`

**Example**:
```typescript
// cypress/e2e/booking-flow.cy.ts
describe('Booking Flow', () => {
  it('should complete event booking', () => {
    cy.visit('/events/1')
    cy.selectSeats(['A1', 'A2'])
    cy.completeBooking({ paymentMethod: 'card' })
    cy.get('[data-testid="booking-confirmation"]').should('be.visible')
  })
})
```

### Visual Regression Tests

Ensure UI consistency across changes.

```bash
# Run visual tests
npm run test:visual

# Update visual baselines
npm run test:visual:update
```

**Location**: `src/test/visual/**/*.spec.{js,ts}`

**Example**:
```typescript
// src/test/visual/components.spec.ts
test('Button component variants', async ({ page }) => {
  await page.goto('/demo/components')
  await expect(page.locator('[data-testid="button-showcase"]'))
    .toHaveScreenshot('button-variants.png')
})
```

### Accessibility Tests

Ensure WCAG compliance and screen reader compatibility.

```bash
# Run accessibility tests
npm run test:accessibility
```

**Location**: `src/test/accessibility*.test.tsx`

**Example**:
```typescript
// src/test/accessibility.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Accessibility', () => {
  it('should be accessible', async () => {
    const { container } = render(<MyComponent />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Performance Tests

Benchmark component performance and bundle sizes.

```bash
# Run performance tests
npm run test:performance
```

**Location**: `src/test/performance*.test.ts`

**Example**:
```typescript
// src/test/performance.test.ts
describe('Performance', () => {
  it('should render within budget', async () => {
    const renderTime = await measurePerformance(() => {
      render(<ExpensiveComponent />)
    })
    expect(renderTime).toBeLessThan(100) // 100ms budget
  })
})
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run quick test suite (unit + accessibility)
npm run test:quick

# Run CI test suite
npm run test:ci

# Run specific test suite
npm run test:suite unit
npm run test:suite e2e
npm run test:suite visual
```

### Development Workflow

```bash
# Watch mode for development
npm run test:watch

# Test with UI
npm run test:ui

# Coverage report
npm run test:coverage

# Debug mode
npm run test:debug
```

### Test Runner

Use our custom test runner for comprehensive testing:

```bash
# Run all test suites with reporting
node scripts/test-runner.js

# Run specific suite
node scripts/test-runner.js --suite unit
node scripts/test-runner.js --suite e2e

# Get help
node scripts/test-runner.js --help
```

## Writing Tests

### Test Structure

Follow the AAA pattern (Arrange, Act, Assert):

```typescript
describe('Component Name', () => {
  it('should do something when condition', () => {
    // Arrange
    const props = { ... }
    
    // Act
    render(<Component {...props} />)
    
    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### Test Utilities

Use our custom test utilities for consistent testing:

```typescript
import { renderWithProviders, mockUser, mockEvent } from '../test/utils'

// Render with all providers (Router, Query, Auth, etc.)
renderWithProviders(<Component />, { 
  user: mockUser,
  initialEntries: ['/events'] 
})
```

### Mock Data

Use consistent mock data from test utilities:

```typescript
import { 
  mockUser, 
  mockEventOwner, 
  mockEvent, 
  mockBooking,
  mockApiResponses 
} from '../test/utils'
```

### Accessibility Testing

Always include accessibility tests for interactive components:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('should be accessible', async () => {
  const { container } = renderWithProviders(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Performance Testing

Include performance tests for complex components:

```typescript
import { measurePerformance } from '../test/utils'

it('should render within performance budget', async () => {
  const renderTime = await measurePerformance(async () => {
    renderWithProviders(<ComplexComponent />)
  })
  
  expect(renderTime).toBeLessThan(100) // 100ms budget
})
```

## Test Configuration

### Coverage Thresholds

```javascript
// vitest.config.ts
coverage: {
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/components/ui/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    }
  }
}
```

### Performance Budgets

```javascript
// test.config.js
performance: {
  budgets: {
    componentRender: {
      Button: 16,      // 16ms
      SeatMap: 100,    // 100ms
    },
    bundleSize: {
      main: 512000,    // 500KB
      vendor: 1048576, // 1MB
    }
  }
}
```

### Accessibility Rules

```javascript
// Custom axe configuration
const axeConfig = {
  rules: {
    'color-contrast': { enabled: false }, // Disable flaky rule
    'heading-order': { enabled: true },
  }
}
```

## CI/CD Integration

### GitHub Actions

Our CI pipeline runs:

1. **Unit Tests** - Fast feedback on code changes
2. **Accessibility Tests** - WCAG compliance checks
3. **Performance Tests** - Performance regression detection
4. **E2E Tests** - Critical user flow validation
5. **Visual Tests** - UI consistency verification
6. **Build Tests** - Bundle size and build validation
7. **Security Audit** - Dependency vulnerability scanning

### Test Artifacts

CI collects and stores:

- Test results and coverage reports
- Screenshots and videos from failed tests
- Performance benchmarks
- Visual regression reports
- Bundle analysis reports

### Quality Gates

Tests must pass these gates:

- ✅ 80% code coverage minimum
- ✅ Zero accessibility violations
- ✅ Performance budgets met
- ✅ All E2E tests passing
- ✅ No visual regressions
- ✅ Bundle size under limits
- ✅ No security vulnerabilities

## Best Practices

### General Guidelines

1. **Test Behavior, Not Implementation**
   ```typescript
   // ❌ Testing implementation details
   expect(component.state.isOpen).toBe(true)
   
   // ✅ Testing user-visible behavior
   expect(screen.getByRole('dialog')).toBeVisible()
   ```

2. **Use Semantic Queries**
   ```typescript
   // ❌ Fragile selectors
   screen.getByTestId('submit-btn')
   
   // ✅ Semantic queries
   screen.getByRole('button', { name: /submit/i })
   ```

3. **Test User Interactions**
   ```typescript
   // ✅ Simulate real user interactions
   await user.click(screen.getByRole('button'))
   await user.type(screen.getByLabelText(/email/i), 'test@example.com')
   ```

### Component Testing

1. **Test All Props and States**
2. **Include Error Boundaries**
3. **Test Loading States**
4. **Verify Accessibility**
5. **Check Responsive Behavior**

### E2E Testing

1. **Focus on Critical Paths**
2. **Use Page Object Model**
3. **Implement Proper Waits**
4. **Clean Up Test Data**
5. **Test Across Browsers**

### Performance Testing

1. **Set Realistic Budgets**
2. **Test on Various Devices**
3. **Monitor Bundle Sizes**
4. **Benchmark Critical Components**
5. **Test Memory Usage**

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for slow operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
}, { timeout: 10000 })
```

#### Flaky Visual Tests

```typescript
// Wait for animations to complete
await page.waitForTimeout(500)
await expect(page.locator('.animated')).toHaveScreenshot()
```

#### Memory Leaks in Tests

```typescript
// Clean up after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

#### Accessibility Violations

```typescript
// Debug accessibility issues
const results = await axe(container)
console.log(results.violations)
```

### Debug Commands

```bash
# Run tests in debug mode
npm run test:debug

# Run single test file
npx vitest run src/components/Button.test.tsx

# Run Cypress in debug mode
npx cypress open --config video=false

# Generate coverage report
npm run test:coverage
open coverage/index.html
```

### Getting Help

1. Check the [test configuration](./test.config.js)
2. Review [test utilities](./src/test/utils.tsx)
3. Look at existing test examples
4. Run tests with `--reporter=verbose` for detailed output
5. Use the test runner's help: `node scripts/test-runner.js --help`

## Continuous Improvement

### Metrics to Monitor

- Test coverage percentage
- Test execution time
- Flaky test rate
- Performance regression frequency
- Accessibility violation trends

### Regular Maintenance

- Update test dependencies monthly
- Review and update performance budgets
- Refresh visual baselines when UI changes
- Clean up obsolete tests
- Optimize slow-running tests

### Team Practices

- Write tests alongside feature development
- Review test quality in code reviews
- Share testing knowledge in team meetings
- Contribute to testing utilities and patterns
- Document testing decisions and patterns