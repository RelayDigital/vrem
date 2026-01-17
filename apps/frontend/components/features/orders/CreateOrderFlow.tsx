'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CustomerStep } from './steps/CustomerStep';
import { AddressStep } from './steps/AddressStep';
import { SchedulingStep } from './steps/SchedulingStep';
import { ServiceStep } from './steps/ServiceStep';
import { TechnicianStep } from './steps/TechnicianStep';
import { ReviewStep } from './steps/ReviewStep';
import { Customer, Technician, Organization } from '@/types';

export interface OrderFormData {
  // Customer
  customerId?: string;
  newCustomer?: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  customerName?: string;

  // Address
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;

  // Scheduling
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;

  // Service
  mediaTypes: string[];
  priority: 'standard' | 'rush' | 'urgent';
  notes?: string;

  // Assignment
  technicianId?: string;
  technicianName?: string;
}

export type OrderStep = 'customer' | 'address' | 'scheduling' | 'service' | 'technician' | 'review';

interface CreateOrderFlowProps {
  customers: Customer[];
  technicians: Technician[];
  organization: Organization | null;
  isPersonalOrg: boolean;
  onOrderCreate: (data: OrderFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const initialFormData: OrderFormData = {
  addressLine1: '',
  scheduledDate: '',
  scheduledTime: '',
  estimatedDuration: 60,
  mediaTypes: [],
  priority: 'standard',
};

export function CreateOrderFlow({
  customers,
  technicians,
  organization,
  isPersonalOrg,
  onOrderCreate,
  onCancel,
  isLoading = false,
}: CreateOrderFlowProps) {
  const [step, setStep] = useState<OrderStep>('customer');
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine which steps to show based on org type
  const steps: OrderStep[] = isPersonalOrg
    ? ['customer', 'address', 'scheduling', 'service', 'review']
    : ['customer', 'address', 'scheduling', 'service', 'technician', 'review'];

  const currentStepIndex = steps.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goToNextStep = useCallback(() => {
    if (!isLastStep) {
      setStep(steps[currentStepIndex + 1]);
    }
  }, [currentStepIndex, isLastStep, steps]);

  const goToPreviousStep = useCallback(() => {
    if (!isFirstStep) {
      setStep(steps[currentStepIndex - 1]);
    } else if (onCancel) {
      onCancel();
    }
  }, [currentStepIndex, isFirstStep, steps, onCancel]);

  const updateFormData = useCallback((updates: Partial<OrderFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleCustomerSelect = useCallback(
    (customer: Customer | null, newCustomerData?: OrderFormData['newCustomer']) => {
      if (customer) {
        updateFormData({
          customerId: customer.id,
          newCustomer: undefined,
          customerName: customer.name,
        });
      } else if (newCustomerData) {
        updateFormData({
          customerId: undefined,
          newCustomer: newCustomerData,
          customerName: newCustomerData.name,
        });
      }
      goToNextStep();
    },
    [updateFormData, goToNextStep]
  );

  const handleAddressSelect = useCallback(
    (address: string, location: { lat: number; lng: number }, addressComponents?: any) => {
      updateFormData({
        addressLine1: address,
        lat: location.lat,
        lng: location.lng,
        city: addressComponents?.city,
        region: addressComponents?.region,
        postalCode: addressComponents?.postalCode,
        countryCode: addressComponents?.countryCode,
      });
      goToNextStep();
    },
    [updateFormData, goToNextStep]
  );

  const handleSchedulingComplete = useCallback(
    (date: string, time: string, duration: number) => {
      updateFormData({
        scheduledDate: date,
        scheduledTime: time,
        estimatedDuration: duration,
      });
      goToNextStep();
    },
    [updateFormData, goToNextStep]
  );

  const handleServiceComplete = useCallback(
    (mediaTypes: string[], priority: 'standard' | 'rush' | 'urgent', notes?: string) => {
      updateFormData({
        mediaTypes,
        priority,
        notes,
      });
      goToNextStep();
    },
    [updateFormData, goToNextStep]
  );

  const handleTechnicianSelect = useCallback(
    (technicianId?: string, technicianName?: string) => {
      updateFormData({
        technicianId,
        technicianName,
      });
      goToNextStep();
    },
    [updateFormData, goToNextStep]
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onOrderCreate(formData);
      toast.success('Order created successfully!');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onOrderCreate]);

  return (
    <div className="bg-background size-full flex-1 min-h-[calc(100vh-var(--header-h))]">
      <AnimatePresence mode="wait">
        {step === 'customer' && (
          <CustomerStep
            key="customer"
            customers={customers}
            selectedCustomerId={formData.customerId}
            onSelect={handleCustomerSelect}
            onBack={onCancel}
          />
        )}

        {step === 'address' && (
          <AddressStep
            key="address"
            selectedAddress={formData.addressLine1}
            onAddressSelect={handleAddressSelect}
            onBack={goToPreviousStep}
          />
        )}

        {step === 'scheduling' && (
          <SchedulingStep
            key="scheduling"
            selectedDate={formData.scheduledDate}
            selectedTime={formData.scheduledTime}
            duration={formData.estimatedDuration}
            technicianId={formData.technicianId}
            organizationId={organization?.id}
            onComplete={handleSchedulingComplete}
            onBack={goToPreviousStep}
          />
        )}

        {step === 'service' && (
          <ServiceStep
            key="service"
            mediaTypes={formData.mediaTypes}
            priority={formData.priority}
            notes={formData.notes}
            onComplete={handleServiceComplete}
            onBack={goToPreviousStep}
          />
        )}

        {step === 'technician' && !isPersonalOrg && (
          <TechnicianStep
            key="technician"
            technicians={technicians}
            selectedTechnicianId={formData.technicianId}
            scheduledDate={formData.scheduledDate}
            scheduledTime={formData.scheduledTime}
            location={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : undefined}
            onSelect={handleTechnicianSelect}
            onBack={goToPreviousStep}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            key="review"
            formData={formData}
            isPersonalOrg={isPersonalOrg}
            isSubmitting={isSubmitting || isLoading}
            onSubmit={handleSubmit}
            onBack={goToPreviousStep}
            onEdit={(targetStep: OrderStep) => setStep(targetStep)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

