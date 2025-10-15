import React from 'react'
import { TheaterOwnerDashboard } from '../../components/theaters'

const TheaterOwnerDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="container mx-auto px-4 py-8">
        <TheaterOwnerDashboard />
      </div>
    </div>
  )
};

export default TheaterOwnerDashboardPage;