import React, { useState, useEffect } from 'react';
import { useQuery } from '../../hooks/useQuery';
import { eventService } from '../../services/event';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { EventForm } from '../../components/events/EventForm';
import { EventAnalytics } from '../../components/events/EventAnalytics';
import type { Event } from '../../types/event';

const EventOwnerDashboard: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);

  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery(() => eventService.getEvents({ page_size: 50 }));

  const events = eventsData?.results || [];

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowCreateForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setSelectedEvent(null);
    refetchEvents();
  };

  const handleViewAnalytics = (eventId: string) => {
    setShowAnalytics(eventId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotalRevenue = () => {
    return events.reduce((total, event) => {
      return total + (event.ticket_types?.reduce((eventTotal, ticket) => {
        return eventTotal + (ticket.quantity_sold * ticket.price);
      }, 0) || 0);
    }, 0);
  };

  const calculateTotalTicketsSold = () => {
    return events.reduce((total, event) => {
      return total + (event.ticket_types?.reduce((eventTotal, ticket) => {
        return eventTotal + ticket.quantity_sold;
      }, 0) || 0);
    }, 0);
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (eventsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          Error loading events: {eventsError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your events and track performance</p>
        </div>
        <Button onClick={handleCreateEvent}>
          Create New Event
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Published Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(event => event.status === 'published').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${calculateTotalRevenue().toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tickets Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateTotalTicketsSold().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState
              title="No events yet"
              description="Create your first event to get started"
              action={
                <Button onClick={handleCreateEvent}>
                  Create Event
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        <Badge variant={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                        {!event.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{event.venue}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(event.start_datetime)} - {formatDate(event.end_datetime)}
                      </p>
                      {event.ticket_types && event.ticket_types.length > 0 && (
                        <div className="mt-3 flex gap-4 text-sm">
                          <span>
                            Tickets Sold: {event.ticket_types.reduce((sum, tt) => sum + tt.quantity_sold, 0)}
                          </span>
                          <span>
                            Revenue: ${event.ticket_types.reduce((sum, tt) => sum + (tt.quantity_sold * tt.price), 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAnalytics(event.id)}
                      >
                        Analytics
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEvent(event)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Form Modal */}
      {showCreateForm && (
        <EventForm
          event={selectedEvent}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <EventAnalytics
          eventId={showAnalytics}
          onClose={() => setShowAnalytics(null)}
        />
      )}
    </div>
  );
};

export default EventOwnerDashboard;