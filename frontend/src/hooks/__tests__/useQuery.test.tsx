import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEvents,
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useBookings,
  useCreateBooking,
  useUserProfile,
  useUpdateUserProfile,
} from '../useQuery';
import { eventService } from '../../services/event/eventService';
import { bookingService } from '../../services/booking/bookingService';
import { userService } from '../../services/user/userService';

// Mock the services
vi.mock('../../services/event/eventService');
vi.mock('../../services/booking/bookingService');
vi.mock('../../services/user/userService');

const mockEventService = vi.mocked(eventService);
const mockBookingService = vi.mocked(bookingService);
const mockUserService = vi.mocked(userService);

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Wrapper component for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useQuery hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  describe('Event hooks', () => {
    describe('useEvents', () => {
      it('should fetch events successfully', async () => {
        const mockEvents = {
          results: [
            {
              id: '1',
              title: 'Test Event',
              description: 'Test Description',
              venue: 'Test Venue',
              start_datetime: '2024-01-15T19:00:00Z',
            },
          ],
          count: 1,
          next: null,
          previous: null,
        };

        mockEventService.getEvents.mockResolvedValue(mockEvents);

        const { result } = renderHook(() => useEvents(), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockEvents);
        expect(mockEventService.getEvents).toHaveBeenCalledWith(undefined);
      });

      it('should fetch events with filters', async () => {
        const filters = { search: 'concert', category: 'music' };
        const mockEvents = {
          results: [],
          count: 0,
          next: null,
          previous: null,
        };

        mockEventService.getEvents.mockResolvedValue(mockEvents);

        const { result } = renderHook(() => useEvents(filters), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockEventService.getEvents).toHaveBeenCalledWith(filters);
      });

      it('should handle errors', async () => {
        const mockError = new Error('Failed to fetch events');
        mockEventService.getEvents.mockRejectedValue(mockError);

        const { result } = renderHook(() => useEvents(), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toEqual(mockError);
      });
    });

    describe('useEvent', () => {
      it('should fetch single event successfully', async () => {
        const mockEvent = {
          id: '1',
          owner: 'user1',
          title: 'Test Event',
          description: 'Test Description',
          venue: 'Test Venue',
          address: 'Test Address',
          category: 'music',
          start_datetime: '2024-01-15T19:00:00Z',
          end_datetime: '2024-01-15T22:00:00Z',
          media: [],
          status: 'published' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockEventService.getEvent.mockResolvedValue(mockEvent);

        const { result } = renderHook(() => useEvent('1'), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockEvent);
        expect(mockEventService.getEvent).toHaveBeenCalledWith('1');
      });

      it('should not fetch when id is empty', () => {
        const { result } = renderHook(() => useEvent(''), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.fetchStatus).toBe('idle');
        expect(mockEventService.getEvent).not.toHaveBeenCalled();
      });
    });

    describe('useCreateEvent', () => {
      it('should create event successfully', async () => {
        const createData = {
          title: 'New Event',
          description: 'New Description',
          venue: 'New Venue',
          address: 'New Address',
          category: 'music',
          start_datetime: '2024-01-15T19:00:00Z',
          end_datetime: '2024-01-15T22:00:00Z',
        };

        const mockCreatedEvent = {
          id: '2',
          owner: 'user1',
          ...createData,
          media: [],
          status: 'draft' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockEventService.createEvent.mockResolvedValue(mockCreatedEvent);

        const { result } = renderHook(() => useCreateEvent(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(createData);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockCreatedEvent);
        expect(mockEventService.createEvent).toHaveBeenCalledWith(createData, expect.any(Object));
      });

      it('should handle creation errors', async () => {
        const createData = {
          title: 'New Event',
          description: 'New Description',
          venue: 'New Venue',
          address: 'New Address',
          category: 'music',
          start_datetime: '2024-01-15T19:00:00Z',
          end_datetime: '2024-01-15T22:00:00Z',
        };

        const mockError = new Error('Validation failed');
        mockEventService.createEvent.mockRejectedValue(mockError);

        const { result } = renderHook(() => useCreateEvent(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(createData);

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toEqual(mockError);
      });
    });

    describe('useUpdateEvent', () => {
      it('should update event successfully', async () => {
        const updateData = { title: 'Updated Event', status: 'published' as const };
        const mockUpdatedEvent = {
          id: '1',
          owner: 'user1',
          title: 'Updated Event',
          description: 'Test Description',
          venue: 'Test Venue',
          address: 'Test Address',
          category: 'music',
          start_datetime: '2024-01-15T19:00:00Z',
          end_datetime: '2024-01-15T22:00:00Z',
          media: [],
          status: 'published' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        };

        mockEventService.updateEvent.mockResolvedValue(mockUpdatedEvent);

        const { result } = renderHook(() => useUpdateEvent(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate({ id: '1', data: updateData });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockUpdatedEvent);
        expect(mockEventService.updateEvent).toHaveBeenCalledWith('1', updateData);
      });
    });
  });

  describe('Booking hooks', () => {
    describe('useBookings', () => {
      it('should fetch bookings successfully', async () => {
        const mockBookings = {
          results: [
            {
              id: '1',
              customer: 'user1',
              booking_type: 'event' as const,
              booking_reference: 'BK001',
              total_amount: 100,
              payment_status: 'completed' as const,
              booking_status: 'confirmed' as const,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          count: 1,
          next: null,
          previous: null,
        };

        mockBookingService.getBookings.mockResolvedValue(mockBookings);

        const { result } = renderHook(() => useBookings(), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockBookings);
        expect(mockBookingService.getBookings).toHaveBeenCalledWith(undefined);
      });
    });

    describe('useCreateBooking', () => {
      it('should create booking successfully', async () => {
        const createData = {
          booking_type: 'event' as const,
          event: 'event1',
          tickets: [{ ticket_type: 'general', quantity: 2 }],
          payment_method: {
            type: 'stripe' as const,
            token: 'tok_123',
          },
        };

        const mockCreatedBooking = {
          id: '1',
          customer: 'user1',
          booking_type: 'event' as const,
          event: 'event1',
          booking_reference: 'BK001',
          total_amount: 100,
          payment_status: 'completed' as const,
          booking_status: 'confirmed' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockBookingService.createBooking.mockResolvedValue(mockCreatedBooking);

        const { result } = renderHook(() => useCreateBooking(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(createData);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockCreatedBooking);
        expect(mockBookingService.createBooking).toHaveBeenCalledWith(createData, expect.any(Object));
      });
    });
  });

  describe('User hooks', () => {
    describe('useUserProfile', () => {
      it('should fetch user profile successfully', async () => {
        const mockProfile = {
          id: 'user1',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer' as const,
          preferences: {
            notificationSettings: {
              email: true,
              sms: false,
              push: true,
            },
            favoriteGenres: ['action', 'comedy'],
            preferredLocations: ['New York'],
            accessibilityNeeds: [],
          },
        };

        mockUserService.getProfile.mockResolvedValue(mockProfile);

        const { result } = renderHook(() => useUserProfile(), {
          wrapper: createWrapper(queryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockProfile);
        expect(mockUserService.getProfile).toHaveBeenCalled();
      });
    });

    describe('useUpdateUserProfile', () => {
      it('should update user profile successfully', async () => {
        const updateData = {
          firstName: 'Jane',
          lastName: 'Smith',
        };

        const mockUpdatedProfile = {
          id: 'user1',
          email: 'user@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'customer' as const,
          preferences: {
            notificationSettings: {
              email: true,
              sms: false,
              push: true,
            },
            favoriteGenres: ['action', 'comedy'],
            preferredLocations: ['New York'],
            accessibilityNeeds: [],
          },
        };

        mockUserService.updateProfile.mockResolvedValue(mockUpdatedProfile);

        const { result } = renderHook(() => useUpdateUserProfile(), {
          wrapper: createWrapper(queryClient),
        });

        result.current.mutate(updateData);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockUpdatedProfile);
        expect(mockUserService.updateProfile).toHaveBeenCalledWith(updateData, expect.any(Object));
      });
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate events cache when creating event', async () => {
      const createData = {
        title: 'New Event',
        description: 'New Description',
        venue: 'New Venue',
        address: 'New Address',
        category: 'music',
        start_datetime: '2024-01-15T19:00:00Z',
        end_datetime: '2024-01-15T22:00:00Z',
      };

      const mockCreatedEvent = {
        id: '2',
        owner: 'user1',
        ...createData,
        media: [],
        status: 'draft' as const,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockEventService.createEvent.mockResolvedValue(mockCreatedEvent);

      // First, populate the cache with events
      mockEventService.getEvents.mockResolvedValue({
        results: [],
        count: 0,
        next: null,
        previous: null,
      });

      const { result: eventsResult } = renderHook(() => useEvents(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(eventsResult.current.isSuccess).toBe(true);
      });

      // Now create an event
      const { result: createResult } = renderHook(() => useCreateEvent(), {
        wrapper: createWrapper(queryClient),
      });

      createResult.current.mutate(createData);

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      // The events query should be invalidated and refetched
      expect(mockEventService.getEvents).toHaveBeenCalledTimes(2);
    });
  });
});