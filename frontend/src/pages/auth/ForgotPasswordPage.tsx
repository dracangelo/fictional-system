import React from 'react';
import { PasswordResetForm } from '../../components/forms';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Movie & Event Booking</h1>
          <p className="mt-2 text-gray-600">Reset your password</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <PasswordResetForm />
      </div>
    </div>
  );
};