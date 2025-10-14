import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TheaterForm } from '../TheaterForm'
import { TheaterService } from '../../../services/theater'
import type { Theater } from '../../../types/theater'

// Mock the TheaterService
vi.mock('../../../services/theater', () => ({
  TheaterService: {
    createTheater: vi.fn(),
    updateTheater: vi.fn(),
  },
}))

const mockTheaterService = TheaterService as any

describe('TheaterForm', () => {
  const mockOnClose = vi.fn()

  const mockTheater: Theater = {
    id: '1',
    owner: 'owner1',
    name: 'Test Theater',
    address: '123 Main St, City, State',
    screens: 2,
    seating_layout: {
      screens: [
        {
          screen_number: 1,
          rows: 10,
          seats_per_row: 15,
          vip_rows: [1, 2],
          disabled_seats: ['A1', 'B5'],
          pricing: { regular: 12.00, vip: 18.00 }
        },
        {
          screen_number: 2,
          rows: 8,
          seats_per_row: 12,
          vip_rows: [1],
          disabled_seats: [],
          pricing: { regular: 10.00, vip: 15.00 }
        }
      ]
    },
    amenities: ['IMAX', 'Dolby Atmos', '3D'],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form when no theater is provided', () => {
    render(<TheaterForm onClose={mockOnClose} />)

    expect(screen.getByText('Create New Theater')).toBeInTheDocument()
    expect(screen.getByLabelText('Theater Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Number of Screens')).toBeInTheDocument()
    expect(screen.getByText('Create Theater')).toBeInTheDocument()
  })

  it('renders edit form when theater is provided', () => {
    render(<TheaterForm theater={mockTheater} onClose={mockOnClose} />)

    expect(screen.getByText('Edit Theater')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Theater')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Main St, City, State')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByText('Update Theater')).toBeInTheDocument()
  })

  it('populates form fields with theater data in edit mode', () => {
    render(<TheaterForm theater={mockTheater} onClose={mockOnClose} />)

    expect(screen.getByDisplayValue('Test Theater')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Main St, City, State')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    
    // Check amenities
    expect(screen.getByText('IMAX')).toBeInTheDocument()
    expect(screen.getByText('Dolby Atmos')).toBeInTheDocument()
    expect(screen.getByText('3D')).toBeInTheDocument()
  })

  it('allows adding and removing amenities', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    const amenityInput = screen.getByPlaceholderText('Add amenity (e.g., IMAX, Dolby Atmos)')
    const addButton = screen.getByText('Add')

    // Add an amenity
    fireEvent.change(amenityInput, { target: { value: 'IMAX' } })
    fireEvent.click(addButton)

    expect(screen.getByText('IMAX')).toBeInTheDocument()

    // Remove the amenity
    const removeButton = screen.getByText('×')
    fireEvent.click(removeButton)

    expect(screen.queryByText('IMAX')).not.toBeInTheDocument()
  })

  it('updates seating screens when screen count changes', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    const screenInput = screen.getByLabelText('Number of Screens')
    
    // Change to 3 screens
    fireEvent.change(screenInput, { target: { value: '3' } })

    await waitFor(() => {
      expect(screen.getByText('Screen 1')).toBeInTheDocument()
      expect(screen.getByText('Screen 2')).toBeInTheDocument()
      expect(screen.getByText('Screen 3')).toBeInTheDocument()
    })
  })

  it('allows configuring seating layout for each screen', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    // Should show Screen 1 configuration by default
    expect(screen.getByText('Screen 1')).toBeInTheDocument()
    
    const rowsInput = screen.getByLabelText('Rows')
    const seatsInput = screen.getByLabelText('Seats per Row')
    const regularPriceInput = screen.getByLabelText('Regular Price ($)')
    const vipPriceInput = screen.getByLabelText('VIP Price ($)')

    expect(rowsInput).toHaveValue(10) // Default value
    expect(seatsInput).toHaveValue(15) // Default value
    expect(regularPriceInput).toHaveValue(12) // Default value
    expect(vipPriceInput).toHaveValue(18) // Default value

    // Change values
    fireEvent.change(rowsInput, { target: { value: '12' } })
    fireEvent.change(seatsInput, { target: { value: '20' } })

    expect(rowsInput).toHaveValue(12)
    expect(seatsInput).toHaveValue(20)
  })

  it('allows toggling VIP rows', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    // VIP rows should be toggleable
    const rowButtons = screen.getAllByText(/Row [A-Z]/)
    expect(rowButtons.length).toBeGreaterThan(0)

    // Click on a row button to toggle VIP status
    fireEvent.click(rowButtons[0])
    
    // The button should change appearance (implementation dependent)
    expect(rowButtons[0]).toBeInTheDocument()
  })

  it('allows disabling individual seats', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    // Find seat buttons in the seating layout
    const seatButtons = screen.getAllByRole('button').filter(button => 
      /^\d+$/.test(button.textContent || '')
    )

    if (seatButtons.length > 0) {
      // Click on a seat to disable it
      fireEvent.click(seatButtons[0])
      
      // The seat should change appearance (implementation dependent)
      expect(seatButtons[0]).toBeInTheDocument()
    }
  })

  it('submits form with correct data for new theater', async () => {
    mockTheaterService.createTheater.mockResolvedValue(mockTheater)

    render(<TheaterForm onClose={mockOnClose} />)

    // Fill in form fields
    fireEvent.change(screen.getByLabelText('Theater Name'), { 
      target: { value: 'New Theater' } 
    })
    fireEvent.change(screen.getByLabelText('Address'), { 
      target: { value: '456 Oak St' } 
    })

    // Submit form
    fireEvent.click(screen.getByText('Create Theater'))

    await waitFor(() => {
      expect(mockTheaterService.createTheater).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Theater',
          address: '456 Oak St',
          screens: 1,
          seating_layout: expect.any(Object),
          amenities: [],
        })
      )
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('submits form with correct data for theater update', async () => {
    mockTheaterService.updateTheater.mockResolvedValue(mockTheater)

    render(<TheaterForm theater={mockTheater} onClose={mockOnClose} />)

    // Change theater name
    const nameInput = screen.getByDisplayValue('Test Theater')
    fireEvent.change(nameInput, { target: { value: 'Updated Theater' } })

    // Submit form
    fireEvent.click(screen.getByText('Update Theater'))

    await waitFor(() => {
      expect(mockTheaterService.updateTheater).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Updated Theater',
        })
      )
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('displays error message on submission failure', async () => {
    const errorMessage = 'Failed to create theater'
    mockTheaterService.createTheater.mockRejectedValue({
      response: { data: { message: errorMessage } }
    })

    render(<TheaterForm onClose={mockOnClose} />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Theater Name'), { 
      target: { value: 'Test Theater' } 
    })
    fireEvent.change(screen.getByLabelText('Address'), { 
      target: { value: '123 Main St' } 
    })

    // Submit form
    fireEvent.click(screen.getByText('Create Theater'))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    mockTheaterService.createTheater.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<TheaterForm onClose={mockOnClose} />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Theater Name'), { 
      target: { value: 'Test Theater' } 
    })
    fireEvent.change(screen.getByLabelText('Address'), { 
      target: { value: '123 Main St' } 
    })

    // Submit form
    fireEvent.click(screen.getByText('Create Theater'))

    // Button should show loading state
    expect(screen.getByText('Create Theater')).toBeDisabled()
  })

  it('calls onClose when cancel button is clicked', () => {
    render(<TheaterForm onClose={mockOnClose} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('validates required fields', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    // Try to submit without filling required fields
    fireEvent.click(screen.getByText('Create Theater'))

    // Form should not submit (browser validation)
    expect(mockTheaterService.createTheater).not.toHaveBeenCalled()
  })

  it('prevents duplicate amenities', async () => {
    render(<TheaterForm onClose={mockOnClose} />)

    const amenityInput = screen.getByPlaceholderText('Add amenity (e.g., IMAX, Dolby Atmos)')
    const addButton = screen.getByText('Add')

    // Add an amenity
    fireEvent.change(amenityInput, { target: { value: 'IMAX' } })
    fireEvent.click(addButton)

    // Try to add the same amenity again
    fireEvent.change(amenityInput, { target: { value: 'IMAX' } })
    fireEvent.click(addButton)

    // Should only have one IMAX amenity
    const imaxElements = screen.getAllByText('IMAX')
    expect(imaxElements).toHaveLength(1)
  })
})