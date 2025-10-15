import React, { useState, useCallback, useEffect } from 'react';
import { UseFormRegisterReturn, FieldError } from 'react-hook-form';
import { Eye, EyeOff, Check, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useDebounce';

interface BaseFieldProps {
  label?: string;
  error?: string | FieldError;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  onValidate?: (value: any) => Promise<string | undefined> | string | undefined;
  showValidationIcon?: boolean;
  realTimeValidation?: boolean;
  validationDelay?: number;
}

interface FormFieldProps extends BaseFieldProps {
  children: React.ReactNode;
}

// Base form field wrapper
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  className = '',
  id,
}) => {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const hasError = Boolean(errorMessage);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className={cn(
            'block text-sm font-medium',
            hasError ? 'text-red-700' : 'text-gray-700'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { id: fieldId });
          }
          return child;
        })}
      </div>
      
      {(errorMessage || helperText) && (
        <div className="flex items-start space-x-1">
          {hasError && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
          {!hasError && helperText && <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
          <p className={cn(
            'text-sm',
            hasError ? 'text-red-600' : 'text-gray-500'
          )}>
            {errorMessage || helperText}
          </p>
        </div>
      )}
    </div>
  );
};

// Enhanced input with real-time validation
interface ValidatedInputProps extends 
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
  BaseFieldProps {
  register?: UseFormRegisterReturn;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  error,
  helperText,
  required,
  disabled,
  className = '',
  register,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  type = 'text',
  onValidate,
  showValidationIcon = true,
  realTimeValidation = false,
  validationDelay = 500,
  ...props
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isValid, setIsValid] = useState<boolean | undefined>();
  const [internalValue, setInternalValue] = useState(props.value || '');
  
  const debouncedValue = useDebounce(internalValue, validationDelay);
  
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const displayError = validationError || errorMessage;
  const hasError = Boolean(displayError);
  
  // Real-time validation
  useEffect(() => {
    if (!realTimeValidation || !onValidate || !debouncedValue) return;
    
    const validateAsync = async () => {
      setIsValidating(true);
      try {
        const result = await onValidate(debouncedValue);
        setValidationError(result);
        setIsValid(!result);
      } catch (err) {
        setValidationError('Validation failed');
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };
    
    validateAsync();
  }, [debouncedValue, onValidate, realTimeValidation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInternalValue(value);
    register?.onChange(e);
    props.onChange?.(e);
    
    // Reset validation state on change
    if (realTimeValidation) {
      setIsValid(undefined);
      setValidationError(undefined);
    }
  }, [register, props, realTimeValidation]);

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  const variantClasses = {
    default: 'border border-gray-300 bg-white',
    filled: 'border-0 bg-gray-100',
    outlined: 'border-2 border-gray-300 bg-transparent',
  };

  const inputClasses = cn(
    'w-full rounded-md transition-all duration-200',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    sizeClasses[size],
    variantClasses[variant],
    leftIcon && 'pl-10',
    (rightIcon || showValidationIcon) && 'pr-10',
    hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    isValid && 'border-green-500 focus:border-green-500 focus:ring-green-500',
    className
  );

  const getValidationIcon = () => {
    if (!showValidationIcon) return null;
    
    if (isValidating) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
      );
    }
    
    if (hasError) {
      return <X className="w-4 h-4 text-red-500" />;
    }
    
    if (isValid) {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    
    return null;
  };

  return (
    <FormField
      label={label}
      error={displayError}
      helperText={helperText}
      required={required}
      className={className}
    >
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          {...props}
          {...register}
          type={type}
          disabled={disabled}
          className={inputClasses}
          onChange={handleChange}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {rightIcon && <div className="text-gray-400">{rightIcon}</div>}
          {getValidationIcon()}
        </div>
      </div>
    </FormField>
  );
};

// Password input with strength indicator
interface PasswordInputProps extends Omit<ValidatedInputProps, 'type'> {
  showStrengthIndicator?: boolean;
  strengthRules?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  };
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showStrengthIndicator = true,
  strengthRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  
  const calculateStrength = useCallback((value: string) => {
    let score = 0;
    const checks = {
      length: value.length >= (strengthRules.minLength || 8),
      uppercase: strengthRules.requireUppercase ? /[A-Z]/.test(value) : true,
      lowercase: strengthRules.requireLowercase ? /[a-z]/.test(value) : true,
      numbers: strengthRules.requireNumbers ? /\d/.test(value) : true,
      special: strengthRules.requireSpecialChars ? /[!@#$%^&*(),.?":{}|<>]/.test(value) : true,
    };
    
    Object.values(checks).forEach(check => {
      if (check) score++;
    });
    
    return { score, checks, maxScore: Object.keys(checks).length };
  }, [strengthRules]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    props.onChange?.(e);
  }, [props]);

  const strength = calculateStrength(password);
  const strengthPercentage = (strength.score / strength.maxScore) * 100;
  
  const getStrengthColor = () => {
    if (strengthPercentage < 40) return 'bg-red-500';
    if (strengthPercentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage < 40) return 'Weak';
    if (strengthPercentage < 70) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="space-y-3">
      <ValidatedInput
        {...props}
        type={showPassword ? 'text' : 'password'}
        onChange={handlePasswordChange}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />
      
      {showStrengthIndicator && password && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Password strength:</span>
            <span className={cn(
              'font-medium',
              strengthPercentage < 40 && 'text-red-600',
              strengthPercentage >= 40 && strengthPercentage < 70 && 'text-yellow-600',
              strengthPercentage >= 70 && 'text-green-600'
            )}>
              {getStrengthLabel()}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn('h-2 rounded-full transition-all duration-300', getStrengthColor())}
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(strength.checks).map(([rule, passed]) => (
              <div key={rule} className={cn(
                'flex items-center space-x-1',
                passed ? 'text-green-600' : 'text-gray-400'
              )}>
                {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>
                  {rule === 'length' && `At least ${strengthRules.minLength} characters`}
                  {rule === 'uppercase' && 'Uppercase letter'}
                  {rule === 'lowercase' && 'Lowercase letter'}
                  {rule === 'numbers' && 'Number'}
                  {rule === 'special' && 'Special character'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced textarea with character count
interface ValidatedTextAreaProps extends 
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  BaseFieldProps {
  register?: UseFormRegisterReturn;
  maxLength?: number;
  showCharacterCount?: boolean;
  autoResize?: boolean;
}

export const ValidatedTextArea: React.FC<ValidatedTextAreaProps> = ({
  label,
  error,
  helperText,
  required,
  disabled,
  className = '',
  register,
  maxLength,
  showCharacterCount = true,
  autoResize = false,
  ...props
}) => {
  const [value, setValue] = useState(props.value || '');
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const hasError = Boolean(errorMessage);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    register?.onChange(e);
    props.onChange?.(e);
    
    // Auto-resize functionality
    if (autoResize) {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
  }, [register, props, autoResize]);

  const textareaClasses = cn(
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:border-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    'resize-none',
    hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    className
  );

  const characterCount = String(value).length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <FormField
      label={label}
      error={errorMessage}
      helperText={helperText}
      required={required}
    >
      <div className="space-y-2">
        <textarea
          {...props}
          {...register}
          disabled={disabled}
          className={textareaClasses}
          onChange={handleChange}
          maxLength={maxLength}
        />
        
        {showCharacterCount && maxLength && (
          <div className="flex justify-end">
            <span className={cn(
              'text-xs',
              isOverLimit ? 'text-red-500' : 'text-gray-500'
            )}>
              {characterCount}/{maxLength}
            </span>
          </div>
        )}
      </div>
    </FormField>
  );
};