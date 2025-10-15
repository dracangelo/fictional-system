import React from 'react';
import { Check, Circle, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FormProgressStep {
  name: string;
  label: string;
  description?: string;
  optional?: boolean;
}

interface FormProgressProps {
  steps: FormProgressStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showProgress?: boolean;
  overallProgress?: number;
}

export const FormProgress: React.FC<FormProgressProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className = '',
  variant = 'horizontal',
  showLabels = true,
  showProgress = true,
  overallProgress = 0,
}) => {
  const isStepComplete = (stepIndex: number) => completedSteps.includes(stepIndex);
  const isStepCurrent = (stepIndex: number) => stepIndex === currentStep;
  const isStepAccessible = (stepIndex: number) => {
    // First step is always accessible
    if (stepIndex === 0) return true;
    // Step is accessible if all previous steps are complete
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  };

  const getStepIcon = (stepIndex: number) => {
    if (isStepComplete(stepIndex)) {
      return <Check className="w-4 h-4" />;
    }
    if (isStepCurrent(stepIndex)) {
      return <Circle className="w-4 h-4 fill-current" />;
    }
    if (!isStepAccessible(stepIndex)) {
      return <Lock className="w-4 h-4" />;
    }
    return <span className="text-sm font-medium">{stepIndex + 1}</span>;
  };

  const getStepClasses = (stepIndex: number) => {
    const baseClasses = 'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200';
    
    if (isStepComplete(stepIndex)) {
      return cn(baseClasses, 'bg-green-500 border-green-500 text-white');
    }
    if (isStepCurrent(stepIndex)) {
      return cn(baseClasses, 'bg-blue-500 border-blue-500 text-white');
    }
    if (isStepAccessible(stepIndex)) {
      return cn(baseClasses, 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 cursor-pointer');
    }
    return cn(baseClasses, 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed');
  };

  const getConnectorClasses = (stepIndex: number) => {
    const isCompleted = isStepComplete(stepIndex) && (stepIndex + 1 < steps.length ? isStepComplete(stepIndex + 1) : true);
    return cn(
      'transition-all duration-200',
      variant === 'horizontal' ? 'h-0.5 flex-1' : 'w-0.5 h-8',
      isCompleted ? 'bg-green-500' : 'bg-gray-200'
    );
  };

  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {steps.map((step, index) => (
          <div key={step.name} className="flex items-start space-x-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => isStepAccessible(index) && onStepClick?.(index)}
                className={getStepClasses(index)}
                disabled={!isStepAccessible(index)}
                aria-label={`Step ${index + 1}: ${step.label}`}
              >
                {getStepIcon(index)}
              </button>
              {index < steps.length - 1 && (
                <div className={getConnectorClasses(index)} />
              )}
            </div>
            
            {showLabels && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={cn(
                    'text-sm font-medium',
                    isStepCurrent(index) ? 'text-blue-600' : 'text-gray-900'
                  )}>
                    {step.label}
                  </h3>
                  {step.optional && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      Optional
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {showProgress && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.name}>
            <div className="flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={() => isStepAccessible(index) && onStepClick?.(index)}
                className={getStepClasses(index)}
                disabled={!isStepAccessible(index)}
                aria-label={`Step ${index + 1}: ${step.label}`}
              >
                {getStepIcon(index)}
              </button>
              
              {showLabels && (
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <span className={cn(
                      'text-xs font-medium',
                      isStepCurrent(index) ? 'text-blue-600' : 'text-gray-700'
                    )}>
                      {step.label}
                    </span>
                    {step.optional && (
                      <span className="text-xs text-gray-400">(Optional)</span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1 max-w-20 truncate">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {index < steps.length - 1 && (
              <div className={getConnectorClasses(index)} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Compact progress indicator for mobile
interface CompactProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  className?: string;
}

export const CompactProgress: React.FC<CompactProgressProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  className = '',
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>
          Step {currentStep + 1} of {totalSteps}
          {stepLabels && stepLabels[currentStep] && `: ${stepLabels[currentStep]}`}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Step navigation component
interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  submitLabel?: string;
  className?: string;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  isNextDisabled = false,
  isPreviousDisabled = false,
  isSubmitting = false,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  submitLabel = 'Submit',
  className = '',
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className={cn('flex justify-between items-center pt-6 border-t', className)}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirstStep || isPreviousDisabled}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          isFirstStep || isPreviousDisabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
        )}
      >
        {previousLabel}
      </button>

      <div className="flex space-x-2">
        {!isLastStep ? (
          <button
            type="button"
            onClick={onNext}
            disabled={isNextDisabled}
            className={cn(
              'px-6 py-2 text-sm font-medium rounded-md transition-colors',
              isNextDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {nextLabel}
          </button>
        ) : (
          <button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              'px-6 py-2 text-sm font-medium rounded-md transition-colors',
              isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            )}
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        )}
      </div>
    </div>
  );
};