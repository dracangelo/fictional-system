import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button, Card, LoadingSpinner } from '@/components/ui';
import { 
  SeatSelectionContainer,
  CheckoutProgress,
  BookingSummaryStep,
  PaymentStep,
  ConfirmationStep
} from '@/components/booking';
import { useNotifications } from '@/contexts/NotificationContext';
import type { Event, ShowTime } from '../../types/event';
import type { Seat, Booking, BookingStep } from '../../types/booking';

const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showWarning, showSuccess } = useNotifications();

  const [currentStep, setCurrentStep] = useState<BookingStep>('seats');
  const [event, setEvent] = useState<Event | null>(null);
  const [showTime, setShowTime] = useState<ShowTime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get event and showtime from location state or fetch from API
    const stateData = location.state as { event?: Event; showTime?: ShowTime };
    
    if (stateData?.event && stateData?.showTime) {
      setEvent(stateData.event);
      setShowTime(stateData.showTime);
      setLoading(false);
    } else if (id) {
      // Fallback: fetch event data if not passed through state
      fetchEventData();
    } else {
      navigate('/events');
    }
  }, [id, location.state, navigate]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in eventService
      // const eventData = await eventService.getEvent(id);
      // setEvent(eventData);
      // For now, redirect to events if no data
      navigate('/events');
    } catch (err) {
      showError('Failed to load event data', 'Unable to load event information. Please try again.');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatSelection = (seats: Seat[]) => {
    setSelectedSeats(seats);
  };

  const handleContinueToSummary = () => {
    if (selectedSeats.length === 0) {
      showWarning('Please select at least one seat', 'You need to select seats before continuing to the summary.');
      return;
    }
    setCurrentStep('summary');
  };

  const handleContinueToPayment = () => {
    setCurrentStep('payment');
  };



  const handleBackStep = () => {
    switch (currentStep) {
      case 'summary':
        setCurrentStep('seats');
        break;
      case 'payment':
        setCurrentStep('summary');
        break;
      case 'confirmation':
        navigate('/bookings');
        break;
      default:
        navigate(`/events/${id}`);
    }
  };

  const calculateTotal = () => {
    if (!showTime || selectedSeats.length === 0) return 0;
    return selectedSeats.reduce((total, seat) => {
      const seatPrice = showTime.basePrice + (seat.priceModifier || 0);
      return total + seatPrice;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!event || !showTime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Available</h1>
        <p className="text-gray-600 mb-6">Unable to load booking information.</p>
        <Button onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </div>
    );
  }

  const steps: Array<{
    id: BookingStep;
    name: string;
    completed: boolean;
  }> = [
    { id: 'seats', name: 'Select Seats', completed: currentStep !== 'seats' },
    { id: 'summary', name: 'Review Booking', completed: ['payment', 'confirmation'].includes(currentStep) },
    { id: 'payment', name: 'Payment', completed: currentStep === 'confirmation' },
    { id: 'confirmation', name: 'Confirmation', completed: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackStep}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{event.title}</h1>
                <p className="text-sm text-gray-600">
                  {new Date(showTime.startTime).toLocaleDateString()} at{' '}
                  {new Date(showTime.startTime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
            
            {selectedSeats.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-lg font-semibold text-primary-600">
                  ${calculateTotal().toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <CheckoutProgress<BookingStep> steps={steps} currentStep={currentStep} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'seats' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Your Seats</h2>
                <SeatSelectionContainer
                  showtimeId={showTime.id}
                  movieTitle={event.title}
                  theaterName={showTime.theater?.name}
                  showtime={showTime.startTime}
                  onProceedToPayment={(bookingData) => {
                    // Handle the booking data from seat selection
                    setSelectedSeats(bookingData.selectedSeats);
                    handleContinueToSummary();
                  }}
                />
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Selected Seats:</span>
                    <span>{selectedSeats.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Price per seat:</span>
                    <span>${showTime.basePrice}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  onClick={handleContinueToSummary}
                  disabled={selectedSeats.length === 0}
                  className="w-full"
                >
                  Continue to Summary
                </Button>
              </Card>
            </div>
          </div>
        )}

        {currentStep === 'summary' && (
          <BookingSummaryStep
            bookingData={{
              booking_type: 'event',
              event: event.id,
              showtime: showTime.id,
              tickets: selectedSeats.map(seat => ({
                seat_number: seat.seatNumber,
                ticket_type: seat.type,
                quantity: 1
              }))
            }}
            summaryData={{
              movieTitle: event.title,
              theaterName: showTime.theater?.name,
              showtime: showTime.startTime,
              selectedSeats: selectedSeats.map(seat => ({
                id: seat.seatNumber,
                category: seat.type,
                price: showTime.basePrice + (seat.priceModifier || 0)
              })),
              subtotal: calculateTotal(),
              fees: 0,
              taxes: 0,
              total: calculateTotal()
            }}
            onNext={handleContinueToPayment}
            onCancel={handleBackStep}
          />
        )}

        {currentStep === 'payment' && (
          <PaymentStep
            paymentIntent={{
              id: 'temp-payment-intent',
              client_secret: 'temp-client-secret',
              amount: calculateTotal() * 100, // Convert to cents
              booking_id: 'temp-booking-id'
            }}
            bookingData={{
              booking_type: 'event',
              event: event.id,
              showtime: showTime.id,
              tickets: selectedSeats.map(seat => ({
                seat_number: seat.seatNumber,
                ticket_type: seat.type,
                quantity: 1
              }))
            }}
            summaryData={{
              movieTitle: event.title,
              theaterName: showTime.theater?.name,
              showtime: showTime.startTime,
              selectedSeats: selectedSeats.map(seat => ({
                id: seat.seatNumber,
                category: seat.type,
                price: showTime.basePrice + (seat.priceModifier || 0)
              })),
              subtotal: calculateTotal(),
              fees: 0,
              taxes: 0,
              total: calculateTotal()
            }}
            onSuccess={(booking) => {
              setBookingData(booking);
              setCurrentStep('confirmation');
              showSuccess('Booking confirmed successfully!', 'Your booking has been confirmed and tickets have been sent to your email.');
            }}
            onBack={handleBackStep}
          />
        )}

        {currentStep === 'confirmation' && bookingData && (
          <ConfirmationStep
            booking={bookingData}
            onComplete={() => navigate('/bookings')}
          />
        )}
      </div>
    </div>
  );
};

export default BookingPage;