import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { TheaterService } from '../../services/theater'
import { useQuery } from '@tanstack/react-query'
import type { Theater } from '../../types/theater'

interface TheaterAnalyticsProps {
  theaters: Theater[]
  analyticsData?: any
  loading?: boolean
}

interface DateRange {
  from: string
  to: string
}

export const TheaterAnalytics: React.FC<TheaterAnalyticsProps> = ({
  theaters,
  analyticsData: ownerAnalytics,
  loading: ownerLoading,
}) => {
  const [selectedTheater, setSelectedTheater] = useState<string>('')
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!, // 30 days ago
    to: new Date().toISOString().split('T')[0]!, // today
  })

  // Fetch theater-specific analytics
  const {
    data: theaterAnalytics,
    loading: theaterLoading,
    error: theaterError,
    refetch: refetchTheaterAnalytics,
  } = useQuery(() => {
    if (selectedTheater) {
      return TheaterService.getTheaterAnalytics(selectedTheater, dateRange)
    }
    return null
  }, [selectedTheater, dateRange])

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const handleExportData = async () => {
    try {
      // This would typically trigger a CSV/PDF export
      console.log('Exporting analytics data...', { selectedTheater, dateRange })
      // Implementation would depend on backend API
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  const renderOwnerOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Total Revenue</p>
              <p className="text-2xl font-bold text-secondary-900">
                {formatCurrency(ownerAnalytics?.total_revenue || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Tickets Sold</p>
              <p className="text-2xl font-bold text-secondary-900">
                {ownerAnalytics?.total_tickets_sold?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Avg Occupancy</p>
              <p className="text-2xl font-bold text-secondary-900">
                {formatPercentage(ownerAnalytics?.average_occupancy || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-error-100 rounded-lg">
              <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Active Theaters</p>
              <p className="text-2xl font-bold text-secondary-900">
                {theaters.filter(t => t.is_active).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTheaterSpecificAnalytics = () => {
    if (!selectedTheater) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-secondary-600">Select a theater to view detailed analytics</p>
          </CardContent>
        </Card>
      )
    }

    if (theaterLoading) {
      return <LoadingSpinner />
    }

    if (theaterError) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-error-600">Error loading theater analytics: {theaterError.message}</p>
          </CardContent>
        </Card>
      )
    }

    const theater = theaters.find(t => t.id === selectedTheater)

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{theater?.name} - Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">
                  {formatCurrency(theaterAnalytics?.revenue || 0)}
                </p>
                <p className="text-sm text-secondary-600">Revenue</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-success-600">
                  {theaterAnalytics?.tickets_sold?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-secondary-600">Tickets Sold</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-warning-600">
                  {formatPercentage(theaterAnalytics?.occupancy_rate || 0)}
                </p>
                <p className="text-sm text-secondary-600">Occupancy Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Movies */}
        {theaterAnalytics?.popular_movies && (
          <Card>
            <CardHeader>
              <CardTitle>Popular Movies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {theaterAnalytics.popular_movies.slice(0, 5).map((movie: any, index: number) => (
                  <div key={movie.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-secondary-900">{movie.title}</p>
                        <p className="text-sm text-secondary-600">{movie.genre}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-secondary-900">{movie.tickets_sold} tickets</p>
                      <p className="text-sm text-secondary-600">{formatCurrency(movie.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Screen Performance */}
        {theaterAnalytics?.screen_performance && (
          <Card>
            <CardHeader>
              <CardTitle>Screen Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {theaterAnalytics.screen_performance.map((screen: any) => (
                  <div key={screen.screen_number} className="p-4 border border-secondary-200 rounded-lg">
                    <h4 className="font-medium text-secondary-900 mb-2">
                      Screen {screen.screen_number}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Revenue:</span>
                        <span className="font-medium">{formatCurrency(screen.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Occupancy:</span>
                        <span className="font-medium">{formatPercentage(screen.occupancy_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Shows:</span>
                        <span className="font-medium">{screen.total_shows}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue Trends */}
        {theaterAnalytics?.daily_revenue && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-1">
                {theaterAnalytics.daily_revenue.map((day: any, index: number) => {
                  const maxRevenue = Math.max(...theaterAnalytics.daily_revenue.map((d: any) => d.revenue))
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-primary-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${formatCurrency(day.revenue)}`}
                      />
                      <span className="text-xs text-secondary-600 mt-1 transform rotate-45 origin-left">
                        {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <h2 className="text-2xl font-bold text-secondary-900">Theater Analytics</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <Button onClick={handleExportData} variant="outline">
            Export Data
          </Button>
        </div>
      </div>

      {/* Date Range and Theater Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="From Date"
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
            />
            
            <Input
              label="To Date"
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
            />
            
            <Select
              label="Theater"
              value={selectedTheater}
              onChange={(e) => setSelectedTheater(e.target.value)}
              options={[
                { value: '', label: 'All Theaters Overview' },
                ...theaters.map(theater => ({
                  value: theater.id,
                  label: theater.name,
                }))
              ]}
            />
            
            <div className="flex items-end">
              <Button 
                onClick={refetchTheaterAnalytics}
                variant="outline"
                className="w-full"
              >
                Refresh Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Content */}
      {ownerLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Owner Overview */}
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Portfolio Overview</h3>
            {renderOwnerOverview()}
          </div>

          {/* Theater-Specific Analytics */}
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              {selectedTheater ? 'Theater Details' : 'Select Theater for Details'}
            </h3>
            {renderTheaterSpecificAnalytics()}
          </div>
        </div>
      )}
    </div>
  )
}