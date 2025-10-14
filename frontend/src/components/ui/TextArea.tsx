import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const textAreaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-secondary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical',
  {
    variants: {
      variant: {
        default:
          'border-secondary-300 focus-visible:ring-primary-500',
        error:
          'border-error-500 focus-visible:ring-error-500',
        success:
          'border-success-500 focus-visible:ring-success-500',
      },
      size: {
        sm: 'min-h-[60px] px-2 py-1 text-xs',
        md: 'min-h-[80px] px-3 py-2 text-sm',
        lg: 'min-h-[100px] px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textAreaVariants> {
  label?: string
  error?: string
  helperText?: string
  maxLength?: number
  showCharCount?: boolean
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      variant,
      size,
      label,
      error,
      helperText,
      maxLength,
      showCharCount = false,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const textAreaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const hasError = Boolean(error)
    const textAreaVariant = hasError ? 'error' : variant
    const currentLength = typeof value === 'string' ? value.length : 0

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textAreaId}
            className="mb-2 block text-sm font-medium text-secondary-900"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(textAreaVariants({ variant: textAreaVariant, size }), className)}
          ref={ref}
          id={textAreaId}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        <div className="mt-2 flex justify-between">
          <div>
            {(error || helperText) && (
              <p
                className={cn(
                  'text-sm',
                  hasError ? 'text-error-600' : 'text-secondary-600'
                )}
              >
                {error || helperText}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className="text-sm text-secondary-500">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export { TextArea, textAreaVariants }