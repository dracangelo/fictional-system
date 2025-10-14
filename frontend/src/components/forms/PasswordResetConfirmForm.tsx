import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { Button, Input, Card } from '../ui';
import { passwordResetConfirmSchema, type PasswordResetConfirmFormData } from '../../utils/validation';

interface PasswordResetConfirmFormProps {
  onSuccess?: () => void;
}

export const PasswordResetConfirmForm: React.FC<PasswordResetConfirmFormProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PasswordResetConfirmFormData>({
    resolver: zodResolver(passwordResetConfirmSchema),
  });

  // Set token from URL params
  React.useEffect(() => {
    if (token) {
      setValue('token', token);
    }
  }, [token, setValue]);

  const onSubmit = async (data: PasswordResetConfirmFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(data);
      setSuccess(true);
      onSuccess?.();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Request New Reset Link
          </Link>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You will be redirected to the sign in page
            shortly.
          </p>
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign In Now
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Set New Password</h2>
        <p className="text-gray-600 mt-2">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <input type="hidden" {...register('token')} />

        <Input
          label="New Password"
          type="password"
          placeholder="Enter your new password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Confirm your new password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
          Back to Sign In
        </Link>
      </div>
    </Card>
  );
};