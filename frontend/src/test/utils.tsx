import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { vi } from 'vitest'

// Mock services
export const mockAuthService = {
  getStoredUser: vi.fn(),
  getStoredToken: vi.fn(),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  refreshToken: vi.fn(),
}

export const mockSocketService = {
  connect: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(),
  on: vi.fn(() => vi.fn()),
  off: vi.fn(),
  emit: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
}

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'customer' as const,
  preferences: {
    notificationSettings: { email: true, sms: false, push: true },
    favoriteGenres: ['action', 'comedy'],
    preferredLocations: ['downtown'],
    accessibilityNeeds: [],
  },
}

export const mockEventOwner = {
  ...mockUser,
  id: 'event-owner-123',
  role: 'event_owner' as const,
}

export const mockTheaterOwner = {
  ...mockUser,
  id: 'theater-owner-123',
  role: 'theater_owner' as const,
}

export const mockAdmin = {
  ...mockUser,
  id: 'admin-123',
  role: 'admin' as const,
}

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  user?: typeof mockUser | null
  queryClient?: QueryClient
  initialEntries?: string[]
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  user = null,
  queryClient,
  initialEntries = ['/'],
}) => {
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  // Mock auth context value
  const authContextValue = {
    user,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    updateProfile: vi.fn(),
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider value={authContextValue}>
          <NotificationProvider socketUrl="ws://test">
            {children}
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & {
    user?: typeof mockUser | null
    queryClient?: QueryClient
    initialEntries?: string[]
  } = {}
) => {
  const { user, queryClient, initialEntries, ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper user={user} queryClient={queryClient} initialEntries={initialEntries}>
      {children}
    </TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock API responses
export const mockApiResponses = {
  events: {
    list: {
      results: [
        {
          id: '1',
          title: 'Test Event',
          description: 'A test event',
          venue: 'Test Venue',
          start_datetime: '2024-12-01T19:00:00Z',
          end_datetime: '2024-12-01T22:00:00Z',
          category: 'music',
          status: 'published',
        },
      ],
      count: 1,
      next: null,
      previous: null,
    },
    detail: {
      id: '1',
      title: 'Test Event',
      description: 'A test event',
      venue: 'Test Venue',
      start_datetime: '2024-12-01T19:00:00Z',
      end_datetime: '2024-12-01T22:00:00Z',
      category: 'music',
      status: 'published',
      ticket_types: [
        {
          id: '1',
          name: 'General',
          price: '25.00',
          quantity_available: 100,
          quantity_sold: 10,
        },
      ],
    },
  },
  bookings: {
    list: {
      results: [
        {
          id: '1',
          booking_reference: 'BK123456',
          event: { id: '1', title: 'Test Event' },
          total_amount: '50.00',
          booking_status: 'confirmed',
          created_at: '2024-11-01T10:00:00Z',
        },
      ],
      count: 1,
    },
    detail: {
      id: '1',
      booking_reference: 'BK123456',
      event: { id: '1', title: 'Test Event' },
      total_amount: '50.00',
      booking_status: 'confirmed',
      created_at: '2024-11-01T10:00:00Z',
      tickets: [
        {
          id: '1',
          ticket_number: 'TK123456',
          seat_number: 'A1',
          price: '25.00',
          status: 'valid',
        },
      ],
    },
  },
}

// Accessibility testing helpers
export const axeConfig = {
  rules: {
    // Disable color-contrast rule for tests (can be flaky)
    'color-contrast': { enabled: false },
  },
}

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

// Wait for async operations
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Mock intersection observer entries
export const createMockIntersectionObserverEntry = (
  isIntersecting: boolean = true
): IntersectionObserverEntry => ({
  isIntersecting,
  intersectionRatio: isIntersecting ? 1 : 0,
  target: document.createElement('div'),
  boundingClientRect: {} as DOMRectReadOnly,
  intersectionRect: {} as DOMRectReadOnly,
  rootBounds: {} as DOMRectReadOnly,
  time: Date.now(),
})

// Mock file for upload testing
export const createMockFile = (
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  size: number = 1024
): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock geolocation
export const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
})

// Mock clipboard API
export const mockClipboard = {
  writeText: vi.fn(() => Promise.resolve()),
  readText: vi.fn(() => Promise.resolve('mocked text')),
}

Object.defineProperty(global.navigator, 'clipboard', {
  value: mockClipboard,
})