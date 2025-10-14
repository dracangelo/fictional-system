import React, { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Movie {
  id: string;
  title: string;
  genre: string;
  rating: number;
  duration: number;
  posterUrl: string;
  trailerUrl?: string;
  description: string;
  releaseDate: string;
}

// Mock data - replace with actual API call
const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'The Dark Knight',
    genre: 'Action',
    rating: 9.0,
    duration: 152,
    posterUrl: 'https://via.placeholder.com/300x450/1f2937/ffffff?text=The+Dark+Knight',
    description: 'Batman faces the Joker in this epic superhero thriller.',
    releaseDate: '2024-01-15'
  },
  {
    id: '2',
    title: 'Inception',
    genre: 'Sci-Fi',
    rating: 8.8,
    duration: 148,
    posterUrl: 'https://via.placeholder.com/300x450/374151/ffffff?text=Inception',
    description: 'A thief enters dreams to plant ideas in this mind-bending thriller.',
    releaseDate: '2024-01-20'
  },
  {
    id: '3',
    title: 'Interstellar',
    genre: 'Sci-Fi',
    rating: 8.6,
    duration: 169,
    posterUrl: 'https://via.placeholder.com/300x450/4b5563/ffffff?text=Interstellar',
    description: 'A team of explorers travel through a wormhole in space.',
    releaseDate: '2024-01-25'
  },
  {
    id: '4',
    title: 'The Avengers',
    genre: 'Action',
    rating: 8.0,
    duration: 143,
    posterUrl: 'https://via.placeholder.com/300x450/6b7280/ffffff?text=The+Avengers',
    description: 'Earth\'s mightiest heroes assemble to save the world.',
    releaseDate: '2024-02-01'
  },
  {
    id: '5',
    title: 'Pulp Fiction',
    genre: 'Crime',
    rating: 8.9,
    duration: 154,
    posterUrl: 'https://via.placeholder.com/300x450/9ca3af/ffffff?text=Pulp+Fiction',
    description: 'Interconnected stories of crime and redemption.',
    releaseDate: '2024-02-05'
  }
];

export const TrendingMoviesCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [movies] = useState<Movie[]>(mockMovies);
  const [itemsPerView, setItemsPerView] = useState(4);

  // Responsive items per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 768) {
        setItemsPerView(2);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(3);
      } else {
        setItemsPerView(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, movies.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleMovieClick = (movie: Movie) => {
    console.log('Movie clicked:', movie);
    // Navigate to movie details or booking page
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Trending Movies
            </h2>
            <p className="text-gray-600">
              Discover the most popular movies playing now
            </p>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-2"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              disabled={currentIndex >= maxIndex}
              className="p-2"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`
            }}
          >
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="flex-shrink-0 px-2"
                style={{ width: `${100 / itemsPerView}%` }}
              >
                <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div 
                    className="relative overflow-hidden rounded-t-lg"
                    onClick={() => handleMovieClick(movie)}
                  >
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay with play button */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white rounded-full p-3 shadow-lg">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 5v10l8-5-8-5z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-semibold">
                      ⭐ {movie.rating}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 text-gray-900 group-hover:text-blue-600 transition-colors">
                      {movie.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span className="bg-gray-100 px-2 py-1 rounded">{movie.genre}</span>
                      <span>{formatDuration(movie.duration)}</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {movie.description}
                    </p>
                    
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleMovieClick(movie)}
                    >
                      Book Tickets
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            View All Movies
          </Button>
        </div>
      </div>
    </section>
  );
};