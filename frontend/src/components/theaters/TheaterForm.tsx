import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TextArea } from '../ui/TextArea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { TheaterService } from '../../services/theater'
import type { Theater, CreateTheaterData, SeatingLayout } from '../../types/theater'

interface TheaterFormProps {
  theater?: Theater | null
  onClose: () => void
}

interface SeatingScreen {
  screen_number: number
  rows: number
  seats_per_row: number
  vip_rows: number[]
  disabled_seats: string[]
  pricing: {
    regular: number
    vip: number
  }
}

export const TheaterForm: React.FC<TheaterFormProps> = ({
  theater,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Basic theater info
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [screens, setScreens] = useState(1)
  const [amenities, setAmenities] = useState<string[]>([])
  const [newAmenity, setNewAmenity] = useState('')
  
  // Seating layout
  const [seatingScreens, setSeatingScreens] = useState<SeatingScreen[]>([])

  useEffect(() => {
    if (theater) {
      setName(theater.name)
      setAddress(theater.address)
      setScreens(theater.screens)
      setAmenities(theater.amenities || [])
      setSeatingScreens(theater.seating_layout?.screens || [])
    } else {
      // Initialize with default screen
      setSeatingScreens([{
        screen_number: 1,
        rows: 10,
        seats_per_row: 15,
        vip_rows: [1, 2],
        disabled_seats: [],
        pricing: {
          regular: 12.00,
          vip: 18.00,
        },
      }])
    }
  }, [theater])

  // Update seating screens when screen count changes
  useEffect(() => {
    const currentScreenCount = seatingScreens.length
    if (screens > currentScreenCount) {
      // Add new screens
      const newScreens: SeatingScreen[] = []
      for (let i = currentScreenCount + 1; i <= screens; i++) {
        newScreens.push({
          screen_number: i,
          rows: 10,
          seats_per_row: 15,
          vip_rows: [1, 2],
          disabled_seats: [],
          pricing: {
            regular: 12.00,
            vip: 18.00,
          },
        })
      }
      setSeatingScreens([...seatingScreens, ...newScreens])
    } else if (screens < currentScreenCount) {
      // Remove excess screens
      setSeatingScreens(seatingScreens.slice(0, screens))
    }
  }, [screens])

  const handleAddAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      setAmenities([...amenities, newAmenity.trim()])
      setNewAmenity('')
    }
  }

  const handleRemoveAmenity = (amenity: string) => {
    setAmenities(amenities.filter(a => a !== amenity))
  }

  const updateSeatingScreen = (screenIndex: number, updates: Partial<SeatingScreen>) => {
    const updatedScreens = [...seatingScreens]
    const currentScreen = updatedScreens[screenIndex]
    if (currentScreen) {
      updatedScreens[screenIndex] = { ...currentScreen, ...updates }
      setSeatingScreens(updatedScreens)
    }
  }

  const generateSeatLabel = (row: number, seat: number): string => {
    const rowLetter = String.fromCharCode(65 + row - 1) // A, B, C, etc.
    return `${rowLetter}${seat}`
  }

  const toggleDisabledSeat = (screenIndex: number, seatLabel: string) => {
    const screen = seatingScreens[screenIndex]
    if (!screen) return
    
    const disabledSeats = [...screen.disabled_seats]
    const seatIndex = disabledSeats.indexOf(seatLabel)
    
    if (seatIndex > -1) {
      disabledSeats.splice(seatIndex, 1)
    } else {
      disabledSeats.push(seatLabel)
    }
    
    updateSeatingScreen(screenIndex, { disabled_seats: disabledSeats })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const seatingLayout: SeatingLayout = {
        screens: seatingScreens,
      }

      const theaterData: CreateTheaterData = {
        name,
        address,
        screens,
        seating_layout: seatingLayout,
        amenities,
      }

      if (theater) {
        await TheaterService.updateTheater(theater.id, theaterData)
      } else {
        await TheaterService.createTheater(theaterData)
      }

      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save theater')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} className="max-w-4xl">
      <ModalHeader>
        <h2 className="text-xl font-semibold">
          {theater ? 'Edit Theater' : 'Create New Theater'}
        </h2>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Theater Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter theater name"
            />

            <TextArea
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Enter full address"
              rows={3}
            />

            <Input
              label="Number of Screens"
              type="number"
              min="1"
              max="20"
              value={screens}
              onChange={(e) => setScreens(parseInt(e.target.value) || 1)}
              required
            />
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add amenity (e.g., IMAX, Dolby Atmos)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
              />
              <Button type="button" onClick={handleAddAmenity} variant="outline">
                Add
              </Button>
            </div>

            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(amenity)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seating Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Seating Layout Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {seatingScreens.map((screen, screenIndex) => (
              <div key={screen.screen_number} className="border border-secondary-200 rounded-lg p-4">
                <h4 className="text-lg font-medium mb-4">Screen {screen.screen_number}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Input
                    label="Rows"
                    type="number"
                    min="1"
                    max="30"
                    value={screen.rows}
                    onChange={(e) => updateSeatingScreen(screenIndex, { rows: parseInt(e.target.value) || 1 })}
                  />
                  
                  <Input
                    label="Seats per Row"
                    type="number"
                    min="1"
                    max="50"
                    value={screen.seats_per_row}
                    onChange={(e) => updateSeatingScreen(screenIndex, { seats_per_row: parseInt(e.target.value) || 1 })}
                  />
                  
                  <Input
                    label="Regular Price ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={screen.pricing.regular}
                    onChange={(e) => updateSeatingScreen(screenIndex, { 
                      pricing: { ...screen.pricing, regular: parseFloat(e.target.value) || 0 }
                    })}
                  />
                  
                  <Input
                    label="VIP Price ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={screen.pricing.vip}
                    onChange={(e) => updateSeatingScreen(screenIndex, { 
                      pricing: { ...screen.pricing, vip: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>

                {/* VIP Rows Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    VIP Rows (click to toggle)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: screen.rows }, (_, i) => i + 1).map((rowNum) => (
                      <button
                        key={rowNum}
                        type="button"
                        onClick={() => {
                          const vipRows = [...screen.vip_rows]
                          const index = vipRows.indexOf(rowNum)
                          if (index > -1) {
                            vipRows.splice(index, 1)
                          } else {
                            vipRows.push(rowNum)
                          }
                          updateSeatingScreen(screenIndex, { vip_rows: vipRows })
                        }}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          screen.vip_rows.includes(rowNum)
                            ? 'bg-warning-200 text-warning-800'
                            : 'bg-secondary-100 text-secondary-700'
                        }`}
                      >
                        Row {String.fromCharCode(65 + rowNum - 1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seating Layout Preview */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Seating Layout (click seats to disable)
                  </label>
                  <div className="bg-secondary-50 p-4 rounded-lg overflow-x-auto">
                    <div className="text-center mb-4 text-sm font-medium text-secondary-600">
                      SCREEN
                    </div>
                    <div className="space-y-2" style={{ minWidth: `${screen.seats_per_row * 32}px` }}>
                      {Array.from({ length: screen.rows }, (_, rowIndex) => (
                        <div key={rowIndex} className="flex justify-center space-x-1">
                          <span className="w-6 text-xs text-secondary-600 flex items-center justify-center">
                            {String.fromCharCode(65 + rowIndex)}
                          </span>
                          {Array.from({ length: screen.seats_per_row }, (_, seatIndex) => {
                            const seatLabel = generateSeatLabel(rowIndex + 1, seatIndex + 1)
                            const isVip = screen.vip_rows.includes(rowIndex + 1)
                            const isDisabled = screen.disabled_seats.includes(seatLabel)
                            
                            return (
                              <button
                                key={seatIndex}
                                type="button"
                                onClick={() => toggleDisabledSeat(screenIndex, seatLabel)}
                                className={`w-6 h-6 text-xs rounded ${
                                  isDisabled
                                    ? 'bg-error-200 text-error-800'
                                    : isVip
                                    ? 'bg-warning-200 text-warning-800 hover:bg-warning-300'
                                    : 'bg-primary-200 text-primary-800 hover:bg-primary-300'
                                }`}
                                title={`${seatLabel} ${isVip ? '(VIP)' : ''} ${isDisabled ? '(Disabled)' : ''}`}
                              >
                                {seatIndex + 1}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center space-x-4 mt-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-primary-200 rounded"></div>
                        <span>Regular</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-warning-200 rounded"></div>
                        <span>VIP</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-error-200 rounded"></div>
                        <span>Disabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {theater ? 'Update Theater' : 'Create Theater'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}