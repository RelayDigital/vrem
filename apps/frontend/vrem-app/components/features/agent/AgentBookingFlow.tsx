'use client';

import { useState } from 'react';
import { JobRequest, Technician, Organization, CustomerOrganization, ServicePackage, PackageAddOn } from '../../../types';
import { rankTechnicians } from '../../../lib/ranking';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import {
  AddressStep,
  DetailsStep,
  ProviderStep,
  TechnicianSelectionStep,
  LoginDialog,
  PackageSelectionStep,
} from './steps';
import type { AddOnWithQuantity } from './steps/PackageSelectionStep';

export interface AgentJobData extends Partial<JobRequest> {
  providerOrgId?: string;
  providerName?: string;
  // Address components from Mapbox
  addressLine1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  // Package selection
  packageId?: string;
  packageName?: string;
  addOnIds?: string[];
  addOnQuantities?: Record<string, number>; // addOnId -> quantity
  totalPrice?: number;
  // Scheduling mode: 'scheduled' (specific time) or 'requested' (let provider choose)
  schedulingMode?: 'scheduled' | 'requested';
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

type Step = 'provider' | 'package' | 'address' | 'details' | 'confirm';

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

  // Package selection state
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnWithQuantity[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  const [jobDetails, setJobDetails] = useState({
    clientName: '',
    scheduledDate: '',
    scheduledTime: '',
    mediaTypes: [] as string[],
    priority: 'standard' as 'standard' | 'rush' | 'urgent',
    estimatedDuration: 120,
    requirements: '',
  });

  // Scheduling mode: 'scheduled' (specific time) or 'requested' (let provider choose)
  const [schedulingMode, setSchedulingMode] = useState<'scheduled' | 'requested'>('scheduled');

  const handleProviderSelect = (provider: CustomerOrganization) => {
    setSelectedProvider(provider);
    // Reset package selection when provider changes
    setSelectedPackage(null);
    setSelectedAddOns([]);
    setTotalPrice(0);
    // Go to package selection step
    setStep('package');
  };

  const handlePackageSelect = (pkg: ServicePackage, addOnsWithQty: AddOnWithQuantity[], total: number) => {
    setSelectedPackage(pkg);
    setSelectedAddOns(addOnsWithQty);
    setTotalPrice(total);
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
    // Only require date/time when in 'scheduled' mode
    if (schedulingMode === 'scheduled') {
      if (!jobDetails.scheduledDate || !jobDetails.scheduledTime) {
        toast.error('Please select a date and time');
        return;
      }
    }
    // Only require media type selection if no package is selected
    if (!selectedPackage && jobDetails.mediaTypes.length === 0) {
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

    if (!selectedPackage) {
      toast.error('Please select a package');
      setStep('package');
      return;
    }

    // Use package media types if package selected, otherwise use form selection
    const mediaTypes = selectedPackage
      ? selectedPackage.mediaTypes
      : jobDetails.mediaTypes;

    // Build add-on IDs and quantities
    const addOnIds = selectedAddOns.map(item => item.addOn.id);
    const addOnQuantities: Record<string, number> = {};
    selectedAddOns.forEach(item => {
      addOnQuantities[item.addOn.id] = item.quantity;
    });

    const job: AgentJobData = {
      clientName: jobDetails.clientName || 'Agent Booking',
      propertyAddress: selectedAddress,
      location: selectedLocation!,
      scheduledDate: jobDetails.scheduledDate,
      scheduledTime: jobDetails.scheduledTime,
      mediaType: mediaTypes as any,
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
      // Include package selection
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      addOnIds,
      addOnQuantities,
      totalPrice,
      // Include scheduling mode
      schedulingMode,
    };

    onJobCreate(job);

    // Reset flow
    setStep('provider');
    setSelectedAddress('');
    setSelectedLocation(null);
    setSelectedProvider(null);
    setSelectedPackage(null);
    setSelectedAddOns([]);
    setTotalPrice(0);
    setAddressComponents({});
    setSchedulingMode('scheduled');
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
    setStep('package');
  };

  const handleBackFromPackage = () => {
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

        {/* Step 2: Package Selection */}
        {step === 'package' && selectedProvider && (
          <PackageSelectionStep
            providerOrgId={selectedProvider.orgId}
            providerName={selectedProvider.orgName}
            selectedPackageId={selectedPackage?.id}
            selectedAddOnQuantities={
              selectedAddOns.reduce((acc, item) => {
                acc[item.addOn.id] = item.quantity;
                return acc;
              }, {} as Record<string, number>)
            }
            onPackageSelect={handlePackageSelect}
            onBack={handleBackFromPackage}
          />
        )}

        {/* Step 3: Address Search */}
        {step === 'address' && (
          <AddressStep
            onAddressSelect={handleAddressSelect}
            selectedProviderName={selectedProvider?.orgName}
            onBack={handleBackFromAddress}
          />
        )}

        {/* Step 4: Job Details / Scheduling */}
        {step === 'details' && (
          <DetailsStep
            selectedAddress={selectedAddress}
            jobDetails={jobDetails}
            onJobDetailsChange={setJobDetails}
            onBack={handleBackFromDetails}
            onNext={handleDetailsComplete}
            selectedProviderName={selectedProvider?.orgName}
            selectedPackage={selectedPackage}
            selectedAddOns={selectedAddOns}
            totalPrice={totalPrice}
            schedulingMode={schedulingMode}
            onSchedulingModeChange={setSchedulingMode}
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
            schedulingMode={schedulingMode}
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
