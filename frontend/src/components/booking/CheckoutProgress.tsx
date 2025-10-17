import React from 'react';
import { cn } from '../../utils/cn';

export interface CheckoutProgressProps<T extends string = string> {
  steps: Array<{
    id: T;
    name: string;
    completed: boolean;
  }>;
  currentStep: T;
}

const CheckoutProgress = <T extends string = string>({ steps, currentStep }: CheckoutProgressProps<T>) => {
  const getStepIndex = (stepId: T) => steps.findIndex(step => step.id === stepId);
  const currentStepIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => {
          const isCompleted = stepIdx < currentStepIndex;
          const isCurrent = stepIdx === currentStepIndex;
          const isUpcoming = stepIdx > currentStepIndex;

          return (
            <li key={step.id} className={cn(
              stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '',
              'relative'
            )}>
              {/* Connector Line */}
              {stepIdx !== steps.length - 1 && (
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={cn(
                    'h-0.5 w-full',
                    isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                  )} />
                </div>
              )}

              {/* Step Circle and Content */}
              <div className="relative flex items-center space-x-2">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  isCompleted && 'border-primary-600 bg-primary-600',
                  isCurrent && 'border-primary-600 bg-white',
                  isUpcoming && 'border-gray-300 bg-white'
                )}>
                  {isCompleted ? (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={cn(
                      'text-sm font-medium',
                      isCurrent ? 'text-primary-600' : 'text-gray-500'
                    )}>
                      {stepIdx + 1}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex flex-col">
                  <span className={cn(
                    'text-sm font-medium',
                    isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                  )}>
                    {step.name}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { CheckoutProgress };