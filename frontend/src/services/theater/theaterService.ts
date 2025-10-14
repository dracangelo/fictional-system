import { apiClient } from '../api/client'
import type {
  Theater,
  Movie,
  Showtime,
  CreateTheaterData,
  UpdateTheaterData,
  CreateMovieData,
  CreateShowtimeData,
  TheaterFilters,
  MovieFilters,
  ShowtimeFilters,
} from '../../types/theater'
import type { ApiResponse, PaginatedResponse } from '../../types/api'

export class TheaterService {
  // Theater management
  static async getTheaters(filters?: TheaterFilters): Promise<PaginatedResponse<Theater>> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.location) params.append('location', filters.location)
    if (filters?.amenities?.length) {
      filters.amenities.forEach(amenity => params.append('amenities', amenity))
    }
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())

    const response = await apiClient.get<PaginatedResponse<Theater>>(`/theaters/?${params}`)
    return response.data
  }

  static async getTheater(id: string): Promise<Theater> {
    const response = await apiClient.get<Theater>(`/theaters/${id}/`)
    return response.data
  }

  static async createTheater(data: CreateTheaterData): Promise<Theater> {
    const response = await apiClient.post<Theater>('/theaters/', data)
    return response.data
  }

  static async updateTheater(id: string, data: UpdateTheaterData): Promise<Theater> {
    const response = await apiClient.put<Theater>(`/theaters/${id}/`, data)
    return response.data
  }

  static async deleteTheater(id: string): Promise<void> {
    await apiClient.delete(`/theaters/${id}/`)
  }

  // Movie management
  static async getMovies(filters?: MovieFilters): Promise<PaginatedResponse<Movie>> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.genre) params.append('genre', filters.genre)
    if (filters?.rating) params.append('rating', filters.rating)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())

    const response = await apiClient.get<PaginatedResponse<Movie>>(`/movies/?${params}`)
    return response.data
  }

  static async getMovie(id: string): Promise<Movie> {
    const response = await apiClient.get<Movie>(`/movies/${id}/`)
    return response.data
  }

  static async createMovie(data: CreateMovieData): Promise<Movie> {
    const response = await apiClient.post<Movie>('/movies/', data)
    return response.data
  }

  static async updateMovie(id: string, data: Partial<CreateMovieData>): Promise<Movie> {
    const response = await apiClient.put<Movie>(`/movies/${id}/`, data)
    return response.data
  }

  static async deleteMovie(id: string): Promise<void> {
    await apiClient.delete(`/movies/${id}/`)
  }

  // Showtime management
  static async getShowtimes(filters?: ShowtimeFilters): Promise<PaginatedResponse<Showtime>> {
    const params = new URLSearchParams()
    if (filters?.theater) params.append('theater', filters.theater)
    if (filters?.movie) params.append('movie', filters.movie)
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)
    if (filters?.screen_number) params.append('screen_number', filters.screen_number.toString())
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())

    const response = await apiClient.get<PaginatedResponse<Showtime>>(`/showtimes/?${params}`)
    return response.data
  }

  static async getShowtime(id: string): Promise<Showtime> {
    const response = await apiClient.get<Showtime>(`/showtimes/${id}/`)
    return response.data
  }

  static async createShowtime(data: CreateShowtimeData): Promise<Showtime> {
    const response = await apiClient.post<Showtime>('/showtimes/', data)
    return response.data
  }

  static async updateShowtime(id: string, data: Partial<CreateShowtimeData>): Promise<Showtime> {
    const response = await apiClient.put<Showtime>(`/showtimes/${id}/`, data)
    return response.data
  }

  static async deleteShowtime(id: string): Promise<void> {
    await apiClient.delete(`/showtimes/${id}/`)
  }

  // Analytics
  static async getTheaterAnalytics(theaterId: string, dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams()
    if (dateRange?.from) params.append('date_from', dateRange.from)
    if (dateRange?.to) params.append('date_to', dateRange.to)

    const response = await apiClient.get(`/theaters/${theaterId}/analytics/?${params}`)
    return response.data
  }

  static async getOwnerAnalytics(dateRange?: { from: string; to: string }) {
    const params = new URLSearchParams()
    if (dateRange?.from) params.append('date_from', dateRange.from)
    if (dateRange?.to) params.append('date_to', dateRange.to)

    const response = await apiClient.get(`/theaters/owner/analytics/?${params}`)
    return response.data
  }

  // Validation helpers
  static async validateShowtimeConflict(
    theaters: Theater[],
    theaterId: string,
    screenNumber: number,
    startTime: string,
    endTime: string,
    excludeShowtimeId?: string
  ): Promise<{ hasConflict: boolean; conflictingShowtime?: Showtime }> {
    const response = await apiClient.post('/showtimes/validate-conflict/', {
      theater_id: theaterId,
      screen_number: screenNumber,
      start_time: startTime,
      end_time: endTime,
      exclude_showtime_id: excludeShowtimeId,
    })
    return response.data
  }
}