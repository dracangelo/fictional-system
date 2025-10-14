import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal, ModalHeader } from '../ui/Modal'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { TheaterService } from '../../services/theater'
import { useQuery } from '@tanstack/react-query'
import type { Theater, Movie, Showtime, CreateShowtimeData } from '../../types/theater'

interface ShowtimeSchedulerProps {
  theaters: Theater[]
  movies: Movie[]
  onShowtimeChange: () => void
}

interface ShowtimeFormData {
  theater: string
  movie: string
  screen_number: number
  start_time: string
  end_time: string
  base_price: number
}

export const ShowtimeScheduler: React.FC<ShowtimeSchedulerProps> = ({
  theaters,
  movies,
  onShowtimeChange,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTheater, setSelectedTheater] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingShowtime, setEditingShowtime] = useState<Showtime | null>(null)
  const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; conflictingShowtime?: Showtime } | null>(null)

  // Form state
  const [formData, setFormData] = useState<ShowtimeFormData>({
    theater: '',
    movie: '',
    screen_number: 1,
    start_time: '',
    end_time: '',
    base_price: 12.00,
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch showtimes for selected date and theater
  const {
    data: showtimesData,
    loading: showtimesLoading,
    error: showtimesError,
    refetch: refetchShowtimes,
  } = useQuery(() => {
    const filters: any = {
      date_from: selectedDate,
      date_to: selectedDate,
    }
    if (selectedTheater) {
      filters.theater = selectedTheater
    }
    return TheaterService.getShowtimes(filters)
  }, [selectedDate, selectedTheater])

  const showtimes = showtimesData?.results || []

  // Auto-calculate end time when start time or movie changes
  useEffect(() => {
    if (formData.start_time && formData.movie) {
      const movie = movies.find(m => m.id === formData.movie)
      if (movie) {
        const startTime = new Date(`${selectedDate}T${formData.start_time}`)
        const endTime = new Date(startTime.getTime() + movie.duration * 60000) // duration in minutes
        setFormData(prev => ({
          ...prev,
          end_time: endTime.toTimeString().slice(0, 5)
        }))
      }
    }
  }, [formData.start_time, formData.movie, movies, selectedDate])

  // Check for conflicts when form data changes
  useEffect(() => {
    if (formData.theater && formData.screen_number && formData.start_time && formData.end_time) {
      checkConflicts()
    }
  }, [formData.theater, formData.screen_number, formData.start_time, formData.end_time])

  const checkConflicts = async () => {
    try {
      const startDateTime = `${selectedDate}T${formData.start_time}:00`
      const endDateTime = `${selectedDate}T${formData.end_time}:00`
      
      const result = await TheaterService.validateShowtimeConflict(
        theaters,
        formData.theater,
        formData.screen_number,
        startDateTime,
        endDateTime,
        editingShowtime?.id
      )
      
      setConflictCheck(result)
    } catch (error) {
      console.error('Error checking conflicts:', error)
    }
  }

  const handleCreateShowtime = () => {
    setEditingShowtime(null)
    setFormData({
      theater: selectedTheater || theaters[0]?.id || '',
      movie: '',
      screen_number: 1,
      start_time: '',
      end_time: '',
      base_price: 12.00,
    })
    setConflictCheck(null)
    setShowForm(true)
  }

  const handleEditShowtime = (showtime: Showtime) => {
    setEditingShowtime(showtime)
    const startTime = new Date(showtime.start_time)
    const endTime = new Date(showtime.end_time)
    
    setFormData({
      theater: showtime.theater,
      movie: showtime.movie,
      screen_number: showtime.screen_number,
      start_time: startTime.toTimeString().slice(0, 5),
      end_time: endTime.toTimeString().slice(0, 5),
      base_price: showtime.base_price,
    })
    setConflictCheck(null)
    setShowForm(true)
  }

  const handleDeleteShowtime = async (showtimeId: string) => {
    if (window.confirm('Are you sure you want to delete this showtime?')) {
      try {
        await TheaterService.deleteShowtime(showtimeId)
        refetchShowtimes()
        onShowtimeChange()
      } catch (error) {
        console.error('Error deleting showtime:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (conflictCheck?.hasConflict) {
      setFormError('Cannot create showtime due to scheduling conflict')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      const startDateTime = `${selectedDate}T${formData.start_time}:00`
      const endDateTime = `${selectedDate}T${formData.end_time}:00`

      const showtimeData: CreateShowtimeData = {
        theater: formData.theater,
        movie: formData.movie,
        screen_number: formData.screen_number,
        start_time: startDateTime,
        end_time: endDateTime,
        base_price: formData.base_price,
      }

      if (editingShowtime) {
        await TheaterService.updateShowtime(editingShowtime.id, showtimeData)
      } else {
        await TheaterService.createShowtime(showtimeData)
      }

      setShowForm(false)
      refetchShowtimes()
      onShowtimeChange()
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save showtime')
    } finally {
      setFormLoading(false)
    }
  }

  const getTheaterScreens = (theaterId: string): number => {
    const theater = theaters.find(t => t.id === theaterId)
    return theater?.screens || 1
  }

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const groupShowtimesByScreen = (showtimes: Showtime[]) => {
    const grouped: { [key: number]: Showtime[] } = {}
    showtimes.forEach(showtime => {
      if (!grouped[showtime.screen_number]) {
        grouped[showtime.screen_number] = []
      }
      grouped[showtime.screen_number]!.push(showtime)
    })
    return grouped
  }

  const groupedShowtimes = groupShowtimesByScreen(showtimes)

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-secondary-900">Showtime Scheduler</h2>
        <Button onClick={handleCreateShowtime}>
          Schedule Showtime
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            
            <Select
              label="Theater (optional filter)"
              value={selectedTheater}
              onChange={(e) => setSelectedTheater(e.target.value)}
              options={[
                { value: '', label: 'All Theaters' },
                ...theaters.map(theater => ({
                  value: theater.id,
                  label: theater.name,
                }))
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Showtimes Display */}
      {showtimesLoading ? (
        <LoadingSpinner />
      ) : showtimesError ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-error-600">Error loading showtimes: {showtimesError.message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {theaters
            .filter(theater => !selectedTheater || theater.id === selectedTheater)
            .map(theater => (
              <Card key={theater.id}>
                <CardHeader>
                  <CardTitle>{theater.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.from({ length: theater.screens }, (_, i) => i + 1).map(screenNumber => {
                    const screenShowtimes = groupedShowtimes[screenNumber] || []
                    const theaterShowtimes = screenShowtimes.filter(s => s.theater === theater.id)
                    
                    return (
                      <div key={screenNumber} className="mb-6 last:mb-0">
                        <h4 className="text-lg font-medium mb-3">Screen {screenNumber}</h4>
                        
                        {theaterShowtimes.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {theaterShowtimes
                              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                              .map(showtime => (
                                <div
                                  key={showtime.id}
                                  className="p-4 border border-secondary-200 rounded-lg hover:shadow-md transition-shadow"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-medium text-secondary-900">
                                      {showtime.movie_details?.title || 'Unknown Movie'}
                                    </h5>
                                    <div className="flex space-x-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditShowtime(showtime)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteShowtime(showtime.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-secondary-600">
                                    <p>
                                      {formatTime(showtime.start_time)} - {formatTime(showtime.end_time)}
                                    </p>
                                    <p>Price: ${showtime.base_price}</p>
                                    <p>Available: {showtime.available_seats} seats</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-secondary-500 italic">No showtimes scheduled for this screen</p>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          
          {theaters.filter(theater => !selectedTheater || theater.id === selectedTheater).length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-secondary-600">No theaters available. Create a theater first to schedule showtimes.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Showtime Form Modal */}
      {showForm && (
        <Modal open={showForm} onClose={() => setShowForm(false)} className="max-w-2xl">
          <ModalHeader>
            <h3 className="text-xl font-semibold">
              {editingShowtime ? 'Edit Showtime' : 'Schedule New Showtime'}
            </h3>
          </ModalHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {formError && (
              <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-error-800">{formError}</p>
              </div>
            )}

            {conflictCheck?.hasConflict && (
              <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-warning-800">
                  Scheduling conflict detected! This time slot overlaps with another showtime.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Theater"
                value={formData.theater}
                onChange={(e) => setFormData(prev => ({ ...prev, theater: e.target.value, screen_number: 1 }))}
                options={theaters.map(theater => ({
                  value: theater.id,
                  label: theater.name,
                }))}
                required
              />

              <Select
                label="Movie"
                value={formData.movie}
                onChange={(e) => setFormData(prev => ({ ...prev, movie: e.target.value }))}
                options={movies.map(movie => ({
                  value: movie.id,
                  label: `${movie.title} (${movie.duration}min)`,
                }))}
                required
              />

              <Select
                label="Screen"
                value={formData.screen_number.toString()}
                onChange={(e) => setFormData(prev => ({ ...prev, screen_number: parseInt(e.target.value) }))}
                options={Array.from({ length: getTheaterScreens(formData.theater) }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: `Screen ${i + 1}`,
                }))}
                required
              />

              <Input
                label="Base Price ($)"
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                required
              />

              <Input
                label="Start Time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />

              <Input
                label="End Time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={formLoading}
                disabled={conflictCheck?.hasConflict}
              >
                {editingShowtime ? 'Update Showtime' : 'Schedule Showtime'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}