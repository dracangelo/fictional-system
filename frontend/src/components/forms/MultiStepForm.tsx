import React, { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { useFormWithAutoSave, useFormProgress } from '../../hooks/useFormWithAutoSave';
import { FormProgress, StepNavigation, CompactProgress } from '../ui/FormProgress';
import { ValidatedInput, PasswordInput, ValidatedTextArea, FormField } from '../ui/FormField';
import { Button, Card, Select } from '../ui';
import { useResponsive } from '../../hooks/useResponsive';
import { cn } from '../../utils/cn';

// Example multi-step form schema
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'At least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
  dateOfBirth: z.string().optional(),
});

const accountInfoSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['customer', 'event_owner', 'theater_owner']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const preferencesSchema = z.object({
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  interests: z.array(z.string()).optional(),
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
  }).optional(),
  marketingEmails: z.boolean().default(false),
});

const fullFormSchema = personalInfoSchema.merge(accountInfoSchema).merge(preferencesSchema);

type FormData = z.infer<typeof fullFormSchema>;

interface MultiStepFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<FormData>;
  autoSaveKey?: string;
  className?: string;
}

const formSteps = [
  {
    name: 'personal',
    label: 'Personal Info',
    description: 'Basic information about you',
    fields: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'] as (keyof FormData)[],
  },
  {
    name: 'account',
    label: 'Account Setup',
    description: 'Create your account credentials',
    fields: ['username', 'password', 'confirmPassword', 'role'] as (keyof FormData)[],
  },
  {
    name: 'preferences',
    label: 'Preferences',
    description: 'Customize your experience',
    fields: ['bio', 'interests', 'notifications', 'marketingEmails'] as (keyof FormData)[],
    optional: true,
  },
];

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  onSubmit,
  initialData,
  autoSaveKey = 'multi-step-form',
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isMobile } = useResponsive();

  const form = useFormWithAutoSave<FormData>({
    schema: fullFormSchema,
    defaultValues: initialData,
    mode: 'onChange',
    autoSave: {
      enabled: true,
      key: autoSaveKey,
      delay: 1000,
      onSave: async (data) => {
        console.log('Auto-saved form data:', data);
      },
      onRestore: (data) => {
        console.log('Restored form data:', data);
      },
    },
    realTimeValidation: {
      enabled: true,
      delay: 300,
    },
  });

  const { watch, trigger, getValues, formState: { errors } } = form;
  const watchedValues = watch();

  const progress = useFormProgress(formSteps, watchedValues);
  const completedSteps = formSteps
    .map((_, index) => index)
    .filter(index => progress.isStepComplete(index));

  // Validate current step before proceeding
  const validateCurrentStep = useCallback(async () => {
    const currentStepConfig = formSteps[currentStep];
    if (!currentStepConfig) return false;

    const fieldsToValidate = currentStepConfig.fields;
    const isValid = await trigger(fieldsToValidate);
    return isValid;
  }, [currentStep, trigger]);

  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < formSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateCurrentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      // Allow going back to previous steps
      setCurrentStep(stepIndex);
    } else if (stepIndex === currentStep + 1) {
      // Allow going to next step if current step is valid
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(stepIndex);
      }
    }
  }, [currentStep, validateCurrentStep]);

  const handleSubmit = useCallback(async () => {
    const isValid = await trigger();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const data = getValues();
      await onSubmit(data);
      form.clearAutoSave();
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [trigger, getValues, onSubmit, form]);

  // Auto-save indicator
  const AutoSaveIndicator = () => {
    if (!form.formState.hasUnsavedChanges && !form.formState.isAutoSaving) return null;

    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        {form.formState.isAutoSaving ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-blue-500" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span>Unsaved changes</span>
          </>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="First Name"
                required
                register={form.register('firstName')}
                error={errors.firstName}
                realTimeValidation
                onValidate={async (value) => {
                  if (!value || value.length < 2) return 'At least 2 characters required';
                  return undefined;
                }}
              />
              <ValidatedInput
                label="Last Name"
                required
                register={form.register('lastName')}
                error={errors.lastName}
                realTimeValidation
                onValidate={async (value) => {
                  if (!value || value.length < 2) return 'At least 2 characters required';
                  return undefined;
                }}
              />
            </div>
            
            <ValidatedInput
              label="Email Address"
              type="email"
              required
              register={form.register('email')}
              error={errors.email}
              helperText="We'll use this to send you important updates"
              realTimeValidation
              onValidate={async (value) => {
                if (!value) return 'Email is required';
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return 'Invalid email format';
                return undefined;
              }}
            />
            
            <ValidatedInput
              label="Phone Number"
              type="tel"
              register={form.register('phone')}
              error={errors.phone}
              helperText="Optional - for SMS notifications"
              placeholder="+1 (555) 123-4567"
            />
            
            <ValidatedInput
              label="Date of Birth"
              type="date"
              register={form.register('dateOfBirth')}
              error={errors.dateOfBirth}
              helperText="Optional - helps us provide age-appropriate content"
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <ValidatedInput
              label="Username"
              required
              register={form.register('username')}
              error={errors.username}
              helperText="3-20 characters, letters and numbers only"
              realTimeValidation
              onValidate={async (value) => {
                if (!value) return 'Username is required';
                if (value.length < 3) return 'At least 3 characters required';
                if (value.length > 20) return 'Maximum 20 characters allowed';
                if (!/^[a-zA-Z0-9]+$/.test(value)) return 'Only letters and numbers allowed';
                return undefined;
              }}
            />
            
            <PasswordInput
              label="Password"
              required
              register={form.register('password')}
              error={errors.password}
              showStrengthIndicator
              strengthRules={{
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: false,
              }}
            />
            
            <ValidatedInput
              label="Confirm Password"
              type="password"
              required
              register={form.register('confirmPassword')}
              error={errors.confirmPassword}
              realTimeValidation
              onValidate={async (value) => {
                const password = watchedValues.password;
                if (value !== password) return 'Passwords do not match';
                return undefined;
              }}
            />
            
            <FormField
              label="Account Type"
              required
              error={errors.role}
            >
              <Select
                placeholder="Select your role"
                options={[
                  { value: 'customer', label: 'Customer - Book events and movies' },
                  { value: 'event_owner', label: 'Event Owner - Create and manage events' },
                  { value: 'theater_owner', label: 'Theater Owner - Manage theaters and showtimes' },
                ]}
                {...form.register('role')}
              />
            </FormField>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <ValidatedTextArea
              label="Bio"
              register={form.register('bio')}
              error={errors.bio}
              helperText="Tell us a bit about yourself (optional)"
              placeholder="I'm passionate about..."
              maxLength={500}
              showCharacterCount
              autoResize
              rows={4}
            />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...form.register('notifications.email')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Email notifications</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...form.register('notifications.sms')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">SMS notifications</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...form.register('notifications.push')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Push notifications</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...form.register('marketingEmails')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Marketing emails</span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('max-w-2xl mx-auto p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
          <p className="text-gray-600 mt-2">Complete all steps to get started</p>
        </div>

        {/* Progress Indicator */}
        {isMobile ? (
          <CompactProgress
            currentStep={currentStep}
            totalSteps={formSteps.length}
            stepLabels={formSteps.map(step => step.label)}
          />
        ) : (
          <FormProgress
            steps={formSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            overallProgress={progress.calculateOverallProgress()}
            variant="horizontal"
            showLabels
            showProgress
          />
        )}

        {/* Auto-save indicator */}
        <div className="flex justify-between items-center">
          <AutoSaveIndicator />
          {form.formState.lastSaved && (
            <span className="text-xs text-gray-500">
              Last saved: {form.formState.lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <StepNavigation
            currentStep={currentStep}
            totalSteps={formSteps.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSubmit={handleSubmit}
            isNextDisabled={!progress.isStepComplete(currentStep)}
            isSubmitting={isSubmitting}
            nextLabel="Continue"
            submitLabel="Create Account"
          />
        </form>
      </div>
    </Card>
  );
};