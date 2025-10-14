import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { eventService } from '../../services/event';
import { TicketTypesSection } from './TicketTypesSection';
import { MediaUpload } from './MediaUpload';
import type { Event, CreateEventData, UpdateEventData } from '../../types/event';

interface EventFormProps {
  event?: Event | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EVENT_CATEGORIES = [
  { value: 'music', label: 'Music' },
  { value: 'sports', label: 'Sports' },
  { value: 'theater', label: 'Theater' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'festival', label: 'Festival' },
  { value: 'other', label: 'Other' },
];

export const EventForm: React.FC<EventFormProps> = ({ event, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'tickets' | 'media'>('details');
  
  const [formData, setFormData] = useState<CreateEventData>({
    title: '',
    description: '',
    venue: '',
    address: '',
    category: '',
    start_datetime: '',
    end_datetime: '',
    media: [],
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        venue: event.venue,
        address: event.address,
        category: event.category,
        start_datetime: event.start_datetime.slice(0, 16), // Format for datetime-local input
        end_datetime: event.end_datetime.slice(0, 16),
        media: event.media || [],
      });
    }
  }, [event]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.venue.trim()) {
      errors.venue = 'Venue is required';
    }

    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.start_datetime) {
      errors.start_datetime = 'Start date and time is required';
    }

    if (!formData.end_datetime) {
      errors.end_datetime = 'End date and time is required';
    }

    if (formData.start_datetime && formData.end_datetime) {
      const startDate = new Date(formData.start_datetime);
      const endDate = new Date(formData.end_datetime);
      
      if (startDate >= endDate) {
        errors.end_datetime = 'End date must be after start date';
      }

      if (startDate < new Date()) {
        errors.start_datetime = 'Start date cannot be in the past';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof CreateEventData, value: string | string[]) => {
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
      // Convert datetime-local format to ISO string
      const eventData = {
        ...formData,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
      };

      if (event) {
        await eventService.updateEvent(event.id, eventData as UpdateEventData);
      } else {
        await eventService.createEvent(eventData);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the event');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpdate = (media: string[]) => {
    handleInputChange('media', media);
  };

  const tabs = [
    { id: 'details', label: 'Event Details' },
    { id: 'tickets', label: 'Ticket Types' },
    { id: 'media', label: 'Media' },
  ];

  return (
    <Modal open={true} onClose={onClose} size="xl">
      <ModalHeader>
        <h2 className="text-xl font-semibold">
          {event ? 'Edit Event' : 'Create New Event'}
        </h2>
      </ModalHeader>

      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex border-b mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Event Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <Input
                  label="Event Title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  error={validationErrors.title}
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div>
                <TextArea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  error={validationErrors.description}
                  placeholder="Describe your event"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Venue Name"
                    value={formData.venue}
                    onChange={(e) => handleInputChange('venue', e.target.value)}
                    error={validationErrors.venue}
                    placeholder="Enter venue name"
                    required
                  />
                </div>

                <div>
                  <Select
                    label="Category"
                    value={formData.category}
                    onChange={(value) => handleInputChange('category', value)}
                    options={EVENT_CATEGORIES}
                    error={validationErrors.category}
                    placeholder="Select category"
                    required
                  />
                </div>
              </div>

              <div>
                <TextArea
                  label="Address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  error={validationErrors.address}
                  placeholder="Enter full address"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="datetime-local"
                    label="Start Date & Time"
                    value={formData.start_datetime}
                    onChange={(e) => handleInputChange('start_datetime', e.target.value)}
                    error={validationErrors.start_datetime}
                    required
                  />
                </div>

                <div>
                  <Input
                    type="datetime-local"
                    label="End Date & Time"
                    value={formData.end_datetime}
                    onChange={(e) => handleInputChange('end_datetime', e.target.value)}
                    error={validationErrors.end_datetime}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ticket Types Tab */}
          {activeTab === 'tickets' && event && (
            <TicketTypesSection eventId={event.id} />
          )}

          {activeTab === 'tickets' && !event && (
            <div className="text-center py-8 text-gray-500">
              <p>Save the event first to manage ticket types</p>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <MediaUpload
              eventId={event?.id}
              media={formData.media}
              onMediaUpdate={handleMediaUpdate}
            />
          )}

          {/* Form Actions */}
          {activeTab === 'details' && (
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading && <LoadingSpinner size="sm" className="mr-2" />}
                {event ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};