import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { eventService } from '../services/event/eventService';
import { bookingService } from '../services/booking/bookingService';
import { userService } from '../services/user/userService';
import type { ApiError } from '../types/api';
import type { Event, EventFilters, EventAnalytics, CreateEventData, UpdateEventData } from '../types/event';
import type { Booking, BookingFilters, CreateBookingData } from '../types/booking';
import type { UserProfile, UpdateProfileData, UserPreferences } from '../services/user/userService';

// Query Keys
export const queryKeys = {
  // Events
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  eventAnalytics: (id: string) => ['events', id, 'analytics'] as const,
  eventTicketTypes: (id: string) => ['events', id, 'ticket-types'] as const,
  
  // Bookings
  bookings: ['bookings'] as const,
  booking: (id: string) => ['bookings', id] as const,
  bookingTickets: (id: string) => ['bookings', id, 'tickets'] as const,
  userBookings: (userId?: string) => ['bookings', 'user', userId] as const,
  
  // User
  userProfile: ['user', 'profile'] as const,
  userPreferences: ['user', 'preferences'] as const,
  userStats: ['user', 'stats'] as const,
  userActivity: ['user', 'activity'] as const,
  
  // Seat availability
  seatAvailability: (showtimeId: string) => ['seats', showtimeId] as const,
} as const;

// Event Hooks
export function useEvents(filters?: EventFilters, options?: UseQueryOptions<any, ApiError>) {
  return useQuery({
    queryKey: [...queryKeys.events, filters],
    queryFn: () => eventService.getEvents(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useEvent(id: string, options?: UseQueryOptions<Event, ApiError>) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => eventService.getEvent(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useEventAnalytics(id: string, dateFrom?: string, dateTo?: string, options?: UseQueryOptions<EventAnalytics, ApiError>) {
  return useQuery({
    queryKey: [...queryKeys.eventAnalytics(id), dateFrom, dateTo],
    queryFn: () => eventService.getEventAnalytics(id, dateFrom, dateTo),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

export function useCreateEvent(options?: UseMutationOptions<Event, ApiError, CreateEventData>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: eventService.createEvent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.setQueryData(queryKeys.event(data.id), data);
    },
    ...options,
  });
}

export function useUpdateEvent(options?: UseMutationOptions<Event, ApiError, { id: string; data: UpdateEventData }>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => eventService.updateEvent(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.setQueryData(queryKeys.event(data.id), data);
    },
    ...options,
  });
}

export function useDeleteEvent(options?: UseMutationOptions<void, ApiError, string>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: eventService.deleteEvent,
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.removeQueries({ queryKey: queryKeys.event(eventId) });
    },
    ...options,
  });
}

// Booking Hooks
export function useBookings(filters?: BookingFilters, options?: UseQueryOptions<any, ApiError>) {
  return useQuery({
    queryKey: [...queryKeys.bookings, filters],
    queryFn: () => bookingService.getBookings(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

export function useBooking(id: string, options?: UseQueryOptions<Booking, ApiError>) {
  return useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: () => bookingService.getBooking(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useUserBookings(userId?: string, filters?: BookingFilters, options?: UseQueryOptions<any, ApiError>) {
  return useQuery({
    queryKey: [...queryKeys.userBookings(userId), filters],
    queryFn: () => bookingService.getUserBookings(userId, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

export function useCreateBooking(options?: UseMutationOptions<Booking, ApiError, CreateBookingData>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bookingService.createBooking,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.userBookings() });
      queryClient.setQueryData(queryKeys.booking(data.id), data);
    },
    ...options,
  });
}

export function useCancelBooking(options?: UseMutationOptions<Booking, ApiError, { id: string; data?: any }>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => bookingService.cancelBooking(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.userBookings() });
      queryClient.setQueryData(queryKeys.booking(data.id), data);
    },
    ...options,
  });
}

// Seat Availability Hook
export function useSeatAvailability(showtimeId: string, options?: UseQueryOptions<any, ApiError>) {
  return useQuery({
    queryKey: queryKeys.seatAvailability(showtimeId),
    queryFn: () => bookingService.getSeatAvailability(showtimeId),
    enabled: !!showtimeId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    ...options,
  });
}

// User Hooks
export function useUserProfile(options?: UseQueryOptions<UserProfile, ApiError>) {
  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: userService.getProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useUpdateUserProfile(options?: UseMutationOptions<UserProfile, ApiError, UpdateProfileData>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.userProfile, data);
    },
    ...options,
  });
}

export function useUserPreferences(options?: UseQueryOptions<UserPreferences, ApiError>) {
  return useQuery({
    queryKey: queryKeys.userPreferences,
    queryFn: userService.getPreferences,
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

export function useUpdateUserPreferences(options?: UseMutationOptions<UserPreferences, ApiError, Partial<UserPreferences>>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.userPreferences, data);
    },
    ...options,
  });
}

export function useUserStats(options?: UseQueryOptions<any, ApiError>) {
  return useQuery({
    queryKey: queryKeys.userStats,
    queryFn: userService.getUserStats,
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Utility hooks for common patterns
export function useInfiniteEvents(filters?: EventFilters) {
  // This would be implemented with useInfiniteQuery for pagination
  // Placeholder for now
  return useEvents(filters);
}

export function useSearchEvents(query: string, filters?: Omit<EventFilters, 'search'>) {
  return useEvents({ ...filters, search: query }, {
    enabled: query.length > 2, // Only search when query is at least 3 characters
  });
}

export function useUpcomingBookings(userId?: string) {
  return useQuery({
    queryKey: ['bookings', 'upcoming', userId],
    queryFn: () => bookingService.getUpcomingBookings(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePastBookings(userId?: string) {
  return useQuery({
    queryKey: ['bookings', 'past', userId],
    queryFn: () => bookingService.getPastBookings(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}