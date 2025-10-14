import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../ui/Badge';
import { eventService } from '../../services/event';
import { useQuery } from '../../hooks/useQuery';
import type { EventAnalytics as EventAnalyticsType } from '../../types/event';

interface EventAnalyticsProps {
  eventId: string;
  onClose: () => void;
}

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export const EventAnalytics: React.FC<EventAnalyticsProps> = ({ eventId, onClose }) => {
  const [dateRange, setDateRange] = useState('30');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Calculate date range
  useEffect(() => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    
    let from = '';
    if (dateRange !== 'all') {
      const daysAgo = new Date(now);
      daysAgo.setDate(now.getDate() - parseInt(dateRange));
      from = daysAgo.toISOString().split('T')[0];
    }
    
    setDateFrom(from);
    setDateTo(to);
  }, [dateRange]);

  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery(() => 
    eventService.getEventAnalytics(eventId, dateFrom || undefined, dateTo || undefined),
    [eventId, dateFrom, dateTo]
  );

  const {
    data: event,
    loading: eventLoading,
  } = useQuery(() => eventService.getEvent(eventId));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getConversionRateColor = (rate: number) => {
    if (rate >= 0.1) return 'text-green-600';
    if (rate >= 0.05) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (eventLoading || analyticsLoading) {
    return (
      <Modal open={true} onClose={onClose} size="xl">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Modal>
    );
  }

  if (analyticsError) {
    return (
      <Modal open={true} onClose={onClose} size="xl">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Event Analytics</h2>
        </ModalHeader>
        <div className="p-6">
          <div className="text-center text-red-600">
            Error loading analytics: {analyticsError.message}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={true} onClose={onClose} size="xl">
      <ModalHeader>
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-xl font-semibold">Event Analytics</h2>
            {event && (
              <p className="text-gray-600 mt-1">{event.title}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={dateRange}
              onChange={setDateRange}
              options={DATE_RANGE_OPTIONS}
              className="w-40"
            />
            <Button variant="outline" onClick={refetchAnalytics}>
              Refresh
            </Button>
          </div>
        </div>
      </ModalHeader>

      <div className="p-6 space-y-6">
        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_bookings}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analytics.total_revenue)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Tickets Sold
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.tickets_sold}</div>
                  <div className="text-sm text-gray-500">
                    of {analytics.tickets_available} available
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getConversionRateColor(analytics.conversion_rate)}`}>
                    {formatPercentage(analytics.conversion_rate)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ticket Sales Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Sales Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Sold: {analytics.tickets_sold}</span>
                    <span>Available: {analytics.tickets_available - analytics.tickets_sold}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${(analytics.tickets_sold / analytics.tickets_available) * 100}%`
                      }}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    {((analytics.tickets_sold / analytics.tickets_available) * 100).toFixed(1)}% sold
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Popular Ticket Types */}
            {analytics.popular_ticket_types && analytics.popular_ticket_types.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Popular Ticket Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.popular_ticket_types.map((ticketType, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <span className="font-medium">{ticketType.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{ticketType.sold} sold</div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(ticketType.revenue)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Trends Chart */}
            {analytics.booking_trends && analytics.booking_trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Booking Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Simple bar chart representation */}
                    <div className="grid gap-2">
                      {analytics.booking_trends.slice(-14).map((trend, index) => {
                        const maxBookings = Math.max(...analytics.booking_trends.map(t => t.bookings));
                        const width = maxBookings > 0 ? (trend.bookings / maxBookings) * 100 : 0;
                        
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-16 text-xs text-gray-600">
                              {formatDate(trend.date)}
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                              <div
                                className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${Math.max(width, 5)}%` }}
                              >
                                {trend.bookings > 0 && (
                                  <span className="text-xs text-white font-medium">
                                    {trend.bookings}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-20 text-xs text-gray-600 text-right">
                              {formatCurrency(trend.revenue)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {analytics.booking_trends.length > 14 && (
                      <div className="text-center text-sm text-gray-500">
                        Showing last 14 days
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {analytics.conversion_rate < 0.05 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="font-medium text-yellow-800">Low Conversion Rate</div>
                      <div className="text-yellow-700">
                        Consider improving your event description, adding more media, or adjusting pricing.
                      </div>
                    </div>
                  )}
                  
                  {analytics.tickets_sold / analytics.tickets_available > 0.8 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-800">High Demand</div>
                      <div className="text-green-700">
                        Your event is selling well! Consider creating similar events in the future.
                      </div>
                    </div>
                  )}
                  
                  {analytics.tickets_sold / analytics.tickets_available < 0.3 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="font-medium text-blue-800">Promotion Opportunity</div>
                      <div className="text-blue-700">
                        Consider running promotions or increasing marketing efforts to boost sales.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
};