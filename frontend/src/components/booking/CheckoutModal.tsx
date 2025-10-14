import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckoutProgress } from './CheckoutProgress';
import { BookingSummaryStep } from './BookingSummaryStep';
import { PaymentStep } from './PaymentStep';
import { ConfirmationStep } from './ConfirmationStep';
import { bookingService } from '../../services/booking';
import type { Booking, CreateBookingData } from '../../types/booking';
import type { BookingSummaryData } from '../../types/seat';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: CreateBookingData;
  summaryData: BookingSummaryData;
  onSuccess: (booking: Booking) => void;
}

type CheckoutStep = 'summary' | 'payment' | 'confirmation';

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  bookingData,
  summaryData,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('summary');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('summary');
      setBooking(null);
      setPaymentIntent(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSummaryNext = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const intent = await bookingService.createPaymentIntent(bookingData);
      setPaymentIntent(intent);
      setCurrentStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (confirmedBooking: Booking) => {
    setBooking(confirmedBooking);
    setCurrentStep('confirmation');
  };

  const handleConfirmationComplete = () => {
    if (booking) {
      onSuccess(booking);
    }
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 'payment') {
      setCurrentStep('summary');
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'summary':
        return 'Review Your Booking';
      case 'payment':
        return 'Payment Details';
      case 'confirmation':
        return 'Booking Confirmed';
      default:
        return 'Checkout';
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={getStepTitle()}
      closeOnOverlayClick={false}
      closeOnEscape={currentStep !== 'payment'} // Prevent accidental close during payment
    >
      <div className="space-y-6">
        {/* Progress Indicator */}
        <CheckoutProgress currentStep={currentStep} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Payment Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 'summary' && (
          <BookingSummaryStep
            bookingData={bookingData}
            summaryData={summaryData}
            onNext={handleSummaryNext}
            onCancel={onClose}
            loading={loading}
          />
        )}

        {currentStep === 'payment' && paymentIntent && (
          <PaymentStep
            paymentIntent={paymentIntent}
            bookingData={bookingData}
            summaryData={summaryData}
            onSuccess={handlePaymentSuccess}
            onBack={handleBack}
          />
        )}

        {currentStep === 'confirmation' && booking && (
          <ConfirmationStep
            booking={booking}
            onComplete={handleConfirmationComplete}
          />
        )}
      </div>
    </Modal>
  );
};

export { CheckoutModal };