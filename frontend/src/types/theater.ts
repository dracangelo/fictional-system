export interface Theater {
  id: string;
  owner: string;
  name: string;
  address: string;
  screens: number;
  seating_layout: SeatingLayout;
  amenities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeatingLayout {
  screens: Array<{
    screen_number: number;
    rows: number;
    seats_per_row: number;
    vip_rows: number[];
    disabled_seats: string[];
    pricing: {
      regular: number;
      vip: number;
    };
  }>;
}

export interface Movie {
  id: string;
  title: string;
  genre: string;
  duration: number;
  cast: string[];
  director: string;
  rating: string;
  description: string;
  poster_url?: string;
  trailer_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Showtime {
  id: string;
  theater: string;
  movie: string;
  screen_number: number;
  start_time: string;
  end_time: string;
  base_price: number;
  available_seats: number;
  booked_seats: string[];
  created_at: string;
  updated_at: string;
  theater_details?: Theater;
  movie_details?: Movie;
}

export interface CreateTheaterData {
  name: string;
  address: string;
  screens: number;
  seating_layout: SeatingLayout;
  amenities?: string[];
}

export interface UpdateTheaterData extends Partial<CreateTheaterData> {
  is_active?: boolean;
}

export interface CreateMovieData {
  title: string;
  genre: string;
  duration: number;
  cast: string[];
  director: string;
  rating: string;
  description: string;
  poster_url?: string;
  trailer_url?: string;
}

export interface CreateShowtimeData {
  theater: string;
  movie: string;
  screen_number: number;
  start_time: string;
  end_time: string;
  base_price: number;
}

export interface TheaterFilters {
  search?: string;
  location?: string;
  amenities?: string[];
  page?: number;
  page_size?: number;
}

export interface MovieFilters {
  search?: string;
  genre?: string;
  rating?: string;
  page?: number;
  page_size?: number;
}

export interface ShowtimeFilters {
  theater?: string;
  movie?: string;
  date_from?: string;
  date_to?: string;
  screen_number?: number;
  page?: number;
  page_size?: number;
}