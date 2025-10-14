import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventService } from '../eventService';
import { apiClient } from '../../api';
import type { Event, CreateEventData, UpdateEventData, EventFilters } from '../../../types/event';

// Mock the API client
vi.mock('../../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('EventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getEvents', () => {
    it('should fetch events without filters', async () => {
      const mockResponse = {
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

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await eventService.getEvents();

      expect(mockApiClient.get).toHaveBeenCalledWith('/events/');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch events with filters', async () => {
      const filters: EventFilters = {
        search: 'concert',
        category: 'music',
        location: 'New York',
        page: 1,
        page_size: 10,
      };

      const mockResponse = {
        results: [],
        count: 0,
        next: null,
        previous: null,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await eventService.getEvents(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/events/?search=concert&category=music&location=New+York&page=1&page_size=10'
      );
    });

    it('should handle empty filters', async () => {
      const filters: EventFilters = {
        search: '',
        category: undefined,
        page: undefined,
      };

      mockApiClient.get.mockResolvedValue({ results: [], count: 0, next: null, previous: null });

      await eventService.getEvents(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/events/');
    });
  });

  describe('getEvent', () => {
    it('should fetch a single event by id', async () => {
      const mockEvent: Event = {
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
        status: 'published',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValue(mockEvent);

      const result = await eventService.getEvent('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/events/1/');
      expect(result).toEqual(mockEvent);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const createData: CreateEventData = {
        title: 'New Event',
        description: 'New Description',
        venue: 'New Venue',
        address: 'New Address',
        category: 'music',
        start_datetime: '2024-01-15T19:00:00Z',
        end_datetime: '2024-01-15T22:00:00Z',
      };

      const mockCreatedEvent: Event = {
        id: '2',
        owner: 'user1',
        ...createData,
        media: [],
        status: 'draft',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue(mockCreatedEvent);

      const result = await eventService.createEvent(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/events/', createData);
      expect(result).toEqual(mockCreatedEvent);
    });
  });

  describe('updateEvent', () => {
    it('should update an existing event', async () => {
      const updateData: UpdateEventData = {
        title: 'Updated Event',
        status: 'published',
      };

      const mockUpdatedEvent: Event = {
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
        status: 'published',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      mockApiClient.patch.mockResolvedValue(mockUpdatedEvent);

      const result = await eventService.updateEvent('1', updateData);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/events/1/', updateData);
      expect(result).toEqual(mockUpdatedEvent);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await eventService.deleteEvent('1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/events/1/');
    });
  });

  describe('getEventAnalytics', () => {
    it('should fetch event analytics without date range', async () => {
      const mockAnalytics = {
        total_bookings: 100,
        total_revenue: 5000,
        tickets_sold: 150,
        tickets_available: 50,
        conversion_rate: 0.75,
        popular_ticket_types: [],
        booking_trends: [],
      };

      mockApiClient.get.mockResolvedValue(mockAnalytics);

      const result = await eventService.getEventAnalytics('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/events/1/analytics/');
      expect(result).toEqual(mockAnalytics);
    });

    it('should fetch event analytics with date range', async () => {
      const mockAnalytics = {
        total_bookings: 50,
        total_revenue: 2500,
        tickets_sold: 75,
        tickets_available: 25,
        conversion_rate: 0.75,
        popular_ticket_types: [],
        booking_trends: [],
      };

      mockApiClient.get.mockResolvedValue(mockAnalytics);

      await eventService.getEventAnalytics('1', '2024-01-01', '2024-01-31');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/events/1/analytics/?date_from=2024-01-01&date_to=2024-01-31'
      );
    });
  });

  describe('status management', () => {
    it('should publish an event', async () => {
      const mockEvent: Event = {
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
        status: 'published',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApiClient.patch.mockResolvedValue(mockEvent);

      const result = await eventService.publishEvent('1');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/events/1/', { status: 'published' });
      expect(result.status).toBe('published');
    });

    it('should cancel an event', async () => {
      const mockEvent: Event = {
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
        status: 'cancelled',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockApiClient.patch.mockResolvedValue(mockEvent);

      const result = await eventService.cancelEvent('1');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/events/1/', { status: 'cancelled' });
      expect(result.status).toBe('cancelled');
    });
  });

  describe('media management', () => {
    it('should upload event media', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = { url: 'https://example.com/test.jpg' };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await eventService.uploadEventMedia('1', mockFile);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/events/1/media/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should delete event media', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await eventService.deleteEventMedia('1', 'https://example.com/test.jpg');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/events/1/media/', {
        data: { url: 'https://example.com/test.jpg' },
      });
    });
  });

  describe('utility methods', () => {
    it('should get popular events', async () => {
      const mockResponse = {
        results: [
          { id: '1', title: 'Popular Event 1' },
          { id: '2', title: 'Popular Event 2' },
        ],
        count: 2,
        next: null,
        previous: null,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await eventService.getPopularEvents(5);

      expect(mockApiClient.get).toHaveBeenCalledWith('/events/?page_size=5');
      expect(result).toEqual(mockResponse.results);
    });

    it('should get upcoming events', async () => {
      const mockResponse = {
        results: [
          { id: '1', title: 'Upcoming Event 1' },
          { id: '2', title: 'Upcoming Event 2' },
        ],
        count: 2,
        next: null,
        previous: null,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await eventService.getUpcomingEvents(10);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/events/?date_from=')
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page_size=10')
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=published')
      );
      expect(result).toEqual(mockResponse.results);
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(eventService.getEvent('1')).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApiClient.post.mockRejectedValue(networkError);

      const createData: CreateEventData = {
        title: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        address: 'Test Address',
        category: 'music',
        start_datetime: '2024-01-15T19:00:00Z',
        end_datetime: '2024-01-15T22:00:00Z',
      };

      await expect(eventService.createEvent(createData)).rejects.toThrow('Network Error');
    });
  });
});