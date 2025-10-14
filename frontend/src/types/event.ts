export interface Event {
  id: string;
  owner: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  category: string;
  start_datetime: string;
  end_datetime: string;
  media: string[];
  status: 'draft' | 'published' | 'cancelled';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ticket_types?: TicketType[];
}

export interface TicketType {
  id: string;
  event: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  description: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  venue: string;
  address: string;
  category: string;
  start_datetime: string;
  end_datetime: string;
  media?: string[];
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: 'draft' | 'published' | 'cancelled';
  is_active?: boolean;
}

export interface CreateTicketTypeData {
  name: string;
  price: number;
  quantity_available: number;
  description?: string;
}

export interface EventFilters {
  search?: string;
  category?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
  status?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface EventAnalytics {
  total_bookings: number;
  total_revenue: number;
  tickets_sold: number;
  tickets_available: number;
  conversion_rate: number;
  popular_ticket_types: Array<{
    name: string;
    sold: number;
    revenue: number;
  }>;
  booking_trends: Array<{
    date: string;
    bookings: number;
    revenue: number;
  }>;
}