import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShowtimeScheduler } from '../ShowtimeScheduler'
import { TheaterService } from '../../../services/theater'
import type { Theater, Movie, Showtime } from '../../../types/theater'

// Mock the TheaterService
vi.mock('../../../services/theater', () => ({
  TheaterService: {
    getShowtimes: vi.fn(),
    createShowtime: vi.fn(),
    updateShowtime: vi.fn(),
    deleteShowtime: vi.fn(),
    validateShowtimeConflict: vi.fn(),
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
      refetch: vi.fn(),
    }
  }),
}))

const mockTheaterService = TheaterService as any

describe('ShowtimeScheduler', () => {
  const mockTheaters: Theater[] = [
    {
      id: '1',
      owner: 'owner1',
      name: 'Downtown Cinema',
      address: '123 Main St',
      screens: 2,
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
      amenities: ['IMAX'],
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
      cast: ['Actor 1'],
      director: 'Director 1',
      rating: 'PG-13',
      description: 'An action movie',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Comedy Night',
      genre: 'Comedy',
      duration: 90,
      cast: ['Actor 2'],
      director: 'Director 2',
      rating: 'PG',
      description: 'A comedy movie',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockShowtimes: Showtime[] = [
    {
      id: '1',
      theater: '1',
      movie: '1',
      screen_number: 1,
      start_time: '2024-01-01T19:00:00Z',
      end_time: '2024-01-01T21:00:00Z',
      base_price: 12.00,
      available_seats: 150,
      booked_seats: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      movie_details: mockMovies[0],
    },
  ]

  const mockOnShowtimeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockTheaterService.getShowtimes.mockResolvedValue({
      results: mockShowtimes,
      count: mockShowtimes.length,
      next: null,
      previous: null,
    })
    
    mockTheaterService.validateShowtimeConflict.mockResolvedValue({
      hasConflict: false,
    })
  })

  it('renders showtime scheduler with basic elements', async () => {
    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    expect(screen.getByText('Showtime Scheduler')).toBeInTheDocument()
    expect(screen.getByText('Schedule Showtime')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Theater (optional filter)')).toBeInTheDocument()
  })

  it('displays existing showtimes for selected date', async () => {
    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Downtown Cinema')).toBeInTheDocument()
      expect(screen.getByText('Screen 1')).toBeInTheDocument()
      expect(screen.getByText('Action Hero')).toBeInTheDocument()
    })
  })

  it('opens showtime form when Schedule Showtime is clicked', async () => {
    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    fireEvent.click(screen.getByText('Schedule Showtime'))

    await waitFor(() => {
      expect(screen.getByText('Schedule New Showtime')).toBeInTheDocument()
    })
  })

  it('filters showtimes by selected theater', async () => {
    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    const theaterSelect = screen.getByLabelText('Theater (optional filter)')
    fireEvent.change(theaterSelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(mockTheaterService.getShowtimes).toHaveBeenCalledWith(
        expect.objectContaining({
          theater: '1',
        })
      )
    })
  })

  it('changes date filter', async () => {
    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    const dateInput = screen.getByLabelText('Date')
    fireEvent.change(dateInput, { target: { value: '2024-01-02' } })

    await waitFor(() => {
      expect(mockTheaterService.getShowtimes).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2024-01-02',
          date_to: '2024-01-02',
        })
      )
    })
  })

  it('submits new showtime form', async () => {
    mockTheaterService.createShowtime.mockResolvedValue(mockShowtimes[0])

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    // Open form
    fireEvent.click(screen.getByText('Schedule Showtime'))

    await waitFor(() => {
      // Fill form fields
      const theaterSelect = screen.getByLabelText('Theater')
      const movieSelect = screen.getByLabelText('Movie')
      const startTimeInput = screen.getByLabelText('Start Time')
      const priceInput = screen.getByLabelText('Base Price ($)')

      fireEvent.change(theaterSelect, { target: { value: '1' } })
      fireEvent.change(movieSelect, { target: { value: '1' } })
      fireEvent.change(startTimeInput, { target: { value: '19:00' } })
      fireEvent.change(priceInput, { target: { value: '12.00' } })

      // Submit form
      fireEvent.click(screen.getByText('Schedule Showtime'))
    })

    await waitFor(() => {
      expect(mockTheaterService.createShowtime).toHaveBeenCalledWith(
        expect.objectContaining({
          theater: '1',
          movie: '1',
          screen_number: 1,
          base_price: 12.00,
        })
      )
      expect(mockOnShowtimeChange).toHaveBeenCalled()
    })
  })

  it('auto-calculates end time based on movie duration', async () => {
    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    // Open form
    fireEvent.click(screen.getByText('Schedule Showtime'))

    await waitFor(() => {
      const movieSelect = screen.getByLabelText('Movie')
      const startTimeInput = screen.getByLabelText('Start Time')

      // Select movie and start time
      fireEvent.change(movieSelect, { target: { value: '1' } }) // 120 min movie
      fireEvent.change(startTimeInput, { target: { value: '19:00' } })

      // End time should be auto-calculated (19:00 + 120 min = 21:00)
      const endTimeInput = screen.getByLabelText('End Time')
      expect(endTimeInput).toHaveValue('21:00')
    })
  })

  it('detects and displays scheduling conflicts', async () => {
    mockTheaterService.validateShowtimeConflict.mockResolvedValue({
      hasConflict: true,
      conflictingShowtime: mockShowtimes[0],
    })

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    // Open form
    fireEvent.click(screen.getByText('Schedule Showtime'))

    await waitFor(() => {
      const theaterSelect = screen.getByLabelText('Theater')
      const movieSelect = screen.getByLabelText('Movie')
      const startTimeInput = screen.getByLabelText('Start Time')

      fireEvent.change(theaterSelect, { target: { value: '1' } })
      fireEvent.change(movieSelect, { target: { value: '1' } })
      fireEvent.change(startTimeInput, { target: { value: '19:00' } })
    })

    await waitFor(() => {
      expect(screen.getByText(/Scheduling conflict detected/)).toBeInTheDocument()
    })
  })

  it('disables submit button when there is a conflict', async () => {
    mockTheaterService.validateShowtimeConflict.mockResolvedValue({
      hasConflict: true,
    })

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    // Open form
    fireEvent.click(screen.getByText('Schedule Showtime'))

    await waitFor(() => {
      const theaterSelect = screen.getByLabelText('Theater')
      const movieSelect = screen.getByLabelText('Movie')
      const startTimeInput = screen.getByLabelText('Start Time')

      fireEvent.change(theaterSelect, { target: { value: '1' } })
      fireEvent.change(movieSelect, { target: { value: '1' } })
      fireEvent.change(startTimeInput, { target: { value: '19:00' } })
    })

    await waitFor(() => {
      const submitButton = screen.getByText('Schedule Showtime')
      expect(submitButton).toBeDisabled()
    })
  })

  it('allows editing existing showtimes', async () => {
    mockTheaterService.updateShowtime.mockResolvedValue(mockShowtimes[0])

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    await waitFor(() => {
      const editButton = screen.getByText('Edit')
      fireEvent.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Edit Showtime')).toBeInTheDocument()
      
      // Form should be pre-filled with showtime data
      expect(screen.getByDisplayValue('1')).toBeInTheDocument() // theater
      expect(screen.getByDisplayValue('12')).toBeInTheDocument() // price
    })
  })

  it('allows deleting showtimes with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    mockTheaterService.deleteShowtime.mockResolvedValue({})

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    await waitFor(() => {
      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)
    })

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this showtime?')
    expect(mockTheaterService.deleteShowtime).toHaveBeenCalledWith('1')
    expect(mockOnShowtimeChange).toHaveBeenCalled()

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('shows message when no theaters are available', () => {
    render(
      <ShowtimeScheduler
        theaters={[]}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    expect(screen.getByText('No theaters available. Create a theater first to schedule showtimes.')).toBeInTheDocument()
  })

  it('shows message when no showtimes are scheduled for a screen', async () => {
    mockTheaterService.getShowtimes.mockResolvedValue({
      results: [],
      count: 0,
      next: null,
      previous: null,
    })

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No showtimes scheduled for this screen')).toBeInTheDocument()
    })
  })

  it('handles form submission errors', async () => {
    const errorMessage = 'Failed to create showtime'
    mockTheaterService.createShowtime.mockRejectedValue({
      response: { data: { message: errorMessage } }
    })

    render(
      <ShowtimeScheduler
        theaters={mockTheaters}
        movies={mockMovies}
        onShowtimeChange={mockOnShowtimeChange}
      />
    )

    // Open form and fill required fields
    fireEvent.click(screen.getByText('Schedule Showtime'))

    await waitFor(() => {
      const theaterSelect = screen.getByLabelText('Theater')
      const movieSelect = screen.getByLabelText('Movie')
      const startTimeInput = screen.getByLabelText('Start Time')

      fireEvent.change(theaterSelect, { target: { value: '1' } })
      fireEvent.change(movieSelect, { target: { value: '1' } })
      fireEvent.change(startTimeInput, { target: { value: '19:00' } })

      fireEvent.click(screen.getByText('Schedule Showtime'))
    })

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })
})