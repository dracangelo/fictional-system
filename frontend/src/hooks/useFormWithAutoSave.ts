import { useForm } from 'react-hook-form';

// Define types locally to avoid import issues with react-hook-form
type FieldValues = Record<string, any>;
type Path<T> = keyof T;

interface UseFormProps<T extends FieldValues = FieldValues> {
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  defaultValues?: Partial<T>;
  resolver?: any;
  context?: any;
  criteriaMode?: 'firstError' | 'all';
  shouldFocusError?: boolean;
  shouldUnregister?: boolean;
  shouldUseNativeValidation?: boolean;
  delayError?: number;
}

interface UseFormReturn<T extends FieldValues = FieldValues> {
  watch: (names?: keyof T | (keyof T)[] | ((data: T, options: any) => any)) => any;
  getValues: (payload?: keyof T | (keyof T)[]) => T;
  reset: (values?: Partial<T>, options?: any) => void;
  trigger: (name?: keyof T | (keyof T)[], options?: any) => Promise<boolean>;
  setError: (name: keyof T, error: { message?: string; type?: string }) => void;
  clearErrors: (name?: keyof T | (keyof T)[]) => void;
  setValue: (name: keyof T, value: any, options?: any) => void;
  getFieldState: (name: keyof T) => any;
  formState: any;
  control: any;
  register: any;
  handleSubmit: any;
  unregister: any;
  setFocus: any;
}
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import { useDebounce } from './useDebounce';

interface UseFormWithAutoSaveOptions<T extends FieldValues> extends UseFormProps<T> {
  schema?: z.ZodSchema<T>;
  autoSave?: {
    enabled: boolean;
    delay?: number;
    key: string;
    onSave?: (data: T) => void | Promise<void>;
    onRestore?: (data: T) => void;
  };
  realTimeValidation?: {
    enabled: boolean;
    delay?: number;
    fields?: (keyof T)[];
  };
}

