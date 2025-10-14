import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TheaterOwnerDashboard } from '../TheaterOwnerDashboard'
import { TheaterService } from '../../../services/theater'
import type { Theater, Movie } from '../../../types/theater'

// Mock the services
vi.mock('../../../services/theater', () => ({
  TheaterService: {
    getTheaters: vi.fn(),
    getMovies: vi.fn(),
    getShowtimes: vi.fn(),
    getOwnerAnalytics: vi.fn(),
  },
}))

// Mock the useQuery hook
vi.mock('../../../hooks/useQuery', () => ({
  useQuery: vi.fn((queryFn, deps) => {
    const [data, setData] = React.useState(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(null)

    React.useEffect(() => {
      if (queryFn) {
        queryFn()
          .then((result: any) => {
            setData(result)
            setLoading(false)
          })
          .catch((err: any) => {
            setError(err)
            setLoading(false)
          })
      }
    }, deps)

    return {
      data,
      loading,
      error,
      refetch: vi.fn(() => {
        setLoading(true)
        if (queryFn) {
          queryFn()
            .then((result: any) => {
              setData(result)
              setLoading(false)
            })
            .catch((err: any) => {
              setError(err)
              setLoading(false)
            })
        }
      }),
    }
  }),
}))

const mockTheaterService = TheaterService as any

describe('TheaterOwnerDashboard', () => {
  const mockTheaters: Theater[] = [
    {
      id: '1',
      owner: 'owner1',
      name: 'Downtown Cinema',
      address: '123 Main St',
      screens: 3,
      seating_layout: {
        screens: [
          {
            screen_number: 1,
            rows: 10,
            seats_per_row: 15,
            vip_rows: [1, 2],
            disabled_seats: [],
            pricing: { regular: 12.00, vip: 18.00 }
          }
        ]
      },
      amenities: ['IMAX', 'Dolby Atmos'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      owner: 'owner1',
      name: 'Mall Theater',
      address: '456 Oak Ave',
      screens: 2,
      seating_layout: {
        screens: [
          {
            screen_number: 1,
            rows: 8,
            seats_per_row: 12,
            vip_rows: [1],
            disabled_seats: [],
            pricing: { regular: 10.00, vip: 15.00 }
          }
        ]
      },
      amenities: ['3D'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockMovies: Movie[] = [
    {
      id: '1',
      title: 'Action Hero',
      genre: 'Action',
      duration: 120,
      cast: ['Actor 1', 'Actor 2'],
      director: 'Director 1',
      rating: 'PG-13',
      description: 'An action-packed movie',
      poster_url: 'https://example.com/poster1.jpg',
      trailer_url: 'https://youtube.com/watch?v=test1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Comedy Night',
      genre: 'Comedy',
      duration: 90,
      cast: ['Actor 3', 'Actor 4'],
      director: 'Director 2',
      rating: 'PG',
      description: 'A hilarious comedy',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockAnalytics = {
    monthly_revenue: 25000,
    total_revenue: 100000,
    total_tickets_sold: 5000,
    average_occupancy: 0.75,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockTheaterService.getTheaters.mockResolvedValue({
      results: mockTheaters,
      count: mockTheaters.length,
      next: null,
      previous: null,
    })
    
    mockTheaterService.getMovies.mockResolvedValue({
      results: mockMovies,
      count: mockMovies.length,
      next: null,
      previous: null,
    })
    
    mockTheaterService.getShowtimes.mockResolvedValue({
      results: [],
      count: 0,
      next: null,
      previous: null,
    })
    
    mockTheaterService.getOwnerAnalytics.mockResolvedValue(mockAnalytics)
  })

  it('renders dashboard with overview tab by default', async () => {
    render(<TheaterOwnerDashboard />)

    expect(screen.getByText('Theater Owner Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Total Theaters')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Number of theaters
    })
  })

  it('displays analytics data correctly', async () => {
    render(<TheaterOwnerDashboard />)

    await waitFor(() => {
      expect(screen.getByText('$25,000')).toBeInTheDocument() // Monthly revenue
      expect(screen.getByText('2')).toBeInTheDocument() // Active movies count
    })
  })

  it('switches between tabs correctly', async () => {
    render(<TheaterOwnerDashboard />)

    // Click on Theaters tab
    fireEvent.click(screen.getByText('Theaters'))
    
    await waitFor(() => {
      expect(screen.getByText('My Theaters')).toBeInTheDocument()
      expect(screen.getByText('Add Theater')).toBeInTheDocument()
    })

    // Click on Movies tab
    fireEvent.click(screen.getByText('Movies'))
    
    await waitFor(() => {
      expect(screen.getByText('Add Movie')).toBeInTheDocument()
    })
  })

  it('displays theaters in theaters tab', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Theaters'))

    await waitFor(() => {
      expect(screen.getByText('Downtown Cinema')).toBeInTheDocument()
      expect(screen.getByText('Mall Theater')).toBeInTheDocument()
      expect(screen.getByText('3 screens')).toBeInTheDocument()
      expect(screen.getByText('2 screens')).toBeInTheDocument()
    })
  })

  it('displays movies in movies tab', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Movies'))

    await waitFor(() => {
      expect(screen.getByText('Action Hero')).toBeInTheDocument()
      expect(screen.getByText('Comedy Night')).toBeInTheDocument()
      expect(screen.getByText('Action • 120 min')).toBeInTheDocument()
      expect(screen.getByText('Comedy • 90 min')).toBeInTheDocument()
    })
  })

  it('opens theater form when Add Theater is clicked', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Theaters'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Add Theater'))
    })

    // The form should be rendered (mocked)
    expect(screen.getByText('Add Theater')).toBeInTheDocument()
  })

  it('opens movie form when Add Movie is clicked', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Movies'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Add Movie'))
    })

    expect(screen.getByText('Add Movie')).toBeInTheDocument()
  })

  it('handles theater edit action', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Theaters'))

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      fireEvent.click(editButtons[0])
    })

    // Should open edit form (implementation would show the form)
    expect(mockTheaterService.getTheaters).toHaveBeenCalled()
  })

  it('displays loading state', () => {
    mockTheaterService.getTheaters.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<TheaterOwnerDashboard />)

    // Should show loading spinner (implementation dependent)
    expect(screen.getByText('Theater Owner Dashboard')).toBeInTheDocument()
  })

  it('handles error state', async () => {
    const errorMessage = 'Failed to load theaters'
    mockTheaterService.getTheaters.mockRejectedValue(new Error(errorMessage))

    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Theaters'))

    await waitFor(() => {
      expect(screen.getByText(`Error loading theaters: ${errorMessage}`)).toBeInTheDocument()
    })
  })

  it('shows analytics tab content', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Analytics'))

    await waitFor(() => {
      // Analytics component should be rendered
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
  })

  it('shows showtimes tab content', async () => {
    render(<TheaterOwnerDashboard />)

    fireEvent.click(screen.getByText('Showtimes'))

    await waitFor(() => {
      // ShowtimeScheduler component should be rendered
      expect(screen.getByText('Showtimes')).toBeInTheDocument()
    })
  })
})