# API Service Layer

This directory contains the API service layer implementation for the Movie and Event Booking App frontend. The services provide a clean abstraction over HTTP API calls and integrate seamlessly with React Query for state management and caching.

## Architecture

The API service layer follows a modular architecture with the following components:

- **API Client**: Centralized HTTP client with authentication and error handling
- **Service Classes**: Domain-specific services for different API endpoints
- **React Query Hooks**: Custom hooks that integrate services with React Query
- **Type Definitions**: TypeScript interfaces for API requests and responses

## Services

### 1. Event Service (`eventService`)

Handles all event-related API operations:

```typescript
import { eventService } from '../services/event';

// Get events with filtering
const events = await eventService.getEvents({
  search: 'concert',
  category: 'music',
  location: 'New York'
});

// Create a new event
const newEvent = await eventService.createEvent({
  title: 'Summer Concert',
  description: 'Amazing summer concert',
  venue: 'Central Park',
  // ... other fields
});

// Get event analytics
const analytics = await eventService.getEventAnalytics('event-id');
```

**Features:**
- CRUD operations for events
- Search and filtering
- Ticket type management
- Event analytics
- Media upload/management
- Status management (publish, cancel, etc.)

### 2. Booking Service (`bookingService`)

Manages booking and payment operations:

```typescript
import { bookingService } from '../services/booking';

// Create a booking
const booking = await bookingService.createBooking({
  booking_type: 'event',
  event: 'event-id',
  tickets: [{ ticket_type: 'general', quantity: 2 }],
  payment_method: { type: 'stripe', token: 'tok_123' }
});

// Get seat availability
const availability = await bookingService.getSeatAvailability('showtime-id');

// Lock seats during selection
await bookingService.lockSeats('showtime-id', ['A1', 'A2'], 300);
```

**Features:**
- Booking creation and management
- Payment processing (Stripe integration)
- Seat selection and locking
- Ticket generation and validation
- Waitlist management
- Reviews and ratings
- Price calculations and discounts

### 3. User Service (`userService`)

Handles user profile and account management:

```typescript
import { userService } from '../services/user';

// Get user profile
const profile = await userService.getProfile();

// Update preferences
await userService.updatePreferences({
  favoriteGenres: ['action', 'comedy'],
  notificationSettings: { email: true, sms: false }
});

// Enable two-factor authentication
const { qr_code, backup_codes } = await userService.enableTwoFactor();
```

**Features:**
- Profile management
- Preferences and settings
- Notification preferences
- Account security (2FA, password changes)
- Favorites and wishlist
- Loyalty points and rewards
- Social features (friends, reviews)

## React Query Integration

The services are integrated with React Query through custom hooks that provide:

- **Automatic caching** with configurable stale times
- **Background refetching** to keep data fresh
- **Optimistic updates** for better UX
- **Error handling** with retry logic
- **Loading states** for UI feedback

### Query Hooks

```typescript
import { useEvents, useEvent, useCreateEvent } from '../hooks/useQuery';

function EventList() {
  // Fetch events with automatic caching and refetching
  const { data, isLoading, error } = useEvents({ 
    category: 'music',
    page_size: 10 
  });

  // Create event mutation with cache invalidation
  const createEvent = useCreateEvent({
    onSuccess: () => {
      // Events list will be automatically refetched
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.results.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### Available Hooks

**Event Hooks:**
- `useEvents(filters)` - Fetch events with filtering
- `useEvent(id)` - Fetch single event
- `useCreateEvent()` - Create event mutation
- `useUpdateEvent()` - Update event mutation
- `useDeleteEvent()` - Delete event mutation
- `useEventAnalytics(id)` - Fetch event analytics

**Booking Hooks:**
- `useBookings(filters)` - Fetch bookings
- `useBooking(id)` - Fetch single booking
- `useCreateBooking()` - Create booking mutation
- `useCancelBooking()` - Cancel booking mutation
- `useSeatAvailability(showtimeId)` - Real-time seat availability

**User Hooks:**
- `useUserProfile()` - Fetch user profile
- `useUpdateUserProfile()` - Update profile mutation
- `useUserPreferences()` - Fetch user preferences
- `useUpdateUserPreferences()` - Update preferences mutation

## Error Handling

The API client includes comprehensive error handling:

```typescript
// Automatic token refresh on 401 errors
// Retry logic for transient failures
// Structured error responses
interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}
```

## Authentication

All API requests automatically include authentication headers:

```typescript
// JWT tokens are automatically attached to requests
// Token refresh is handled transparently
// Authentication errors trigger logout flow
```

## Caching Strategy

React Query caching is configured with sensible defaults:

- **Events**: 5 minutes stale time (frequently changing)
- **User Profile**: 10 minutes stale time (rarely changes)
- **Seat Availability**: 30 seconds with auto-refetch (real-time data)
- **Analytics**: 2 minutes stale time (updated frequently)

## Testing

All services include comprehensive test suites:

```bash
# Run all service tests
npm test src/services/

# Run specific service tests
npm test src/services/event/__tests__/
npm test src/services/booking/__tests__/
npm test src/services/user/__tests__/

# Run React Query hooks tests
npm test src/hooks/__tests__/
```

## Usage Examples

See `src/examples/ApiServiceExample.tsx` for a complete example of how to use the API services in a React component.

## Configuration

The API client can be configured through environment variables:

```env
VITE_API_URL=http://localhost:8000/api
```

## Best Practices

1. **Use React Query hooks** instead of calling services directly in components
2. **Handle loading and error states** in your UI
3. **Leverage optimistic updates** for better user experience
4. **Use proper TypeScript types** for type safety
5. **Implement proper error boundaries** for graceful error handling
6. **Cache invalidation** should be handled automatically by mutations

## Future Enhancements

- WebSocket integration for real-time updates
- Offline support with service workers
- Request deduplication
- Advanced caching strategies
- Performance monitoring and analytics