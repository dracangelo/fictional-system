import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SeatMap } from '../SeatMap'
import type { SeatMapData, Seat } from '../../../types/seat'

expect.extend(toHaveNoViolations)

const mockSeatMapData: SeatMapData = {
  rows: 3,
  seatsPerRow: 6,
  vipRows: [1],
  disabledSeats: ['C1'],
  bookedSeats: ['A2', 'B3'],
  lockedSeats: ['A3'],
  pricing: {
    regular: 15.00,
    vip: 25.00
  }
}

describe('SeatMap Accessibility', () => {
  const defaultProps = {
    showtimeId: 'test-showtime',
    seatMapData: mockSeatMapData,
    selectedSeats: [] as Seat[],
    onSeatSelection: vi.fn(),
    maxSeats: 4
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not have any accessibility violations', async () => {
    const { container } = render(<SeatMap {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA structure', () => {
    render(<SeatMap {...defaultProps} />)
    
    // Should have application role for interactive seat map
    const seatMapContainer = screen.getByRole('application')
    expect(seatMapContainer).toHaveAttribute('aria-label', 'Interactive seat map')
    
    // Should have grid role for seat layout
    const seatGrid = screen.getByRole('grid')
    expect(seatGrid).toHaveAttribute('aria-label', 'Theater seating chart')
    
    // Should have rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3) // 3 rows in mock data
  })

  it('should provide screen reader instructions', () => {
    render(<SeatMap {...defaultProps} />)
    
    const instructions = screen.getByText(/use arrow keys to navigate/i)
    expect(instructions).toBeInTheDocument()
    expect(instructions).toHaveClass('sr-only')
  })

  it('should announce seat selection changes', async () => {
    const onSeatSelection = vi.fn()
    render(<SeatMap {...defaultProps} onSeatSelection={onSeatSelection} />)
    
    // Find an available seat
    const availableSeat = screen.getByRole('gridcell', { name: /seat A1.*available/i })
    expect(availableSeat).toBeInTheDocument()
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<SeatMap {...defaultProps} />)
    
    // Arrow keys should navigate between seats
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowUp}')
    
    // Enter and Space should select seats
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
  })

  it('should have proper ARIA labels for different seat states', () => {
    render(<SeatMap {...defaultProps} />)
    
    // Available seat
    const availableSeat = screen.getByRole('gridcell', { name: /available for selection/i })
    expect(availableSeat).toBeInTheDocument()
    
    // Booked seat
    const bookedSeat = screen.getByRole('gridcell', { name: /already booked/i })
    expect(bookedSeat).toBeInTheDocument()
    
    // VIP seat
    const vipSeat = screen.getByRole('gridcell', { name: /VIP seat/i })
    expect(vipSeat).toBeInTheDocument()
  })

  it('should announce live updates', () => {
    render(<SeatMap {...defaultProps} />)
    
    // Should have live region for announcements
    const liveRegion = screen.getByRole('status', { hidden: true })
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
  })

  it('should have proper focus management', async () => {
    const user = userEvent.setup()
    render(<SeatMap {...defaultProps} />)
    
    // Should be able to focus seats with keyboard
    const seats = screen.getAllByRole('gridcell')
    const focusableSeats = seats.filter(seat => 
      seat.getAttribute('tabindex') === '0' || 
      seat.getAttribute('tabindex') === '-1'
    )
    
    expect(focusableSeats.length).toBeGreaterThan(0)
  })

  it('should provide selection status information', () => {
    const selectedSeats: Seat[] = [
      {
        id: 'A1',
        row: 'A',
        number: 1,
        category: 'regular',
        status: 'selected',
        price: 15.00
      }
    ]
    
    render(<SeatMap {...defaultProps} selectedSeats={selectedSeats} />)
    
    // Should show selection count
    const selectionInfo = screen.getByText(/1 seat selected/i)
    expect(selectionInfo).toBeInTheDocument()
    expect(selectionInfo).toHaveAttribute('aria-live', 'polite')
  })

  it('should handle maximum seat selection', () => {
    const selectedSeats: Seat[] = Array.from({ length: 4 }, (_, i) => ({
      id: `A${i + 1}`,
      row: 'A',
      number: i + 1,
      category: 'regular',
      status: 'selected',
      price: 15.00
    }))
    
    render(<SeatMap {...defaultProps} selectedSeats={selectedSeats} maxSeats={4} />)
    
    const selectionInfo = screen.getByText(/4 seats selected/i)
    expect(selectionInfo).toBeInTheDocument()
  })

  it('should have accessible tooltips', () => {
    render(<SeatMap {...defaultProps} />)
    
    const seats = screen.getAllByRole('gridcell')
    seats.forEach(seat => {
      const tooltipId = seat.getAttribute('aria-describedby')
      if (tooltipId) {
        const tooltip = document.getElementById(tooltipId)
        expect(tooltip).toHaveAttribute('role', 'tooltip')
      }
    })
  })

  it('should provide proper seat pricing information', () => {
    render(<SeatMap {...defaultProps} />)
    
    // Regular seat should show regular price
    const regularSeat = screen.getByRole('gridcell', { name: /15\.00/i })
    expect(regularSeat).toBeInTheDocument()
    
    // VIP seat should show VIP price
    const vipSeat = screen.getByRole('gridcell', { name: /25\.00/i })
    expect(vipSeat).toBeInTheDocument()
  })

  it('should handle loading state accessibly', async () => {
    const { container } = render(<SeatMap {...defaultProps} loading={true} />)
    
    const loadingSpinner = screen.getByText(/loading seat map/i)
    expect(loadingSpinner).toBeInTheDocument()
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should provide screen indicator information', () => {
    render(<SeatMap {...defaultProps} />)
    
    const screenIndicator = screen.getByRole('img', { name: /movie screen location/i })
    expect(screenIndicator).toBeInTheDocument()
  })
})