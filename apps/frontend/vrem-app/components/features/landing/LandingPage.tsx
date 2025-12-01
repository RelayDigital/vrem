'use client';

import { useState } from 'react';
import { AgentBookingFlow } from '../agent';
import { Technician, Organization, JobRequest } from '../../../types';
import {
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  StatsSection,
  ForTechniciansSection,
  ForCompaniesSection,
  CTASection,
  FooterSection,
} from './sections';

interface LandingPageProps {
  technicians: Technician[];
  companies: Organization[];
  preferredVendors: string[];
  onJobCreate: (job: Partial<JobRequest>) => void;
  onGetStarted: () => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
}

export function LandingPage({
  technicians,
  companies,
  preferredVendors,
  onJobCreate,
  onGetStarted,
  isAuthenticated = false,
  onLoginRequired,
}: LandingPageProps) {
  const [bookingData, setBookingData] = useState<{
    address: string;
    location: { lat: number; lng: number };
  } | null>(null);

  // If address is selected, show focused booking flow without distractions
  if (bookingData) {
    return (
      <AgentBookingFlow
        technicians={technicians}
        companies={companies}
        preferredVendors={preferredVendors}
        onJobCreate={(job) => {
          onJobCreate(job);
          setBookingData(null); // Return to landing after booking
        }}
        isAuthenticated={isAuthenticated}
        onLoginRequired={onLoginRequired}
        onCancel={() => setBookingData(null)}
        initialAddress={bookingData.address}
        initialLocation={bookingData.location}
      />
    );
  }

  const handleAddressSelect = (address: string, location: { lat: number; lng: number }) => {
    setBookingData({ address, location });
  };

  const handleBookShoot = () => {
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <HeroSection onAddressSelect={handleAddressSelect} />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <ForTechniciansSection 
        onGetStarted={onGetStarted}
        onBookShoot={handleBookShoot}
      />
      <ForCompaniesSection 
        onGetStarted={onGetStarted}
        onBookShoot={handleBookShoot}
      />
      <CTASection onBookShoot={handleBookShoot} />
      <FooterSection />
    </div>
  );
}
