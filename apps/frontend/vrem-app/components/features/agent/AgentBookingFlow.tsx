'use client';

import { useState } from 'react';
import { JobRequest, Photographer, Organization } from '../../../types';
import { rankPhotographers } from '../../../lib/ranking';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import {
  AddressStep,
  DetailsStep,
  PhotographerSelectionStep,
  LoginDialog,
} from './steps';

interface AgentBookingFlowProps {
  photographers: Photographer[];
  companies: Organization[];
  preferredVendors: string[];
  onJobCreate: (job: Partial<JobRequest>) => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  onCancel?: () => void;
  initialAddress?: string;
  initialLocation?: { lat: number; lng: number };
}

type Step = 'address' | 'details' | 'photographer';

export function AgentBookingFlow({
  photographers,
  companies,
  preferredVendors,
  onJobCreate,
  isAuthenticated = true,
  onLoginRequired,
  onCancel,
  initialAddress,
  initialLocation,
}: AgentBookingFlowProps) {
  // If we have initial address, start at details step
  const [step, setStep] = useState<Step>(initialAddress ? 'details' : 'address');
  const [showPhotographerSearch, setShowPhotographerSearch] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialLocation || null);

  const [jobDetails, setJobDetails] = useState({
    clientName: '',
    scheduledDate: '',
    scheduledTime: '',
    mediaTypes: [] as string[],
    priority: 'standard' as 'standard' | 'rush' | 'urgent',
    estimatedDuration: 120,
    requirements: '',
  });

  const handleAddressSelect = (address: string, location: { lat: number; lng: number }) => {
    setSelectedAddress(address);
    setSelectedLocation(location);
    setStep('details');
  };

  const handleDetailsComplete = () => {
    if (!jobDetails.scheduledDate || !jobDetails.scheduledTime) {
      toast.error('Please select a date and time');
      return;
    }
    if (jobDetails.mediaTypes.length === 0) {
      toast.error('Please select at least one media type');
      return;
    }
    setStep('photographer');
  };

  const handlePhotographerSelect = (photographerId: string) => {
    // Check if user is authenticated before confirming booking
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    const job: Partial<JobRequest> = {
      clientName: jobDetails.clientName || 'Agent Booking',
      propertyAddress: selectedAddress,
      location: selectedLocation!,
      scheduledDate: jobDetails.scheduledDate,
      scheduledTime: jobDetails.scheduledTime,
      mediaType: jobDetails.mediaTypes as any,
      priority: jobDetails.priority,
      estimatedDuration: jobDetails.estimatedDuration,
      requirements: jobDetails.requirements,
      status: 'pending',
    };

    onJobCreate(job);
    
    // Reset flow
    setStep('address');
    setSelectedAddress('');
    setSelectedLocation(null);
    setJobDetails({
      clientName: '',
      scheduledDate: '',
      scheduledTime: '',
      mediaTypes: [],
      priority: 'standard',
      estimatedDuration: 120,
      requirements: '',
    });
  };

  const handleBackFromDetails = () => {
    if (initialAddress && onCancel) {
      // If we came from landing page with initial address, go back to landing
      onCancel();
    } else {
      // Otherwise, go back to address step
      setStep('address');
    }
  };

  const mockJob: JobRequest = {
    id: 'temp',
    organizationId: '',
    clientName: jobDetails.clientName || 'Agent Booking',
    propertyAddress: selectedAddress,
    location: selectedLocation || { lat: 0, lng: 0 },
    scheduledDate: jobDetails.scheduledDate,
    scheduledTime: jobDetails.scheduledTime,
    mediaType: jobDetails.mediaTypes as any,
    priority: jobDetails.priority,
    status: 'pending',
    estimatedDuration: jobDetails.estimatedDuration,
    requirements: jobDetails.requirements,
    createdBy: '',
    createdAt: new Date(),
  };

  const rankings =
    step === 'photographer' && selectedLocation
      ? rankPhotographers(photographers, mockJob, preferredVendors)
      : [];

  return (
    <div className="bg-background">
      <AnimatePresence mode="wait">
        {/* Step 1: Address Search */}
        {step === 'address' && (
          <AddressStep onAddressSelect={handleAddressSelect} />
        )}

        {/* Step 2: Job Details */}
        {step === 'details' && (
          <DetailsStep
            selectedAddress={selectedAddress}
            jobDetails={jobDetails}
            onJobDetailsChange={setJobDetails}
            onBack={handleBackFromDetails}
            onNext={handleDetailsComplete}
          />
        )}

        {/* Step 3: Photographer Selection */}
        {step === 'photographer' && (
          <PhotographerSelectionStep
            selectedAddress={selectedAddress}
            jobDetails={jobDetails}
            rankings={rankings}
            showPhotographerSearch={showPhotographerSearch}
            photographers={photographers}
            companies={companies}
            preferredVendors={preferredVendors}
            onToggleSearch={() => setShowPhotographerSearch(!showPhotographerSearch)}
            onPhotographerSelect={handlePhotographerSelect}
            onBack={() => setStep('details')}
          />
        )}
      </AnimatePresence>

      {/* Login Required Dialog */}
      <LoginDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={() => {
          if (onLoginRequired) {
            onLoginRequired();
          }
        }}
      />
    </div>
  );
}
