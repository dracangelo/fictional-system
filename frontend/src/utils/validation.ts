import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
const urlRegex = /^https?:\/\/.+/;
const priceRegex = /^\d+(\.\d{1,2})?$/;

// Base schemas for reuse
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const phoneSchema = z
  .string()
  .regex(phoneRegex, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

export const urlSchema = z
  .string()
  .regex(urlRegex, 'Please enter a valid URL starting with http:// or https://')
  .optional()
  .or(z.literal(''));

export const priceSchema = z
  .string()
  .regex(priceRegex, 'Please enter a valid price (e.g., 10.99)')
  .transform((val) => parseFloat(val));

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters'),
    role: z.enum(['customer', 'event_owner', 'theater_owner'], {
      required_error: 'Please select a role',
    }),
    phone: phoneSchema,
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Event management schemas
export const eventSchema = z.object({
  title: z
    .string()
    .min(1, 'Event title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  venue: z
    .string()
    .min(1, 'Venue is required')
    .max(200, 'Venue name must be less than 200 characters'),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters'),
  category: z
    .string()
    .min(1, 'Category is required'),
  startDateTime: z
    .string()
    .min(1, 'Start date and time is required')
    .refine((val) => new Date(val) > new Date(), {
      message: 'Start date must be in the future',
    }),
  endDateTime: z
    .string()
    .min(1, 'End date and time is required'),
  capacity: z
    .number()
    .min(1, 'Capacity must be at least 1')
    .max(100000, 'Capacity cannot exceed 100,000'),
  isPublic: z.boolean().default(true),
  allowWaitlist: z.boolean().default(false),
}).refine((data) => new Date(data.endDateTime) > new Date(data.startDateTime), {
  message: 'End date must be after start date',
  path: ['endDateTime'],
});

export const ticketTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Ticket type name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  price: priceSchema,
  quantity: z
    .number()
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity cannot exceed 10,000'),
  maxPerOrder: z
    .number()
    .min(1, 'Max per order must be at least 1')
    .max(20, 'Max per order cannot exceed 20')
    .optional(),
  saleStartDate: z.string().optional(),
  saleEndDate: z.string().optional(),
});

// Theater management schemas
export const theaterSchema = z.object({
  name: z
    .string()
    .min(1, 'Theater name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must be less than 200 characters'),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters'),
  state: z
    .string()
    .min(1, 'State is required')
    .max(100, 'State must be less than 100 characters'),
  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  phone: phoneSchema,
  email: emailSchema.optional(),
  website: urlSchema,
  screens: z
    .number()
    .min(1, 'Must have at least 1 screen')
    .max(50, 'Cannot have more than 50 screens'),
  totalSeats: z
    .number()
    .min(1, 'Must have at least 1 seat')
    .max(5000, 'Cannot have more than 5,000 seats'),
});

export const movieSchema = z.object({
  title: z
    .string()
    .min(1, 'Movie title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be less than 200 characters'),
  genre: z
    .string()
    .min(1, 'Genre is required'),
  duration: z
    .number()
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration cannot exceed 600 minutes'),
  rating: z
    .string()
    .min(1, 'Rating is required'),
  director: z
    .string()
    .min(1, 'Director is required')
    .max(100, 'Director name must be less than 100 characters'),
  cast: z
    .string()
    .min(1, 'Cast information is required')
    .max(1000, 'Cast information must be less than 1000 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  releaseDate: z
    .string()
    .min(1, 'Release date is required'),
  posterUrl: urlSchema,
  trailerUrl: urlSchema,
});

export const showtimeSchema = z.object({
  movieId: z.string().min(1, 'Movie selection is required'),
  screenNumber: z
    .number()
    .min(1, 'Screen number must be at least 1'),
  startTime: z
    .string()
    .min(1, 'Start time is required')
    .refine((val) => new Date(val) > new Date(), {
      message: 'Showtime must be in the future',
    }),
  basePrice: priceSchema,
  vipPrice: priceSchema.optional(),
  discountPrice: priceSchema.optional(),
});

// Booking schemas
export const bookingSchema = z.object({
  eventId: z.string().optional(),
  showtimeId: z.string().optional(),
  ticketTypeId: z.string().optional(),
  quantity: z
    .number()
    .min(1, 'Must select at least 1 ticket')
    .max(20, 'Cannot book more than 20 tickets at once'),
  selectedSeats: z.array(z.string()).optional(),
  customerInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: emailSchema,
    phone: phoneSchema,
  }),
  specialRequests: z
    .string()
    .max(500, 'Special requests must be less than 500 characters')
    .optional(),
}).refine((data) => data.eventId || data.showtimeId, {
  message: 'Must select either an event or showtime',
  path: ['eventId'],
});

// Payment schemas
export const paymentSchema = z.object({
  cardNumber: z
    .string()
    .min(1, 'Card number is required')
    .regex(/^\d{13,19}$/, 'Please enter a valid card number'),
  expiryMonth: z
    .string()
    .min(1, 'Expiry month is required')
    .regex(/^(0[1-9]|1[0-2])$/, 'Please enter a valid month (01-12)'),
  expiryYear: z
    .string()
    .min(1, 'Expiry year is required')
    .regex(/^\d{4}$/, 'Please enter a valid year'),
  cvv: z
    .string()
    .min(1, 'CVV is required')
    .regex(/^\d{3,4}$/, 'Please enter a valid CVV'),
  cardholderName: z
    .string()
    .min(1, 'Cardholder name is required')
    .max(100, 'Name must be less than 100 characters'),
  billingAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  }),
});

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: z.string().optional(),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    marketingEmails: z.boolean().default(false),
    favoriteGenres: z.array(z.string()).optional(),
    preferredLocations: z.array(z.string()).optional(),
  }).optional(),
});

// Search and filter schemas
export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  sortBy: z.enum(['date', 'price', 'popularity', 'rating']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmFormData = z.infer<typeof passwordResetConfirmSchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type TicketTypeFormData = z.infer<typeof ticketTypeSchema>;
export type TheaterFormData = z.infer<typeof theaterSchema>;
export type MovieFormData = z.infer<typeof movieSchema>;
export type ShowtimeFormData = z.infer<typeof showtimeSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type SearchFiltersData = z.infer<typeof searchFiltersSchema>;

// Validation helper functions
export const validateField = (schema: z.ZodSchema, value: any) => {
  try {
    schema.parse(value);
    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Invalid value' };
    }
    return { isValid: false, error: 'Validation error' };
  }
};

export const validateForm = (schema: z.ZodSchema, data: any) => {
  try {
    const result = schema.parse(data);
    return { isValid: true, data: result, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, data: null, errors };
    }
    return { isValid: false, data: null, errors: { general: 'Validation error' } };
  }
};