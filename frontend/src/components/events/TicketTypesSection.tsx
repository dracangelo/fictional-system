import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../ui/Badge';
import { eventService } from '../../services/event';
import { useQuery } from '../../hooks/useQuery';
import type { TicketType, CreateTicketTypeData } from '../../types/event';

interface TicketTypesSectionProps {
  eventId: string;
}

interface TicketTypeFormData extends CreateTicketTypeData {
  id?: string;
}

export const TicketTypesSection: React.FC<TicketTypesSectionProps> = ({ eventId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TicketTypeFormData>({
    name: '',
    price: 0,
    quantity_available: 0,
    description: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const {
    data: ticketTypes,
    loading: ticketTypesLoading,
    error: ticketTypesError,
    refetch: refetchTicketTypes,
  } = useQuery(() => eventService.getTicketTypes(eventId));

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      quantity_available: 0,
      description: '',
    });
    setValidationErrors({});
    setEditingTicket(null);
    setShowForm(false);
    setError(null);
  };

  const handleAddTicketType = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditTicketType = (ticketType: TicketType) => {
    setFormData({
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      quantity_available: ticketType.quantity_available,
      description: ticketType.description,
    });
    setEditingTicket(ticketType);
    setShowForm(true);
    setError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Ticket type name is required';
    }

    if (formData.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (formData.quantity_available <= 0) {
      errors.quantity_available = 'Quantity must be greater than 0';
    }

    // Check for duplicate names (excluding current ticket when editing)
    const duplicateName = ticketTypes?.find(
      (ticket) => 
        ticket.name.toLowerCase() === formData.name.toLowerCase() &&
        ticket.id !== editingTicket?.id
    );

    if (duplicateName) {
      errors.name = 'A ticket type with this name already exists';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof TicketTypeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ticketData = {
        name: formData.name,
        price: formData.price,
        quantity_available: formData.quantity_available,
        description: formData.description,
      };

      if (editingTicket) {
        await eventService.updateTicketType(eventId, editingTicket.id, ticketData);
      } else {
        await eventService.createTicketType(eventId, ticketData);
      }

      await refetchTicketTypes();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the ticket type');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicketType = async (ticketTypeId: string) => {
    if (!confirm('Are you sure you want to delete this ticket type?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await eventService.deleteTicketType(eventId, ticketTypeId);
      await refetchTicketTypes();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the ticket type');
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenue = (ticketType: TicketType) => {
    return ticketType.quantity_sold * ticketType.price;
  };

  const calculateAvailablePercentage = (ticketType: TicketType) => {
    const available = ticketType.quantity_available - ticketType.quantity_sold;
    return (available / ticketType.quantity_available) * 100;
  };

  if (ticketTypesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (ticketTypesError) {
    return (
      <div className="text-center text-red-600 py-8">
        Error loading ticket types: {ticketTypesError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Ticket Types List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Ticket Types</h3>
          <Button onClick={handleAddTicketType} disabled={loading}>
            Add Ticket Type
          </Button>
        </div>

        {!ticketTypes || ticketTypes.length === 0 ? (
          <EmptyState
            title="No ticket types yet"
            description="Create ticket types to start selling tickets for your event"
            action={
              <Button onClick={handleAddTicketType}>
                Add First Ticket Type
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {ticketTypes.map((ticketType) => (
              <Card key={ticketType.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{ticketType.name}</h4>
                        <Badge variant="secondary">
                          ${ticketType.price.toFixed(2)}
                        </Badge>
                      </div>
                      
                      {ticketType.description && (
                        <p className="text-gray-600 mb-3">{ticketType.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Available:</span>
                          <div className="font-medium">
                            {ticketType.quantity_available - ticketType.quantity_sold} / {ticketType.quantity_available}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Sold:</span>
                          <div className="font-medium">{ticketType.quantity_sold}</div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Revenue:</span>
                          <div className="font-medium">${calculateRevenue(ticketType).toFixed(2)}</div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Availability:</span>
                          <div className="font-medium">
                            {calculateAvailablePercentage(ticketType).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(ticketType.quantity_sold / ticketType.quantity_available) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTicketType(ticketType)}
                        disabled={loading}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTicketType(ticketType.id)}
                        disabled={loading || ticketType.quantity_sold > 0}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTicket ? 'Edit Ticket Type' : 'Add New Ticket Type'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Ticket Type Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={validationErrors.name}
                    placeholder="e.g., General Admission, VIP"
                    required
                  />
                </div>

                <div>
                  <Input
                    type="number"
                    label="Price ($)"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    error={validationErrors.price}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Input
                  type="number"
                  label="Quantity Available"
                  value={formData.quantity_available}
                  onChange={(e) => handleInputChange('quantity_available', parseInt(e.target.value) || 0)}
                  error={validationErrors.quantity_available}
                  placeholder="0"
                  min="1"
                  required
                />
              </div>

              <div>
                <TextArea
                  label="Description (Optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what's included with this ticket type"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading && <LoadingSpinner size="sm" className="mr-2" />}
                  {editingTicket ? 'Update Ticket Type' : 'Add Ticket Type'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};