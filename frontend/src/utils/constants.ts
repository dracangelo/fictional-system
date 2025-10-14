// Application constants
export const APP_NAME = 'Movie & Event Booking';
export const APP_VERSION = '1.0.0';

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    PASSWORD_RESET: '/auth/password-reset',
  },
  // Events
  EVENTS: {
    LIST: '/events',
    CREATE: '/events',
    DETAIL: (id: string) => `/events/${id}`,
    UPDATE: (id: string) => `/events/${id}`,
    DELETE: (id: string) => `/events/${id}`,
    ANALYTICS: (id: string) => `/events/${id}/analytics`,
    TICKET_TYPES: (id: string) => `/events/${id}/ticket-types`,
  },
  // Theaters
  THEATERS: {
    LIST: '/theaters',
    CREATE: '/theaters',
    DETAIL: (id: string) => `/theaters/${id}`,
    UPDATE: (id: string) => `/theaters/${id}`,
    DELETE: (id: string) => `/theaters/${id}`,
  },
  // Movies
  MOVIES: {
    LIST: '/movies',
    CREATE: '/movies',
    DETAIL: (id: string) => `/movies/${id}`,
    UPDATE: (id: string) => `/movies/${id}`,
    DELETE: (id: string) => `/movies/${id}`,
  },
  // Showtimes
  SHOWTIMES: {
    LIST: '/showtimes',
    CREATE: '/showtimes',
    DETAIL: (id: string) => `/showtimes/${id}`,
    UPDATE: (id: string) => `/showtimes/${id}`,
    DELETE: (id: string) => `/showtimes/${id}`,
  },
  // Bookings
  BOOKINGS: {
    LIST: '/bookings',
    CREATE: '/bookings',
    DETAIL: (id: string) => `/bookings/${id}`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
    TICKETS: (id: string) => `/bookings/${id}/tickets`,
  },
  // Admin
  ADMIN: {
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
    USER_ACTIONS: (id: string) => `/admin/users/${id}/actions`,
    AUDIT_LOGS: '/admin/audit-logs',
  },
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  EVENT_OWNER: 'event_owner',
  THEATER_OWNER: 'theater_owner',
  CUSTOMER: 'customer',
} as const;

// Booking statuses
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

// Event statuses
export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

// Ticket statuses
export const TICKET_STATUS = {
  VALID: 'valid',
  USED: 'used',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PROFILE: 'user_profile',
  THEME: 'theme',
  LANGUAGE: 'language',
  CART: 'booking_cart',
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EVENTS: '/events',
  EVENT_DETAIL: '/events/:id',
  THEATERS: '/theaters',
  THEATER_DETAIL: '/theaters/:id',
  BOOKINGS: '/bookings',
  BOOKING_DETAIL: '/bookings/:id',
  PROFILE: '/profile',
  ADMIN: '/admin',
  NOT_FOUND: '/404',
} as const;

// Validation rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-()]+$/,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
} as const;
