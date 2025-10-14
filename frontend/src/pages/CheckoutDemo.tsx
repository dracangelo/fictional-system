import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CheckoutModal } from '../components/booking/CheckoutModal';
import type { CreateBookingData, Booking } from '../types/booking';
import type { BookingSummaryData } from '../types/seat';

const CheckoutDemo: React.FC = () => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Mock data for demonstration
  const mockBookingData: CreateBookingData = {
    booking_type: 'movie',
    showtime: 'showtime-123',
    tickets: [
      { seat_number: 'A1', ticket_type: 'regular' },
      { seat_number: 'A2', ticket_type: 'regular' },
    ],
    payment_method: {
      type: 'stripe',
      token: '', // This will be filled by Stripe
    },
  };

  const mockSummaryData: BookingSummaryData = {
    selectedSeats: [
      {
        id: 'A1',
        category: 'regular',
        price: 12.50,
        available: false,
      },
      {
        id: 'A2',
        category: 'regular',
        price: 12.50,
        available: false,
      },
    ],
    subtotal: 25.00,
    fees: 2.50,
    taxes: 2.25,
    total: 29.75,
    movieTitle: 'Avengers: Endgame',
    theaterName: 'AMC Empire 25',
    showtime: '2024-01-15T19:30:00Z',
  };

  const handleCheckoutSuccess = (booking: Booking) => {
    console.log('Booking successful:', booking);
    // In a real app, you might redirect to a success page or update the UI
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Checkout Flow Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This demo showcases the complete checkout flow including booking summary, 
            payment processing with Stripe, and confirmation with ticket download.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Movie/Event Info */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {mockSummaryData.movieTitle}
                </h3>
                <p className="text-gray-600">{mockSummaryData.theaterName}</p>
                <p className="text-gray-600">
                  {new Date(mockSummaryData.showtime!).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Selected Seats</h4>
                <div className="flex gap-2 mb-4">
                  {mockSummaryData.selectedSeats.map(seat => (
                    <span
                      key={seat.id}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                    >
                      {seat.id}
                    </span>
                  ))}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(mockSummaryData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fees</span>
                    <span>{formatCurrency(mockSummaryData.fees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxes</span>
                    <span>{formatCurrency(mockSummaryData.taxes)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(mockSummaryData.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Demo Controls */}
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Demo Instructions
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    Click the button below to open the checkout modal and experience 
                    the complete booking flow.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-yellow-800">
                      <strong>Note:</strong> This is a demo using Stripe's test mode. 
                      Use test card number <code className="bg-yellow-100 px-1 rounded">4242 4242 4242 4242</code> 
                      with any future expiry date and any 3-digit CVC.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Features Demonstrated:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Multi-step checkout process
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Booking summary with discount codes
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Secure Stripe payment processing
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Booking confirmation with ticket download
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Form validation and error handling
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Progress indicators and loading states
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full"
                size="lg"
              >
                Start Checkout Process
              </Button>
            </div>
          </Card>
        </div>

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          bookingData={mockBookingData}
          summaryData={mockSummaryData}
          onSuccess={handleCheckoutSuccess}
        />
      </div>
    </div>
  );
};

export default CheckoutDemo;