import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { bookingService } from '../../services/booking';
import type { CreateBookingData, Booking, PaymentIntent } from '../../types/booking';
import type { BookingSummaryData } from '../../types/seat';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export interface PaymentStepProps {
  paymentIntent: PaymentIntent;
  bookingData: CreateBookingData;
  summaryData: BookingSummaryData;
  onSuccess: (booking: Booking) => void;
  onBack: () => void;
}

const PaymentStep: React.FC<PaymentStepProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

const PaymentForm: React.FC<PaymentStepProps> = ({
  paymentIntent,
  bookingData,
  summaryData,
  onSuccess,
  onBack,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingDetails.name,
              email: billingDetails.email,
              phone: billingDetails.phone,
              address: billingDetails.address,
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed. Please try again.');
        return;
      }

      if (confirmedPayment?.status === 'succeeded') {
        // Confirm payment with our backend
        const booking = await bookingService.confirmPayment({
          payment_intent_id: confirmedPayment.id,
          booking_id: paymentIntent.booking_id,
          status: 'succeeded',
        });

        onSuccess(booking);
      } else {
        setError('Payment was not successful. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const updateBillingDetails = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true, // We'll collect this separately
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <Card className="p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">
              {summaryData.movieTitle || 'Event Booking'}
            </h4>
            <p className="text-sm text-gray-600">
              {summaryData.selectedSeats.length} seat{summaryData.selectedSeats.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(paymentIntent.amount / 100)}
            </p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
        </div>
      </Card>

      {/* Billing Information */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={billingDetails.name}
            onChange={(e) => updateBillingDetails('name', e.target.value)}
            required
            placeholder="John Doe"
          />
          
          <Input
            label="Email Address"
            type="email"
            value={billingDetails.email}
            onChange={(e) => updateBillingDetails('email', e.target.value)}
            required
            placeholder="john@example.com"
          />
          
          <Input
            label="Phone Number"
            type="tel"
            value={billingDetails.phone}
            onChange={(e) => updateBillingDetails('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
          
          <div></div> {/* Empty cell for grid alignment */}
          
          <div className="md:col-span-2">
            <Input
              label="Address Line 1"
              value={billingDetails.address.line1}
              onChange={(e) => updateBillingDetails('address.line1', e.target.value)}
              required
              placeholder="123 Main Street"
            />
          </div>
          
          <div className="md:col-span-2">
            <Input
              label="Address Line 2 (Optional)"
              value={billingDetails.address.line2}
              onChange={(e) => updateBillingDetails('address.line2', e.target.value)}
              placeholder="Apartment, suite, etc."
            />
          </div>
          
          <Input
            label="City"
            value={billingDetails.address.city}
            onChange={(e) => updateBillingDetails('address.city', e.target.value)}
            required
            placeholder="New York"
          />
          
          <Input
            label="State"
            value={billingDetails.address.state}
            onChange={(e) => updateBillingDetails('address.state', e.target.value)}
            required
            placeholder="NY"
          />
          
          <Input
            label="ZIP Code"
            value={billingDetails.address.postal_code}
            onChange={(e) => updateBillingDetails('address.postal_code', e.target.value)}
            required
            placeholder="10001"
          />
        </div>
      </Card>

      {/* Payment Information */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="border border-gray-300 rounded-md p-3 bg-white">
              <CardElement options={cardElementOptions} />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>
      </Card>

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
              <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={processing}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          loading={processing}
          disabled={!stripe || processing || !billingDetails.name || !billingDetails.email}
          className="flex-1"
          size="lg"
        >
          {processing ? 'Processing...' : `Pay ${formatCurrency(paymentIntent.amount / 100)}`}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
        <p>Powered by Stripe. Your payment information is processed securely.</p>
      </div>
    </form>
  );
};

export { PaymentStep };