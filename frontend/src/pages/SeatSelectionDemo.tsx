import React from 'react';
import { SeatSelectionContainer } from '../components/booking/SeatSelectionContainer';

const SeatSelectionDemo: React.FC = () => {
  const handleProceedToPayment = (bookingData: any) => {
    console.log('Proceeding to payment with:', bookingData);
    alert('Proceeding to payment! Check console for booking data.');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Seat Selection Demo
          </h1>
          <p className="text-gray-600">
            Interactive seat selection interface for movie bookings
          </p>
        </div>
        
        <SeatSelectionContainer
          showtimeId="demo-showtime-1"
          movieTitle="Avengers: Endgame"
          theaterName="AMC Empire 25"
          showtime="2024-01-15T19:30:00Z"
          maxSeats={6}
          onProceedToPayment={handleProceedToPayment}
        />
      </div>
    </div>
  );
};

export default SeatSelectionDemo;