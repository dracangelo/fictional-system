import { apiClient } from '../api';
import type { PaginatedResponse } from '../../types/api';
import type {
  Event,
  CreateEventData,
  UpdateEventData,
  EventFilters,
  EventAnalytics,
  TicketType,
  CreateTicketTypeData,
} from '../../types/event';

class EventService {
  // Event CRUD operations
  async getEvents(filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/events/?${queryString}` : '/events/';
    
    return apiClient.get<PaginatedResponse<Event>>(url);
  }

  async getEvent(id: string): Promise<Event> {
    return apiClient.get<Event>(`/events/${id}/`);
  }

  async createEvent(data: CreateEventData): Promise<Event> {
    return apiClient.post<Event>('/events/', data);
  }

  async updateEvent(id: string, data: UpdateEventData): Promise<Event> {
    return apiClient.patch<Event>(`/events/${id}/`, data);
  }

  async deleteEvent(id: string): Promise<void> {
    return apiClient.delete<void>(`/events/${id}/`);
  }

  // Ticket type management
  async getTicketTypes(eventId: string): Promise<TicketType[]> {
    return apiClient.get<TicketType[]>(`/events/${eventId}/ticket-types/`);
  }

  async createTicketType(eventId: string, data: CreateTicketTypeData): Promise<TicketType> {
    return apiClient.post<TicketType>(`/events/${eventId}/ticket-types/`, data);
  }

  async updateTicketType(eventId: string, ticketTypeId: string, data: Partial<CreateTicketTypeData>): Promise<TicketType> {
    return apiClient.patch<TicketType>(`/events/${eventId}/ticket-types/${ticketTypeId}/`, data);
  }

  async deleteTicketType(eventId: string, ticketTypeId: string): Promise<void> {
    return apiClient.delete<void>(`/events/${eventId}/ticket-types/${ticketTypeId}/`);
  }

  // Event analytics
  async getEventAnalytics(eventId: string, dateFrom?: string, dateTo?: string): Promise<EventAnalytics> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    const queryString = params.toString();
    const url = queryString 
      ? `/events/${eventId}/analytics/?${queryString}` 
      : `/events/${eventId}/analytics/`;
    
    return apiClient.get<EventAnalytics>(url);
  }

  // Search and filtering
  async searchEvents(query: string, filters?: Omit<EventFilters, 'search'>): Promise<PaginatedResponse<Event>> {
    return this.getEvents({ ...filters, search: query });
  }

  async getEventsByCategory(category: string, filters?: Omit<EventFilters, 'category'>): Promise<PaginatedResponse<Event>> {
    return this.getEvents({ ...filters, category });
  }

  async getEventsByLocation(location: string, filters?: Omit<EventFilters, 'location'>): Promise<PaginatedResponse<Event>> {
    return this.getEvents({ ...filters, location });
  }

  async getEventsByDateRange(dateFrom: string, dateTo: string, filters?: Omit<EventFilters, 'date_from' | 'date_to'>): Promise<PaginatedResponse<Event>> {
    return this.getEvents({ ...filters, date_from: dateFrom, date_to: dateTo });
  }

  // Event status management
  async publishEvent(id: string): Promise<Event> {
    return this.updateEvent(id, { status: 'published' });
  }

  async unpublishEvent(id: string): Promise<Event> {
    return this.updateEvent(id, { status: 'draft' });
  }

  async cancelEvent(id: string): Promise<Event> {
    return this.updateEvent(id, { status: 'cancelled' });
  }

  async activateEvent(id: string): Promise<Event> {
    return this.updateEvent(id, { is_active: true });
  }

  async deactivateEvent(id: string): Promise<Event> {
    return this.updateEvent(id, { is_active: false });
  }

  // Media management
  async uploadEventMedia(eventId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post<{ url: string }>(`/events/${eventId}/media/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteEventMedia(eventId: string, mediaUrl: string): Promise<void> {
    return apiClient.delete<void>(`/events/${eventId}/media/`, {
      data: { url: mediaUrl },
    });
  }

  // Utility methods
  async getPopularEvents(limit: number = 10): Promise<Event[]> {
    const response = await this.getEvents({ page_size: limit });
    return response.results;
  }

  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    const now = new Date().toISOString();
    const response = await this.getEvents({ 
      date_from: now, 
      page_size: limit,
      status: 'published'
    });
    return response.results;
  }

  async getFeaturedEvents(limit: number = 5): Promise<Event[]> {
    // This would typically be a separate endpoint for featured events
    // For now, we'll get published events
    const response = await this.getEvents({ 
      status: 'published', 
      page_size: limit 
    });
    return response.results;
  }
}

export const eventService = new EventService();