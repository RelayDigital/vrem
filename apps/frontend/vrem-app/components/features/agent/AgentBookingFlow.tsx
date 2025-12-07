'use client';

import { useState } from 'react';
import { JobRequest, Technician, Organization, CustomerOrganization } from '../../../types';
import { rankTechnicians } from '../../../lib/ranking';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import {
  AddressStep,
  DetailsStep,
  ProviderStep,
  TechnicianSelectionStep,
  LoginDialog,
} from './steps';

export interface AgentJobData extends Partial<JobRequest> {
  providerOrgId?: string;
  providerName?: string;
  // Address components from Mapbox
  addressLine1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

interface AgentBookingFlowProps {
  technicians: Technician[];
  companies: Organization[];
  preferredVendors: string[];
  onJobCreate: (job: AgentJobData) => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  onCancel?: () => void;
  initialAddress?: string;
  initialLocation?: { lat: number; lng: number };
}

type Step = 'provider' | 'address' | 'details' | 'confirm';

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
  // Start at provider selection step
  const [step, setStep] = useState<Step>('provider');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialLocation || null);
  
  // Address components from Mapbox parsing
  const [addressComponents, setAddressComponents] = useState<{
    addressLine1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
  }>({});

  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useState<CustomerOrganization | null>(null);

  const [jobDetails, setJobDetails] = useState({
    clientName: '',
    scheduledDate: '',
    scheduledTime: '',
    mediaTypes: [] as string[],
    priority: 'standard' as 'standard' | 'rush' | 'urgent',
    estimatedDuration: 120,
    requirements: '',
  });

  const handleProviderSelect = (provider: CustomerOrganization) => {
    setSelectedProvider(provider);
    // If we have an initial address, skip to details
    if (initialAddress) {
      setStep('details');
    } else {
      setStep('address');
    }
  };

  const handleAddressSelect = (
    address: string,
    location: { lat: number; lng: number },
    components?: {
      addressLine1?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      countryCode?: string;
    }
  ) => {
    setSelectedAddress(address);
    setSelectedLocation(location);
    if (components) {
      setAddressComponents(components);
    }
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
    // Go to confirmation step
    setStep('confirm');
  };

  const handleConfirmOrder = () => {
    // Check if user is authenticated before confirming booking
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    if (!selectedProvider) {
      toast.error('Please select a service provider');
      setStep('provider');
      return;
    }

    const job: AgentJobData = {
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
      // Include provider info for the order
      providerOrgId: selectedProvider.orgId,
      providerName: selectedProvider.orgName,
      // Include parsed address components
      addressLine1: addressComponents.addressLine1,
      city: addressComponents.city,
      region: addressComponents.region,
      postalCode: addressComponents.postalCode,
      countryCode: addressComponents.countryCode,
    };

    onJobCreate(job);

    // Reset flow
    setStep('provider');
    setSelectedAddress('');
    setSelectedLocation(null);
    setSelectedProvider(null);
    setAddressComponents({});
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

  const handleBackFromAddress = () => {
    setStep('provider');
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

  const handleBackFromConfirm = () => {
    setStep('details');
  };

  const mockJob: JobRequest = {
    id: 'temp',
    orderNumber: 'TEMP',
    organizationId: selectedProvider?.orgId || '',
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
    step === 'confirm' && selectedLocation
      ? rankTechnicians(effectiveTechnicians, mockJob, preferredVendors)
      : [];

  return (
    <div className="bg-background size-full flex-1">
      <AnimatePresence mode="wait">
        {/* Step 1: Provider Selection */}
        {step === 'provider' && (
          <ProviderStep
            selectedProviderId={selectedProvider?.orgId}
            onProviderSelect={handleProviderSelect}
            onBack={onCancel}
          />
        )}

        {/* Step 2: Address Search */}
        {step === 'address' && (
          <AddressStep
            onAddressSelect={handleAddressSelect}
            selectedProviderName={selectedProvider?.orgName}
            onBack={() => setStep('provider')}
          />
        )}

        {/* Step 3: Job Details */}
        {step === 'details' && (
          <DetailsStep
            selectedAddress={selectedAddress}
            jobDetails={jobDetails}
            onJobDetailsChange={setJobDetails}
            onBack={handleBackFromDetails}
            onNext={handleDetailsComplete}
            selectedProviderName={selectedProvider?.orgName}
          />
        )}

        {/* Step 4: Confirmation - using TechnicianSelectionStep as confirmation UI */}
        {step === 'confirm' && (
          <TechnicianSelectionStep
            selectedAddress={selectedAddress}
            jobDetails={jobDetails}
            rankings={rankings}
            showProviderSearch={false}
            technicians={effectiveTechnicians}
            companies={companies}
            preferredVendors={preferredVendors}
            onToggleSearch={() => {}}
            onTechnicianSelect={handleConfirmOrder}
            onBack={handleBackFromConfirm}
            // Pass provider info for display
            selectedProvider={selectedProvider}
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
