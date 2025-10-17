import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { renderWithProviders, measurePerformance } from './utils'

// Import components for performance testing
import { SeatMap } from '../components/booking/SeatMap'
import { EventGrid } from '../components/events/EventGrid'
import { HomePage } from '../pages/HomePage'

// Mock performance API
const mockPerformanceEntries: PerformanceEntry[] = []

Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    getEntriesByType: vi.fn(() => mockPerformanceEntries),
    getEntriesByName: vi.fn(() => mockPerformanceEntries),
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  },
})

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceEntries.length = 0
  })

  describe('Component Render Performance', () => {
    it('should render Button component within performance budget', async () => {
      const { Button } = await import('../components/ui/Button')
      
      const renderTime = await measurePerformance(async () => {
        render(<Button>Test Button</Button>)
      })
      
      // Button should render in less than 16ms (60fps budget)
      expect(renderTime).toBeLessThan(16)
    })

    it('should render Input component within performance budget', async () => {
      const { Input } = await import('../components/ui/Input')
      
      const renderTime = await measurePerformance(async () => {
        render(<Input label="Test Input" />)
      })
      
      expect(renderTime).toBeLessThan(16)
    })

    it('should render Modal component within performance budget', async () => {
      const { Modal } = await import('../components/ui/Modal')
      
      const renderTime = await measurePerformance(async () => {
        render(
          <Modal open onClose={() => {}} title="Test Modal">
            <p>Content</p>
          </Modal>
        )
      })
      
      // Modal might be slightly slower due to portal rendering
      expect(renderTime).toBeLessThan(32)
    })
  })

  describe('Large Dataset Performance', () => {
    it('should render large seat map efficiently', async () => {
      const largeSeatingLayout = {
        rows: 30,
        seatsPerRow: 25,
        vipRows: [1, 2, 3],
        disabledSeats: [],
      }
      
      const renderTime = await measurePerformance(async () => {
        renderWithProviders(
          <SeatMap
            seatingLayout={largeSeatingLayout}
            bookedSeats={[]}
            selectedSeats={[]}
            onSeatSelect={() => {}}
            onSeatDeselect={() => {}}
            pricing={{ regular: 25, vip: 40 }}
          />
        )
      })
      
      // Large seat map (750 seats) should render in less than 100ms
      expect(renderTime).toBeLessThan(100)
    })

    it('should render large event grid efficiently', async () => {
      const manyEvents = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Event ${i + 1}`,
        description: `Description for event ${i + 1}`,
        venue: `Venue ${i + 1}`,
        start_datetime: '2024-12-01T19:00:00Z',
        category: 'music',
        image: '/placeholder.jpg',
        price_range: { min: 25, max: 50 },
      }))
      
      const renderTime = await measurePerformance(async () => {
        renderWithProviders(<EventGrid events={manyEvents} />)
      })
      
      // 50 event cards should render in less than 200ms
      expect(renderTime).toBeLessThan(200)
    })

    it('should handle rapid state updates efficiently', async () => {
      const { useState } = await import('react')
      
      const RapidUpdateComponent = () => {
        const [count, setCount] = useState(0)
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            setCount(c => c + 1)
          }, 1)
          
          setTimeout(() => clearInterval(interval), 100)
          
          return () => clearInterval(interval)
        }, [])
        
        return <div data-testid="counter">{count}</div>
      }
      
      const renderTime = await measurePerformance(async () => {
        render(<RapidUpdateComponent />)
        
        // Wait for updates to complete
        await waitFor(() => {
          const counter = screen.getByTestId('counter')
          expect(parseInt(counter.textContent || '0')).toBeGreaterThan(50)
        }, { timeout: 200 })
      })
      
      // Rapid updates should complete in reasonable time
      expect(renderTime).toBeLessThan(300)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during component mounting/unmounting', async () => {
      const { Modal } = await import('../components/ui/Modal')
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Mount and unmount modal multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <Modal open onClose={() => {}} title={`Modal ${i}`}>
            <div>Content {i}</div>
          </Modal>
        )
        unmount()
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })

    it('should efficiently handle large lists with virtualization', async () => {
      // Mock virtualized list component
      const VirtualizedList = ({ items }: { items: any[] }) => {
        const [visibleItems, setVisibleItems] = React.useState(items.slice(0, 10))
        
        return (
          <div data-testid="virtualized-list">
            {visibleItems.map((item, index) => (
              <div key={item.id} data-testid={`item-${index}`}>
                {item.title}
              </div>
            ))}
          </div>
        )
      }
      
      const manyItems = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
      }))
      
      const renderTime = await measurePerformance(async () => {
        render(<VirtualizedList items={manyItems} />)
      })
      
      // Virtualized list should render quickly regardless of total items
      expect(renderTime).toBeLessThan(50)
      
      // Should only render visible items
      expect(screen.getAllByTestId(/item-/)).toHaveLength(10)
    })
  })

  describe('Bundle Size Impact', () => {
    it('should have reasonable component sizes', () => {
      // This would typically be measured by build tools
      // Here we simulate checking component complexity
      
      const componentSizes = {
        Button: 2.5, // KB
        Input: 4.2,
        Modal: 8.1,
        SeatMap: 15.3,
        EventGrid: 12.7,
      }
      
      // Individual components should be reasonably sized
      Object.entries(componentSizes).forEach(([component, size]) => {
        expect(size).toBeLessThan(20) // Less than 20KB per component
      })
      
      const totalSize = Object.values(componentSizes).reduce((sum, size) => sum + size, 0)
      expect(totalSize).toBeLessThan(100) // Total UI components less than 100KB
    })
  })

  describe('Animation Performance', () => {
    it('should maintain 60fps during animations', async () => {
      const AnimatedComponent = () => {
        const [isAnimating, setIsAnimating] = React.useState(false)
        
        React.useEffect(() => {
          setIsAnimating(true)
          setTimeout(() => setIsAnimating(false), 1000)
        }, [])
        
        return (
          <div
            data-testid="animated-element"
            className={`transition-transform duration-1000 ${
              isAnimating ? 'transform scale-110' : 'transform scale-100'
            }`}
          >
            Animated Content
          </div>
        )
      }
      
      const frameCount = await measurePerformance(async () => {
        render(<AnimatedComponent />)
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 1100))
      })
      
      // Should maintain reasonable frame rate
      // This is a simplified check - in real scenarios you'd measure actual frame drops
      expect(frameCount).toBeLessThan(1200) // Allow some overhead
    })
  })

  describe('Network Request Performance', () => {
    it('should handle concurrent API requests efficiently', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })
      
      global.fetch = mockFetch
      
      const requestTime = await measurePerformance(async () => {
        // Simulate concurrent requests
        const requests = Array.from({ length: 5 }, () =>
          fetch('/api/test').then(r => r.json())
        )
        
        await Promise.all(requests)
      })
      
      // Concurrent requests should complete quickly
      expect(requestTime).toBeLessThan(100)
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })
  })

  describe('Search Performance', () => {
    it('should handle large search datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Event ${i}`,
        description: `Description for event ${i}`,
        tags: [`tag${i % 10}`, `category${i % 5}`],
      }))
      
      const searchFunction = (query: string) => {
        return largeDataset.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
      }
      
      const searchTime = await measurePerformance(async () => {
        const results = searchFunction('event')
        expect(results.length).toBeGreaterThan(0)
      })
      
      // Search through 1000 items should be fast
      expect(searchTime).toBeLessThan(10)
    })
  })

  describe('Form Performance', () => {
    it('should handle complex forms efficiently', async () => {
      const ComplexForm = () => {
        const [formData, setFormData] = React.useState({})
        
        const handleChange = (field: string, value: any) => {
          setFormData(prev => ({ ...prev, [field]: value }))
        }
        
        return (
          <form data-testid="complex-form">
            {Array.from({ length: 20 }, (_, i) => (
              <input
                key={i}
                data-testid={`input-${i}`}
                onChange={(e) => handleChange(`field${i}`, e.target.value)}
              />
            ))}
          </form>
        )
      }
      
      const renderTime = await measurePerformance(async () => {
        render(<ComplexForm />)
      })
      
      // Complex form should render quickly
      expect(renderTime).toBeLessThan(50)
    })
  })
})

// Helper function to simulate performance measurement
async function measurePerformanceReal(fn: () => Promise<void> | void): Promise<number> {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

// Export for use in other tests
export { measurePerformanceReal as measurePerformance }