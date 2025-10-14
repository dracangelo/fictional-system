import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TheaterService } from '../theaterService'
import { apiClient } from '../../api/client'
import type { Theater, Movie, Showtime, CreateTheaterData, CreateMovieData, CreateShowtimeData } from '../../../types/theater'

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApiClient = apiClient as any

describe('TheaterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Theater Management', () => {
    const mockTheater: Theater = {
      id: '1',
      owner: 'owner1',
      name: 'Test Theater',
      address: '123 Main St',
      screens: 3,
      seating_layout: {
        screens: [
          {
            screen_number: 1,
            rows: 10,
            seats_per_row: 15,
            vip_rows: [1, 2],
            disabled_seats: ['A1'],
            pricing: { regular: 12.00, vip: 18.00 }
          }
        ]
      },
      amenities: ['IMAX', 'Dolby Atmos'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should fetch theaters with filters', async () => {
      const mockResponse = {
        data: {
          results: [mockTheater],
          count: 1,
          next: null,
          previous: null,
        }
      }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const filters = { search: 'test', location: 'downtown' }
      const result = await TheaterService.getTheaters(filters)

      expect(mockApiClient.get).toHaveBeenCalledWith('/theaters/?search=test&location=downtown')
      expect(result).toEqual(mockResponse.data)
    })

    it('should fetch a single theater', async () => {
      const mockResponse = { data: { data: mockTheater } }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TheaterService.getTheater('1')

      expect(mockApiClient.get).toHaveBeenCalledWith('/theaters/1/')
      expect(result).toEqual(mockTheater)
    })

    it('should create a theater', async () => {
      const createData: CreateTheaterData = {
        name: 'New Theater',
        address: '456 Oak St',
        screens: 2,
        seating_layout: mockTheater.seating_layout,
        amenities: ['IMAX'],
      }
      const mockResponse = { data: { data: { ...mockTheater, ...createData } } }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await TheaterService.createTheater(createData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/theaters/', createData)
      expect(result).toEqual(mockResponse.data.data)
    })

    it('should update a theater', async () => {
      const updateData = { name: 'Updated Theater' }
      const mockResponse = { data: { data: { ...mockTheater, ...updateData } } }
      mockApiClient.put.mockResolvedValue(mockResponse)

      const result = await TheaterService.updateTheater('1', updateData)

      expect(mockApiClient.put).toHaveBeenCalledWith('/theaters/1/', updateData)
      expect(result).toEqual(mockResponse.data.data)
    })

    it('should delete a theater', async () => {
      mockApiClient.delete.mockResolvedValue({})

      await TheaterService.deleteTheater('1')

      expect(mockApiClient.delete).toHaveBeenCalledWith('/theaters/1/')
    })
  })

  describe('Movie Management', () => {
    const mockMovie: Movie = {
      id: '1',
      title: 'Test Movie',
      genre: 'Action',
      duration: 120,
      cast: ['Actor 1', 'Actor 2'],
      director: 'Director Name',
      rating: 'PG-13',
      description: 'A test movie',
      poster_url: 'https://example.com/poster.jpg',
      trailer_url: 'https://youtube.com/watch?v=test',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should fetch movies with filters', async () => {
      const mockResponse = {
        data: {
          results: [mockMovie],
          count: 1,
          next: null,
          previous: null,
        }
      }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const filters = { genre: 'Action', rating: 'PG-13' }
      const result = await TheaterService.getMovies(filters)

      expect(mockApiClient.get).toHaveBeenCalledWith('/movies/?genre=Action&rating=PG-13')
      expect(result).toEqual(mockResponse.data)
    })

    it('should create a movie', async () => {
      const createData: CreateMovieData = {
        title: 'New Movie',
        genre: 'Comedy',
        duration: 90,
        cast: ['Actor 3'],
        director: 'New Director',
        rating: 'PG',
        description: 'A new movie',
      }
      const mockResponse = { data: { data: { ...mockMovie, ...createData } } }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await TheaterService.createMovie(createData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/movies/', createData)
      expect(result).toEqual(mockResponse.data.data)
    })
  })

  describe('Showtime Management', () => {
    const mockShowtime: Showtime = {
      id: '1',
      theater: 'theater1',
      movie: 'movie1',
      screen_number: 1,
      start_time: '2024-01-01T19:00:00Z',
      end_time: '2024-01-01T21:00:00Z',
      base_price: 12.00,
      available_seats: 150,
      booked_seats: ['A1', 'A2'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should fetch showtimes with filters', async () => {
      const mockResponse = {
        data: {
          results: [mockShowtime],
          count: 1,
          next: null,
          previous: null,
        }
      }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const filters = { theater: 'theater1', date_from: '2024-01-01' }
      const result = await TheaterService.getShowtimes(filters)

      expect(mockApiClient.get).toHaveBeenCalledWith('/showtimes/?theater=theater1&date_from=2024-01-01')
      expect(result).toEqual(mockResponse.data)
    })

    it('should create a showtime', async () => {
      const createData: CreateShowtimeData = {
        theater: 'theater1',
        movie: 'movie1',
        screen_number: 1,
        start_time: '2024-01-01T19:00:00',
        end_time: '2024-01-01T21:00:00',
        base_price: 12.00,
      }
      const mockResponse = { data: { data: { ...mockShowtime, ...createData } } }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await TheaterService.createShowtime(createData)

      expect(mockApiClient.post).toHaveBeenCalledWith('/showtimes/', createData)
      expect(result).toEqual(mockResponse.data.data)
    })

    it('should validate showtime conflicts', async () => {
      const mockResponse = {
        data: {
          hasConflict: true,
          conflictingShowtime: mockShowtime,
        }
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await TheaterService.validateShowtimeConflict(
        [],
        'theater1',
        1,
        '2024-01-01T19:00:00',
        '2024-01-01T21:00:00'
      )

      expect(mockApiClient.post).toHaveBeenCalledWith('/showtimes/validate-conflict/', {
        theater_id: 'theater1',
        screen_number: 1,
        start_time: '2024-01-01T19:00:00',
        end_time: '2024-01-01T21:00:00',
        exclude_showtime_id: undefined,
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Analytics', () => {
    it('should fetch theater analytics', async () => {
      const mockAnalytics = {
        revenue: 5000,
        tickets_sold: 250,
        occupancy_rate: 0.75,
      }
      const mockResponse = { data: mockAnalytics }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const dateRange = { from: '2024-01-01', to: '2024-01-31' }
      const result = await TheaterService.getTheaterAnalytics('theater1', dateRange)

      expect(mockApiClient.get).toHaveBeenCalledWith('/theaters/theater1/analytics/?date_from=2024-01-01&date_to=2024-01-31')
      expect(result).toEqual(mockAnalytics)
    })

    it('should fetch owner analytics', async () => {
      const mockAnalytics = {
        total_revenue: 15000,
        total_tickets_sold: 750,
        average_occupancy: 0.68,
      }
      const mockResponse = { data: mockAnalytics }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TheaterService.getOwnerAnalytics()

      expect(mockApiClient.get).toHaveBeenCalledWith('/theaters/owner/analytics/?')
      expect(result).toEqual(mockAnalytics)
    })
  })
})