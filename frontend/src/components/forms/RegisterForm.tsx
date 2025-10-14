import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { Button, Input, Select, Card } from '../ui';
import { registerSchema, type RegisterFormData } from '../../utils/validation';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const roleOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'event_owner', label: 'Event Owner' },
  { value: 'theater_owner', label: 'Theater Owner' },
];

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerUser(data);
      navigate('/dashboard', { replace: true });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'customer':
        return 'Book tickets for events and movies';
      case 'event_owner':
        return 'Create and manage events with ticketing';
      case 'theater_owner':
        return 'Manage theaters, movies, and showtimes';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600 mt-2">Join us to start booking or managing events.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            placeholder="Enter your first name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />

          <Input
            label="Last Name"
            type="text"
            placeholder="Enter your last name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Select
          label="Account Type"
          placeholder="Select your role"
          options={roleOptions}
          error={errors.role?.message}
          {...register('role')}
        />

        {selectedRole && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
            {getRoleDescription(selectedRole)}
          </div>
        )}

        <Input
          label="Password"
          type="password"
          placeholder="Create a password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
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
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
};