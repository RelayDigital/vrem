'use client';

import { useState } from 'react';
import { JobRequest, Technician, Organization } from '../../../types';
import { rankTechnicians } from '../../../lib/ranking';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import {
  AddressStep,
  DetailsStep,
  TechnicianSelectionStep,
  LoginDialog,
} from './steps';

interface AgentBookingFlowProps {
  technicians: Technician[];
  companies: Organization[];
  preferredVendors: string[];
  onJobCreate: (job: Partial<JobRequest>) => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  onCancel?: () => void;
  initialAddress?: string;
  initialLocation?: { lat: number; lng: number };
}

type Step = 'address' | 'details' | 'technician';

export function AgentBookingFlow({
  technicians,
  companies,
  preferredVendors,
  onJobCreate,
  isAuthenticated = true,
  onLoginRequired,
  onCancel,
  initialAddress,
  initialLocation,
}: AgentBookingFlowProps) {
  const effectiveTechnicians = technicians || [];
  // If we have initial address, start at details step
  const [step, setStep] = useState<Step>(initialAddress ? 'details' : 'address');
  const [showTechnicianSearch, setShowTechnicianSearch] = useState(false);
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
    setStep('technician');
  };

  const handleTechnicianSelect = (technicianId: string) => {
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
    orderNumber: 'TEMP',
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
    step === 'technician' && selectedLocation
      ? rankTechnicians(effectiveTechnicians, mockJob, preferredVendors)
      : [];

  return (
    <div className="bg-background size-full flex-1">
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

        {/* Step 3: Technician Selection */}
        {step === 'technician' && (
          <TechnicianSelectionStep
            selectedAddress={selectedAddress}
            jobDetails={jobDetails}
            rankings={rankings}
            showTechnicianSearch={showTechnicianSearch}
            technicians={effectiveTechnicians}
            companies={companies}
            preferredVendors={preferredVendors}
            onToggleSearch={() => setShowTechnicianSearch(!showTechnicianSearch)}
            onTechnicianSelect={handleTechnicianSelect}
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
