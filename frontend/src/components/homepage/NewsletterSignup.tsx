import React, { useState } from 'react';
import { Button, Input } from '../ui';
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface NewsletterFormData {
  email: string;
  preferences: {
    events: boolean;
    movies: boolean;
    deals: boolean;
  };
}

export const NewsletterSignup: React.FC = () => {
  const [formData, setFormData] = useState<NewsletterFormData>({
    email: '',
    preferences: {
      events: true,
      movies: true,
      deals: true,
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({ ...prev, email }));
    if (error) setError('');
  };

  const handlePreferenceChange = (preference: keyof NewsletterFormData['preferences']) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: !prev.preferences[preference]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Mock API call - replace with actual newsletter service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Newsletter signup:', formData);
      setIsSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          email: '',
          preferences: {
            events: true,
            movies: true,
            deals: true,
          }
        });
      }, 3000);
      
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="py-16 bg-gradient-to-r from-green-500 to-green-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto bg-white rounded-lg p-8 shadow-lg">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Aboard!
            </h3>
            <p className="text-gray-600">
              Thank you for subscribing to our newsletter. You'll receive the latest updates about events, movies, and exclusive deals.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-700">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Header */}
          <div className="mb-8">
            <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stay in the Loop
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Get the latest updates on upcoming events, movie releases, and exclusive deals delivered straight to your inbox.
            </p>
          </div>

          {/* Newsletter Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 md:p-8 shadow-xl text-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Email Input Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-left">Subscribe Now</h3>
                
                <div className="space-y-4">
                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleEmailChange}
                    error={error}
                    required
                    className="text-base"
                  />
                  
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    disabled={isSubmitting || !formData.email.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? 'Subscribing...' : 'Subscribe Now'}
                  </Button>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-left">What interests you?</h3>
                
                <div className="space-y-3 text-left">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.preferences.events}
                      onChange={() => handlePreferenceChange('events')}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium">Live Events</span>
                      <p className="text-sm text-gray-600">Concerts, festivals, comedy shows, and more</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.preferences.movies}
                      onChange={() => handlePreferenceChange('movies')}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium">Movies</span>
                      <p className="text-sm text-gray-600">New releases, showtimes, and cinema updates</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.preferences.deals}
                      onChange={() => handlePreferenceChange('deals')}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium">Exclusive Deals</span>
                      <p className="text-sm text-gray-600">Early bird discounts and special offers</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="font-semibold mb-4">Why subscribe?</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Early access to tickets</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Exclusive discounts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Personalized recommendations</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <p className="text-xs text-gray-500 mt-6">
              By subscribing, you agree to receive marketing emails from us. You can unsubscribe at any time. 
              We respect your privacy and will never share your information with third parties.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};