import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { TheaterAnalytics } from './TheaterAnalytics'
import { TheaterForm } from './TheaterForm'
import { ShowtimeScheduler } from './ShowtimeScheduler'
import { MovieForm } from './MovieForm'
import { TheaterService } from '../../services/theater'
import { useQuery } from '@tanstack/react-query'
import type { Theater, Movie, Showtime } from '../../types/theater'

interface TheaterOwnerDashboardProps {
  className?: string
}

type ActiveTab = 'overview' | 'theaters' | 'movies' | 'showtimes' | 'analytics'

export const TheaterOwnerDashboard: React.FC<TheaterOwnerDashboardProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [showTheaterForm, setShowTheaterForm] = useState(false)
  const [showMovieForm, setShowMovieForm] = useState(false)
  const [editingTheater, setEditingTheater] = useState<Theater | null>(null)
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)

  // Fetch owner's theaters
  const {
    data: theatersData,
    isLoading: theatersLoading,
    error: theatersError,
    refetch: refetchTheaters,
  } = useQuery({
    queryKey: ['theaters'],
    queryFn: () => TheaterService.getTheaters(),
  })

  // Fetch movies
  const {
    data: moviesData,
    isLoading: moviesLoading,
    error: moviesError,
    refetch: refetchMovies,
  } = useQuery({
    queryKey: ['movies'],
    queryFn: () => TheaterService.getMovies(),
  })

  // Fetch recent showtimes
  const {
    data: showtimesData,
    isLoading: showtimesLoading,
    refetch: refetchShowtimes,
  } = useQuery({
    queryKey: ['showtimes'],
    queryFn: () => TheaterService.getShowtimes({ page_size: 10 }),
  })

  // Fetch analytics
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ['owner-analytics'],
    queryFn: () => TheaterService.getOwnerAnalytics(),
  })

  const theaters = theatersData?.results || []
  const movies = moviesData?.results || []
  const showtimes = showtimesData?.results || []

  const handleCreateTheater = () => {
    setEditingTheater(null)
    setShowTheaterForm(true)
  }

  const handleEditTheater = (theater: Theater) => {
    setEditingTheater(theater)
    setShowTheaterForm(true)
  }

  const handleTheaterFormClose = () => {
    setShowTheaterForm(false)
    setEditingTheater(null)
    refetchTheaters()
  }

  const handleCreateMovie = () => {
    setEditingMovie(null)
    setShowMovieForm(true)
  }

  const handleEditMovie = (movie: Movie) => {
    setEditingMovie(movie)
    setShowMovieForm(true)
  }

  const handleMovieFormClose = () => {
    setShowMovieForm(false)
    setEditingMovie(null)
    refetchMovies()
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'theaters', label: 'Theaters' },
    { id: 'movies', label: 'Movies' },
    { id: 'showtimes', label: 'Showtimes' },
    { id: 'analytics', label: 'Analytics' },
  ] as const

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Total Theaters</p>
                <p className="text-2xl font-bold text-secondary-900">{theaters.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Active Movies</p>
                <p className="text-2xl font-bold text-secondary-900">{movies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-warning-100 rounded-lg">
                <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Today's Shows</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {showtimes.filter(s => 
                    new Date(s.start_time).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-error-100 rounded-lg">
                <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-secondary-900">
                  ${analyticsData?.monthly_revenue?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Theaters</CardTitle>
          </CardHeader>
          <CardContent>
            {theatersLoading ? (
              <LoadingSpinner />
            ) : theaters.length > 0 ? (
              <div className="space-y-3">
                {theaters.slice(0, 5).map((theater) => (
                  <div key={theater.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div>
                      <p className="font-medium text-secondary-900">{theater.name}</p>
                      <p className="text-sm text-secondary-600">{theater.screens} screens</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTheater(theater)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary-600">No theaters yet. Create your first theater!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Showtimes</CardTitle>
          </CardHeader>
          <CardContent>
            {showtimesLoading ? (
              <LoadingSpinner />
            ) : showtimes.length > 0 ? (
              <div className="space-y-3">
                {showtimes.slice(0, 5).map((showtime) => (
                  <div key={showtime.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div>
                      <p className="font-medium text-secondary-900">
                        {showtime.movie_details?.title || 'Unknown Movie'}
                      </p>
                      <p className="text-sm text-secondary-600">
                        {new Date(showtime.start_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-secondary-900">Screen {showtime.screen_number}</p>
                      <p className="text-sm text-secondary-600">${showtime.base_price}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary-600">No upcoming showtimes scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderTheaters = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-900">My Theaters</h2>
        <Button onClick={handleCreateTheater}>
          Add Theater
        </Button>
      </div>

      {theatersLoading ? (
        <LoadingSpinner />
      ) : theatersError ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-error-600">Error loading theaters: {theatersError.message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theaters.map((theater) => (
            <Card key={theater.id} variant="interactive" onClick={() => handleEditTheater(theater)}>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">{theater.name}</h3>
                <p className="text-secondary-600 mb-4">{theater.address}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">{theater.screens} screens</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    theater.is_active 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {theater.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderMovies = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-900">Movies</h2>
        <Button onClick={handleCreateMovie}>
          Add Movie
        </Button>
      </div>

      {moviesLoading ? (
        <LoadingSpinner />
      ) : moviesError ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-error-600">Error loading movies: {moviesError.message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {movies.map((movie) => (
            <Card key={movie.id} variant="interactive" onClick={() => handleEditMovie(movie)}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-secondary-200 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-1">{movie.title}</h3>
                    <p className="text-sm text-secondary-600 mb-2">{movie.genre} • {movie.duration} min</p>
                    <p className="text-sm text-secondary-600 mb-2">Dir: {movie.director}</p>
                    <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                      {movie.rating}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-secondary-900">Theater Owner Dashboard</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'theaters' && renderTheaters()}
        {activeTab === 'movies' && renderMovies()}
        {activeTab === 'showtimes' && (
          <ShowtimeScheduler
            theaters={theaters}
            movies={movies}
            onShowtimeChange={refetchShowtimes}
          />
        )}
        {activeTab === 'analytics' && (
          <TheaterAnalytics
            theaters={theaters}
            analyticsData={analyticsData}
            loading={analyticsLoading}
          />
        )}
      </div>

      {/* Modals */}
      {showTheaterForm && (
        <TheaterForm
          theater={editingTheater}
          onClose={handleTheaterFormClose}
        />
      )}

      {showMovieForm && (
        <MovieForm
          movie={editingMovie}
          onClose={handleMovieFormClose}
        />
      )}
    </div>
  )
}