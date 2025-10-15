import React, { useState } from 'react';
import { Card, Button } from '../components/ui';
import { 
  ValidatedInput, 
  PasswordInput, 
  ValidatedTextArea, 
  FormField 
} from '../components/ui/FormField';
import { MultiStepForm } from '../components/forms/MultiStepForm';
import { useFormWithAutoSave } from '../hooks/useFormWithAutoSave';
import { 
  loginSchema, 
  eventSchema, 
  type LoginFormData, 
  type EventFormData 
} from '../utils/validation';

export const FormValidationDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'basic' | 'advanced' | 'multistep'>('basic');

  // Basic form demo
  const basicForm = useFormWithAutoSave<LoginFormData>({
    schema: loginSchema,
    autoSave: {
      enabled: true,
      key: 'demo-basic-form',
      delay: 1000,
    },
    realTimeValidation: {
      enabled: true,
      delay: 300,
    },
  });

  // Advanced form demo
  const advancedForm = useFormWithAutoSave<EventFormData>({
    schema: eventSchema,
    autoSave: {
      enabled: true,
      key: 'demo-advanced-form',
      delay: 1500,
    },
    realTimeValidation: {
      enabled: true,
      delay: 500,
    },
  });

  const handleBasicSubmit = async (data: LoginFormData) => {
    console.log('Basic form submitted:', data);
    alert('Basic form submitted successfully!');
  };

  const handleAdvancedSubmit = async (data: EventFormData) => {
    console.log('Advanced form submitted:', data);
    alert('Advanced form submitted successfully!');
  };

  const handleMultiStepSubmit = async (data: any) => {
    console.log('Multi-step form submitted:', data);
    alert('Multi-step form submitted successfully!');
  };

  const renderBasicDemo = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Basic Form Validation</h3>
      <p className="text-gray-600 mb-6">
        Demonstrates real-time validation, auto-save, and enhanced input components.
      </p>

      <form onSubmit={basicForm.handleSubmit(handleBasicSubmit)} className="space-y-4">
        <ValidatedInput
          label="Email Address"
          type="email"
          required
          register={basicForm.register('email')}
          error={basicForm.formState.errors.email}
          helperText="Enter a valid email address"
          realTimeValidation
          showValidationIcon
          onValidate={async (value) => {
            if (!value) return 'Email is required';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return 'Invalid email format';
            // Simulate async validation (e.g., checking if email exists)
            await new Promise(resolve => setTimeout(resolve, 500));
            if (value === 'taken@example.com') return 'This email is already taken';
            return undefined;
          }}
        />

        <PasswordInput
          label="Password"
          required
          register={basicForm.register('password')}
          error={basicForm.formState.errors.password}
          showStrengthIndicator
          strengthRules={{
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
          }}
        />

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            {basicForm.formState.isAutoSaving && (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-blue-500" />
                <span>Auto-saving...</span>
              </span>
            )}
            {basicForm.formState.lastSaved && (
              <span>Last saved: {basicForm.formState.lastSaved.toLocaleTimeString()}</span>
            )}
          </div>

          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={basicForm.clearAutoSave}
            >
              Clear Auto-save
            </Button>
            <Button type="submit">
              Submit
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );

  const renderAdvancedDemo = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Advanced Form Validation</h3>
      <p className="text-gray-600 mb-6">
        Complex form with multiple field types, conditional validation, and auto-resize.
      </p>

      <form onSubmit={advancedForm.handleSubmit(handleAdvancedSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Event Title"
            required
            register={advancedForm.register('title')}
            error={advancedForm.formState.errors.title}
            helperText="3-200 characters"
            realTimeValidation
            onValidate={async (value) => {
              if (!value) return 'Title is required';
              if (value.length < 3) return 'At least 3 characters required';
              if (value.length > 200) return 'Maximum 200 characters allowed';
              return undefined;
            }}
          />

          <ValidatedInput
            label="Venue"
            required
            register={advancedForm.register('venue')}
            error={advancedForm.formState.errors.venue}
            helperText="Where will the event take place?"
          />
        </div>

        <ValidatedTextArea
          label="Event Description"
          required
          register={advancedForm.register('description')}
          error={advancedForm.formState.errors.description}
          helperText="Describe your event in detail"
          maxLength={2000}
          showCharacterCount
          autoResize
          rows={4}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ValidatedInput
            label="Start Date & Time"
            type="datetime-local"
            required
            register={advancedForm.register('startDateTime')}
            error={advancedForm.formState.errors.startDateTime}
          />

          <ValidatedInput
            label="End Date & Time"
            type="datetime-local"
            required
            register={advancedForm.register('endDateTime')}
            error={advancedForm.formState.errors.endDateTime}
          />

          <ValidatedInput
            label="Capacity"
            type="number"
            required
            register={advancedForm.register('capacity', { valueAsNumber: true })}
            error={advancedForm.formState.errors.capacity}
            helperText="Maximum attendees"
            min={1}
            max={100000}
          />
        </div>

        <ValidatedTextArea
          label="Address"
          required
          register={advancedForm.register('address')}
          error={advancedForm.formState.errors.address}
          helperText="Full address including city and state"
          maxLength={500}
          showCharacterCount
        />

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            {advancedForm.formState.hasUnsavedChanges && (
              <span className="flex items-center space-x-2 text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Unsaved changes</span>
              </span>
            )}
          </div>

          <Button type="submit">
            Create Event
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderMultiStepDemo = () => (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Multi-Step Form</h3>
        <p className="text-gray-600">
          Complete registration with progress tracking and auto-save.
        </p>
      </div>
      
      <MultiStepForm
        onSubmit={handleMultiStepSubmit}
        autoSaveKey="demo-multistep-form"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Form Validation & Input Handling Demo
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive form validation with real-time feedback, auto-save, and progress tracking.
          </p>
        </div>

        {/* Demo Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setActiveDemo('basic')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeDemo === 'basic'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Basic Validation
            </button>
            <button
              onClick={() => setActiveDemo('advanced')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeDemo === 'advanced'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Advanced Form
            </button>
            <button
              onClick={() => setActiveDemo('multistep')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeDemo === 'multistep'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Multi-Step Form
            </button>
          </div>
        </div>

        {/* Demo Content */}
        <div className="space-y-8">
          {activeDemo === 'basic' && renderBasicDemo()}
          {activeDemo === 'advanced' && renderAdvancedDemo()}
          {activeDemo === 'multistep' && renderMultiStepDemo()}
        </div>

        {/* Features List */}
        <Card className="mt-12 p-6">
          <h3 className="text-lg font-semibold mb-4">Features Demonstrated</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Validation Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time field validation</li>
                <li>• Comprehensive Zod schemas</li>
                <li>• Custom validation functions</li>
                <li>• Password strength indicators</li>
                <li>• Character count limits</li>
                <li>• Cross-field validation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">UX Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Auto-save functionality</li>
                <li>• Progress tracking</li>
                <li>• Multi-step navigation</li>
                <li>• Responsive design</li>
                <li>• Accessibility compliance</li>
                <li>• Loading states</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};