import React from 'react';
import { Button } from '../ui';
import { SearchBar } from './SearchBar';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-30"></div>
      
      {/* Content */}
      <div className="relative container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 leading-tight">
          Discover Your Next
          <span className="block text-yellow-400">Adventure</span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed opacity-90">
          Find the perfect movie or event in your city. Book tickets instantly and create unforgettable memories.
        </p>
        
        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mb-8">
          <SearchBar />
        </div>
        
        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="primary" 
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3"
          >
            Explore Events
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-white text-white hover:bg-white hover:text-blue-800 px-8 py-3"
          >
            Browse Movies
          </Button>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-16 h-16 bg-white rounded-full opacity-10 animate-bounce"></div>
      <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-blue-300 rounded-full opacity-15"></div>
    </section>
  );
};