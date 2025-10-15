import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import { 
  BellIcon, 
  EnvelopeIcon, 
  DevicePhoneMobileIcon,
  ComputerDesktopIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { NotificationPreferences as NotificationPreferencesType } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface NotificationPreferencesProps {
  className?: string;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ className }) => {
  const { state, updatePreferences, showSuccess } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferencesType>(state.preferences);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof NotificationPreferencesType, value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCategoryToggle = (category: keyof NotificationPreferencesType['categories'], value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Here you would typically save to the backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      updatePreferences(localPreferences);
      showSuccess('Settings Saved', 'Your notification preferences have been updated.');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalPreferences(state.preferences);
  };

  const hasChanges = JSON.stringify(localPreferences) !== JSON.stringify(state.preferences);

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BellIcon className="h-5 w-5 mr-2" />
            Notification Preferences
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose how you want to receive notifications about your bookings and events.
          </p>
        </div>

        {/* Delivery Methods */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Delivery Methods</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-xs text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                checked={localPreferences.email}
                onChange={(checked) => handleToggle('email', checked)}
                className={cn(
                  localPreferences.email ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.email ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <label className="text-sm font-medium text-gray-700">SMS</label>
                  <p className="text-xs text-gray-500">Receive notifications via text message</p>
                </div>
              </div>
              <Switch
                checked={localPreferences.sms}
                onChange={(checked) => handleToggle('sms', checked)}
                className={cn(
                  localPreferences.sms ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.sms ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <label className="text-sm font-medium text-gray-700">In-App</label>
                  <p className="text-xs text-gray-500">Show notifications within the app</p>
                </div>
              </div>
              <Switch
                checked={localPreferences.inApp}
                onChange={(checked) => handleToggle('inApp', checked)}
                className={cn(
                  localPreferences.inApp ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.inApp ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>
          </div>
        </div>

        {/* Notification Categories */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Notification Types</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Booking Confirmations</label>
                <p className="text-xs text-gray-500">Notifications about booking status changes</p>
              </div>
              <Switch
                checked={localPreferences.categories.bookingConfirmations}
                onChange={(checked) => handleCategoryToggle('bookingConfirmations', checked)}
                className={cn(
                  localPreferences.categories.bookingConfirmations ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.categories.bookingConfirmations ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Event Reminders</label>
                <p className="text-xs text-gray-500">Reminders about upcoming events</p>
              </div>
              <Switch
                checked={localPreferences.categories.eventReminders}
                onChange={(checked) => handleCategoryToggle('eventReminders', checked)}
                className={cn(
                  localPreferences.categories.eventReminders ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.categories.eventReminders ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Seat Availability</label>
                <p className="text-xs text-gray-500">Real-time updates about seat availability</p>
              </div>
              <Switch
                checked={localPreferences.categories.seatAvailability}
                onChange={(checked) => handleCategoryToggle('seatAvailability', checked)}
                className={cn(
                  localPreferences.categories.seatAvailability ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.categories.seatAvailability ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">System Updates</label>
                <p className="text-xs text-gray-500">Important system announcements and maintenance</p>
              </div>
              <Switch
                checked={localPreferences.categories.systemUpdates}
                onChange={(checked) => handleCategoryToggle('systemUpdates', checked)}
                className={cn(
                  localPreferences.categories.systemUpdates ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.categories.systemUpdates ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Promotions</label>
                <p className="text-xs text-gray-500">Special offers and promotional content</p>
              </div>
              <Switch
                checked={localPreferences.categories.promotions}
                onChange={(checked) => handleCategoryToggle('promotions', checked)}
                className={cn(
                  localPreferences.categories.promotions ? 'bg-blue-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
                )}
              >
                <span
                  className={cn(
                    localPreferences.categories.promotions ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                  )}
                />
              </Switch>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Real-time Connection</label>
              <p className="text-xs text-gray-500">Status of live notification connection</p>
            </div>
            <div className="flex items-center">
              <div className={cn(
                'h-2 w-2 rounded-full mr-2',
                state.isConnected ? 'bg-green-400' : 'bg-red-400'
              )} />
              <span className="text-sm text-gray-600">
                {state.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};