interface FormState<T extends FieldValues> {
  isDirty: boolean;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export function useFormWithAutoSave<T extends FieldValues>(
  options: UseFormWithAutoSaveOptions<T> = {}
): UseFormReturn<T> & {
  formState: FormState<T>;
  clearAutoSave: () => void;
  restoreFromAutoSave: () => void;
  validateField: (field: Path<T>, value: any) => Promise<string | undefined>;
} {
  const {
    schema,
    autoSave,
    realTimeValidation,
    ...formOptions
  } = options;

  // Initialize form with schema resolver if provided
  const form = useForm<T>({
    ...formOptions,
    resolver: schema ? zodResolver(schema) : formOptions.resolver,
  });

  const { watch, getValues, reset, trigger, setError, clearErrors } = form;
  
  // Watch all form values for auto-save
  const watchedValues = watch();
  const debouncedValues = useDebounce(watchedValues, autoSave?.delay || 1000);
  
  // Form state tracking
  const initialValuesRef = useRef<T | null>(null);
  const lastSavedRef = useRef<Date | null>(null);
  const isAutoSavingRef = useRef(false);

  // Initialize form state
  useEffect(() => {
    if (initialValuesRef.current === null) {
      initialValuesRef.current = getValues();
      
      // Restore from auto-save if enabled
      if (autoSave?.enabled && autoSave.key) {
        const saved = localStorage.getItem(`form_autosave_${autoSave.key}`);
        if (saved) {
          try {
            const parsedData = JSON.parse(saved);
            reset(parsedData);
            autoSave.onRestore?.(parsedData);
          } catch (error) {
            console.warn('Failed to restore auto-saved form data:', error);
          }
        }
      }
    }
  }, [autoSave, reset, getValues]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave?.enabled || !autoSave.key) return;

    const saveData = async () => {
      const currentValues = getValues();
      
      // Skip if no changes from initial values
      if (JSON.stringify(currentValues) === JSON.stringify(initialValuesRef.current)) {
        return;
      }

      isAutoSavingRef.current = true;
      
      try {
        // Save to localStorage
        localStorage.setItem(`form_autosave_${autoSave.key}`, JSON.stringify(currentValues));
        
        // Call custom save handler if provided
        if (autoSave.onSave) {
          await autoSave.onSave(currentValues);
        }
        
        lastSavedRef.current = new Date();
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isAutoSavingRef.current = false;
      }
    };

    saveData();
  }, [debouncedValues, autoSave, getValues]);

  // Real-time field validation
  const validateField = useCallback(async (field: Path<T>, value: any): Promise<string | undefined> => {
    if (!schema || !realTimeValidation?.enabled) return undefined;

    try {
      // Create a partial schema for the specific field
      const fieldSchema = schema.shape?.[field as string];
      if (fieldSchema) {
        fieldSchema.parse(value);
        clearErrors(field);
        return undefined;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors[0]?.message;
        setError(field, { message });
        return message;
      }
    }
    
    return undefined;
  }, [schema, realTimeValidation, setError, clearErrors]);

  // Real-time validation for specified fields
  useEffect(() => {
    if (!realTimeValidation?.enabled || !schema) return;

    const fieldsToValidate = realTimeValidation.fields || Object.keys(watchedValues);
    
    fieldsToValidate.forEach((field) => {
      const fieldName = field as Path<T>;
      const value = watchedValues[fieldName];
      
      if (value !== undefined) {
        validateField(fieldName, value);
      }
    });
  }, [watchedValues, realTimeValidation, schema, validateField]);

  // Clear auto-save data
  const clearAutoSave = useCallback(() => {
    if (autoSave?.key) {
      localStorage.removeItem(`form_autosave_${autoSave.key}`);
      lastSavedRef.current = null;
    }
  }, [autoSave?.key]);

  // Restore from auto-save
  const restoreFromAutoSave = useCallback(() => {
    if (!autoSave?.key) return;
    
    const saved = localStorage.getItem(`form_autosave_${autoSave.key}`);
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        reset(parsedData);
        autoSave.onRestore?.(parsedData);
      } catch (error) {
        console.error('Failed to restore auto-saved data:', error);
      }
    }
  }, [autoSave, reset]);

  // Calculate form state
  const currentValues = getValues();
  const isDirty = JSON.stringify(currentValues) !== JSON.stringify(initialValuesRef.current);
  const hasUnsavedChanges = isDirty && !isAutoSavingRef.current;

  const enhancedFormState: FormState<T> = {
    isDirty,
    isAutoSaving: isAutoSavingRef.current,
    lastSaved: lastSavedRef.current,
    hasUnsavedChanges,
  };

  return {
    ...form,
    formState: enhancedFormState,
    clearAutoSave,
    restoreFromAutoSave,
    validateField,
  };
}

// Hook for form progress tracking in multi-step forms
export function useFormProgress<T extends FieldValues>(
  steps: Array<{
    name: string;
    fields: (keyof T)[];
    optional?: boolean;
  }>,
  formValues: T
) {
  const calculateStepProgress = useCallback((stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return 0;

    const requiredFields = step.fields.filter(field => !step.optional);
    const completedFields = requiredFields.filter(field => {
      const value = formValues[field];
      return value !== undefined && value !== null && value !== '';
    });

    return requiredFields.length > 0 ? (completedFields.length / requiredFields.length) * 100 : 100;
  }, [steps, formValues]);

  const calculateOverallProgress = useCallback(() => {
    const totalSteps = steps.length;
    const completedSteps = steps.reduce((acc, _, index) => {
      return acc + (calculateStepProgress(index) / 100);
    }, 0);

    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }, [steps, calculateStepProgress]);

  const getNextIncompleteStep = useCallback(() => {
    return steps.findIndex((_, index) => calculateStepProgress(index) < 100);
  }, [steps, calculateStepProgress]);

  const isStepComplete = useCallback((stepIndex: number) => {
    return calculateStepProgress(stepIndex) === 100;
  }, [calculateStepProgress]);

  const isStepAccessible = useCallback((stepIndex: number) => {
    // A step is accessible if all previous steps are complete or if it's the first step
    if (stepIndex === 0) return true;
    
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  }, [isStepComplete]);

  return {
    calculateStepProgress,
    calculateOverallProgress,
    getNextIncompleteStep,
    isStepComplete,
    isStepAccessible,
    totalSteps: steps.length,
  };
}