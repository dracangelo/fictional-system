import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../../test/utils'
import { SeatMap } from '../SeatMap'

const mockSeatingLayout = {
  rows: 5,
  seatsPerRow: 8,
  vipRows: [1, 2],
  disabledSeats: ['A1', 'A8', 'E4'],
}

const mockPricing = {
  regular: 25,
  vip: 40,
}

describe('SeatMap Component', () => {
  const defaultProps = {
    seatingLayout: mockSeatingLayout,
    bookedSeats: ['B3', 'B4', 'C5'],
    selectedSeats: [],
    onSeatSelect: vi.fn(),
    onSeatDeselect: vi.fn(),
    pricing: mockPricing,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders seat map with correct layout', () => {
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    // Should render 5 rows
    expect(screen.getAllByTestId(/row-/)).toHaveLength(5)
    
    // Should render 8 seats per row (5 rows × 8 seats = 40 seats)
    expect(screen.getAllByTestId(/seat-/)).toHaveLength(40)
    
    // Check row labels
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
  })

  it('displays different seat states correctly', () => {
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    // Available seat
    const availableSeat = screen.getByTestId('seat-C1')
    expect(availableSeat).toHaveClass('seat-available')
    expect(availableSeat).not.toBeDisabled()
    
    // Booked seat
    const bookedSeat = screen.getByTestId('seat-B3')
    expect(bookedSeat).toHaveClass('seat-booked')
    expect(bookedSeat).toBeDisabled()
    
    // Disabled seat
    const disabledSeat = screen.getByTestId('seat-A1')
    expect(disabledSeat).toHaveClass('seat-disabled')
    expect(disabledSeat).toBeDisabled()
    
    // VIP seat
    const vipSeat = screen.getByTestId('seat-A2')
    expect(vipSeat).toHaveClass('seat-vip')
  })

  it('shows selected seats correctly', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedSeats: ['C2', 'D3'],
    }
    
    renderWithProviders(<SeatMap {...propsWithSelection} />)
    
    const selectedSeat1 = screen.getByTestId('seat-C2')
    const selectedSeat2 = screen.getByTestId('seat-D3')
    
    expect(selectedSeat1).toHaveClass('seat-selected')
    expect(selectedSeat2).toHaveClass('seat-selected')
  })

  it('calls onSeatSelect when available seat is clicked', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const availableSeat = screen.getByTestId('seat-C1')
    await user.click(availableSeat)
    
    expect(defaultProps.onSeatSelect).toHaveBeenCalledWith('C1')
    expect(defaultProps.onSeatSelect).toHaveBeenCalledTimes(1)
  })

  it('calls onSeatDeselect when selected seat is clicked', async () => {
    const user = userEvent.setup()
    const propsWithSelection = {
      ...defaultProps,
      selectedSeats: ['C2'],
    }
    
    renderWithProviders(<SeatMap {...propsWithSelection} />)
    
    const selectedSeat = screen.getByTestId('seat-C2')
    await user.click(selectedSeat)
    
    expect(defaultProps.onSeatDeselect).toHaveBeenCalledWith('C2')
    expect(defaultProps.onSeatDeselect).toHaveBeenCalledTimes(1)
  })

  it('does not call handlers for disabled seats', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const disabledSeat = screen.getByTestId('seat-A1')
    await user.click(disabledSeat)
    
    expect(defaultProps.onSeatSelect).not.toHaveBeenCalled()
    expect(defaultProps.onSeatDeselect).not.toHaveBeenCalled()
  })

  it('does not call handlers for booked seats', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const bookedSeat = screen.getByTestId('seat-B3')
    await user.click(bookedSeat)
    
    expect(defaultProps.onSeatSelect).not.toHaveBeenCalled()
    expect(defaultProps.onSeatDeselect).not.toHaveBeenCalled()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const firstSeat = screen.getByTestId('seat-A2') // A1 is disabled, so A2 is first focusable
    firstSeat.focus()
    
    // Right arrow should move to next seat
    await user.keyboard('{ArrowRight}')
    expect(screen.getByTestId('seat-A3')).toHaveFocus()
    
    // Down arrow should move to seat below
    await user.keyboard('{ArrowDown}')
    expect(screen.getByTestId('seat-B3')).toHaveFocus()
    
    // Left arrow should move to previous seat
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByTestId('seat-B2')).toHaveFocus()
    
    // Up arrow should move to seat above
    await user.keyboard('{ArrowUp}')
    expect(screen.getByTestId('seat-A2')).toHaveFocus()
  })

  it('selects seat with Enter or Space key', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const seat = screen.getByTestId('seat-C1')
    seat.focus()
    
    await user.keyboard('{Enter}')
    expect(defaultProps.onSeatSelect).toHaveBeenCalledWith('C1')
    
    vi.clearAllMocks()
    
    await user.keyboard(' ')
    expect(defaultProps.onSeatSelect).toHaveBeenCalledWith('C1')
  })

  it('skips disabled and booked seats during keyboard navigation', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    // Start at A2 (A1 is disabled)
    const startSeat = screen.getByTestId('seat-A2')
    startSeat.focus()
    
    // Navigate right, should skip A8 (disabled) and go to B1
    for (let i = 0; i < 7; i++) {
      await user.keyboard('{ArrowRight}')
    }
    
    expect(screen.getByTestId('seat-B1')).toHaveFocus()
  })

  it('shows seat tooltips on hover', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const vipSeat = screen.getByTestId('seat-A2')
    await user.hover(vipSeat)
    
    await waitFor(() => {
      expect(screen.getByText('Seat A2 - VIP ($40)')).toBeInTheDocument()
    })
    
    const regularSeat = screen.getByTestId('seat-C1')
    await user.hover(regularSeat)
    
    await waitFor(() => {
      expect(screen.getByText('Seat C1 - Regular ($25)')).toBeInTheDocument()
    })
  })

  it('displays seat legend', () => {
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Selected')).toBeInTheDocument()
    expect(screen.getByText('Booked')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('handles real-time seat updates', () => {
    const { rerender } = renderWithProviders(<SeatMap {...defaultProps} />)
    
    // Initially C1 is available
    expect(screen.getByTestId('seat-C1')).toHaveClass('seat-available')
    
    // Update props to mark C1 as booked
    const updatedProps = {
      ...defaultProps,
      bookedSeats: [...defaultProps.bookedSeats, 'C1'],
    }
    
    rerender(<SeatMap {...updatedProps} />)
    
    // C1 should now be booked
    expect(screen.getByTestId('seat-C1')).toHaveClass('seat-booked')
    expect(screen.getByTestId('seat-C1')).toBeDisabled()
  })

  it('shows loading state for seats being processed', () => {
    const propsWithLoading = {
      ...defaultProps,
      loadingSeats: ['C1', 'C2'],
    }
    
    renderWithProviders(<SeatMap {...propsWithLoading} />)
    
    const loadingSeat1 = screen.getByTestId('seat-C1')
    const loadingSeat2 = screen.getByTestId('seat-C2')
    
    expect(loadingSeat1).toHaveClass('seat-loading')
    expect(loadingSeat2).toHaveClass('seat-loading')
    expect(loadingSeat1).toBeDisabled()
    expect(loadingSeat2).toBeDisabled()
  })

  it('respects maximum seat selection limit', async () => {
    const user = userEvent.setup()
    const propsWithLimit = {
      ...defaultProps,
      maxSeats: 2,
      selectedSeats: ['C1', 'C2'], // Already at limit
    }
    
    renderWithProviders(<SeatMap {...propsWithLimit} />)
    
    // Try to select another seat
    const anotherSeat = screen.getByTestId('seat-C3')
    await user.click(anotherSeat)
    
    // Should not call onSeatSelect
    expect(defaultProps.onSeatSelect).not.toHaveBeenCalled()
    
    // Should show disabled state for other available seats
    expect(anotherSeat).toHaveClass('seat-disabled-by-limit')
  })

  it('has proper accessibility attributes', () => {
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const seatMap = screen.getByRole('grid')
    expect(seatMap).toHaveAttribute('aria-label', 'Seat selection map')
    
    const seat = screen.getByTestId('seat-C1')
    expect(seat).toHaveAttribute('role', 'gridcell')
    expect(seat).toHaveAttribute('aria-label', 'Seat C1, Regular, $25, Available')
    
    const bookedSeat = screen.getByTestId('seat-B3')
    expect(bookedSeat).toHaveAttribute('aria-label', 'Seat B3, Regular, $25, Booked')
    expect(bookedSeat).toHaveAttribute('aria-disabled', 'true')
  })

  it('announces seat selection to screen readers', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const seat = screen.getByTestId('seat-C1')
    await user.click(seat)
    
    // Should have live region announcement
    expect(screen.getByRole('status')).toHaveTextContent('Seat C1 selected')
  })

  it('handles mobile touch interactions', async () => {
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    const seat = screen.getByTestId('seat-C1')
    
    // Simulate touch events
    fireEvent.touchStart(seat)
    fireEvent.touchEnd(seat)
    
    expect(defaultProps.onSeatSelect).toHaveBeenCalledWith('C1')
  })

  it('shows seat map in different orientations', () => {
    const landscapeProps = {
      ...defaultProps,
      orientation: 'landscape' as const,
    }
    
    renderWithProviders(<SeatMap {...landscapeProps} />)
    
    const seatMap = screen.getByTestId('seat-map-container')
    expect(seatMap).toHaveClass('orientation-landscape')
  })

  it('displays screen/stage indicator', () => {
    renderWithProviders(<SeatMap {...defaultProps} />)
    
    expect(screen.getByText('SCREEN')).toBeInTheDocument()
    expect(screen.getByTestId('screen-indicator')).toBeInTheDocument()
  })
})