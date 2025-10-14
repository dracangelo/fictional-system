import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TextArea } from '../ui/TextArea'
import { Select } from '../ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { TheaterService } from '../../services/theater'
import type { Movie, CreateMovieData } from '../../types/theater'

interface MovieFormProps {
  movie?: Movie | null
  onClose: () => void
}

const MOVIE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Sport',
  'Thriller',
  'War',
  'Western',
]

const MOVIE_RATINGS = [
  'G',
  'PG',
  'PG-13',
  'R',
  'NC-17',
  'NR', // Not Rated
]

export const MovieForm: React.FC<MovieFormProps> = ({
  movie,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [duration, setDuration] = useState(120) // Default 2 hours
  const [cast, setCast] = useState<string[]>([])
  const [newCastMember, setNewCastMember] = useState('')
  const [director, setDirector] = useState('')
  const [rating, setRating] = useState('PG-13')
  const [description, setDescription] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [trailerUrl, setTrailerUrl] = useState('')

  useEffect(() => {
    if (movie) {
      setTitle(movie.title)
      setGenre(movie.genre)
      setDuration(movie.duration)
      setCast(movie.cast || [])
      setDirector(movie.director)
      setRating(movie.rating)
      setDescription(movie.description)
      setPosterUrl(movie.poster_url || '')
      setTrailerUrl(movie.trailer_url || '')
    }
  }, [movie])

  const handleAddCastMember = () => {
    if (newCastMember.trim() && !cast.includes(newCastMember.trim())) {
      setCast([...cast, newCastMember.trim()])
      setNewCastMember('')
    }
  }

  const handleRemoveCastMember = (member: string) => {
    setCast(cast.filter(c => c !== member))
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const validateUrl = (url: string): boolean => {
    if (!url) return true // Optional field
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!validateUrl(posterUrl)) {
      setError('Please enter a valid poster URL')
      setLoading(false)
      return
    }

    if (!validateUrl(trailerUrl)) {
      setError('Please enter a valid trailer URL')
      setLoading(false)
      return
    }

    if (duration < 1 || duration > 600) {
      setError('Duration must be between 1 and 600 minutes')
      setLoading(false)
      return
    }

    try {
      const movieData: CreateMovieData = {
        title,
        genre,
        duration,
        cast,
        director,
        rating,
        description,
        ...(posterUrl && { poster_url: posterUrl }),
        ...(trailerUrl && { trailer_url: trailerUrl }),
      }

      if (movie) {
        await TheaterService.updateMovie(movie.id, movieData)
      } else {
        await TheaterService.createMovie(movieData)
      }

      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save movie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} className="max-w-3xl">
      <ModalHeader>
        <h2 className="text-xl font-semibold">
          {movie ? 'Edit Movie' : 'Add New Movie'}
        </h2>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Movie Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter movie title"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                options={MOVIE_GENRES.map(g => ({ value: g, label: g }))}
                required
              />

              <Select
                label="Rating"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                options={MOVIE_RATINGS.map(r => ({ value: r, label: r }))}
                required
              />

              <div>
                <Input
                  label={`Duration (${formatDuration(duration)})`}
                  type="number"
                  min="1"
                  max="600"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 120)}
                  required
                  placeholder="Minutes"
                />
                <p className="text-xs text-secondary-500 mt-1">Duration in minutes</p>
              </div>
            </div>

            <Input
              label="Director"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              required
              placeholder="Enter director name"
            />

            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Enter movie description"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Cast */}
        <Card>
          <CardHeader>
            <CardTitle>Cast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newCastMember}
                onChange={(e) => setNewCastMember(e.target.value)}
                placeholder="Add cast member name"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCastMember())}
              />
              <Button type="button" onClick={handleAddCastMember} variant="outline">
                Add
              </Button>
            </div>

            {cast.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-secondary-700">Cast Members:</p>
                <div className="flex flex-wrap gap-2">
                  {cast.map((member, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      {member}
                      <button
                        type="button"
                        onClick={() => handleRemoveCastMember(member)}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Media (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Poster URL"
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://example.com/poster.jpg"
            />

            <Input
              label="Trailer URL"
              type="url"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />

            {/* Preview */}
            {(posterUrl || trailerUrl) && (
              <div className="mt-4">
                <p className="text-sm font-medium text-secondary-700 mb-2">Preview:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posterUrl && (
                    <div>
                      <p className="text-xs text-secondary-600 mb-2">Poster Preview:</p>
                      <img
                        src={posterUrl}
                        alt="Movie poster preview"
                        className="w-32 h-48 object-cover rounded-lg border border-secondary-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  
                  {trailerUrl && (
                    <div>
                      <p className="text-xs text-secondary-600 mb-2">Trailer Link:</p>
                      <a
                        href={trailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-secondary-300 rounded-md text-sm text-secondary-700 hover:bg-secondary-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Trailer
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movie Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Movie Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-secondary-50 p-4 rounded-lg">
              <div className="flex items-start space-x-4">
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt={title}
                    className="w-16 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-secondary-900">
                    {title || 'Movie Title'}
                  </h3>
                  <p className="text-sm text-secondary-600 mb-2">
                    {genre} • {formatDuration(duration)} • {rating}
                  </p>
                  <p className="text-sm text-secondary-600 mb-2">
                    Directed by {director || 'Director Name'}
                  </p>
                  {cast.length > 0 && (
                    <p className="text-sm text-secondary-600">
                      Starring: {cast.slice(0, 3).join(', ')}
                      {cast.length > 3 && ` and ${cast.length - 3} more`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {movie ? 'Update Movie' : 'Add Movie'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}