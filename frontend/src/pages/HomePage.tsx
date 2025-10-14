import React from 'react';
import {
  HeroSection,
  SearchSection,
  TrendingMoviesCarousel,
  UpcomingEventsCarousel,
  FeaturedVenuesSection,
  NewsletterSignup,
} from '../components/homepage';
import { MainLayout } from '../components/layout';

const HomePage: React.FC = () => {
  return (
    <MainLayout>
      <HeroSection />
      <SearchSection />
      <TrendingMoviesCarousel />
      <UpcomingEventsCarousel />
      <FeaturedVenuesSection />
      <NewsletterSignup />
    </MainLayout>
  );
};

export default HomePage;