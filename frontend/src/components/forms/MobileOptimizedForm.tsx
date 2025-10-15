import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, TextArea } from '../ui';

interface MobileOptimizedFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export const MobileOptimizedForm: React.FC<MobileOptimizedFormProps> = ({
  children,
  onSubmit,
  className = ''
}) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle iOS viewport height issues
  useEffect(() => {
    const handleResize = () => {
      // Update CSS custom property for mobile viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Auto-scroll to focused field on mobile
  const handleFieldFocus = (fieldName: string) => {
    setFocusedField(fieldName);
    
    // Delay to allow keyboard to appear
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && window.innerWidth < 768) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 300);
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={`
        space-y-4 md:space-y-6
        ${className}
      `}
    >
      <div className="space-y-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Add mobile-specific props to form fields
            if (child.type === Input || child.type === TextArea) {
              return React.cloneElement(child, {
                onFocus: (e: React.FocusEvent) => {
                  handleFieldFocus(child.props.name || 'field');
                  child.props.onFocus?.(e);
                },
                onBlur: (e: React.FocusEvent) => {
                  handleFieldBlur();
                  child.props.onBlur?.(e);
                },
                className: `
                  ${child.props.className || ''}
                  text-base md:text-sm
                  py-3 md:py-2
                  ${focusedField === (child.props.name || 'field') ? 'ring-2 ring-blue-500' : ''}
                `
              });
            }
          }
          return child;
        })}
      </div>
    </form>
  );
};

// Mobile-optimized input component
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 md:text-xs">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`
            block w-full rounded-lg border border-gray-300 
            px-3 py-3 md:py-2 
            text-base md:text-sm
            placeholder-gray-400
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
            disabled:bg-gray-50 disabled:text-gray-500
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Mobile-optimized button component
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm md:text-xs',
    md: 'px-6 py-3 text-base md:text-sm md:py-2',
    lg: 'px-8 py-4 text-lg md:text-base md:py-3'
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};