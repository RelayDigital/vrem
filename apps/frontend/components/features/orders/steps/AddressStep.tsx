'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { H2, P } from '@/components/ui/typography';
import { AddressSearch } from '@/components/shared/search';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

interface AddressStepProps {
  selectedAddress?: string;
  onAddressSelect: (
    address: string,
    location: { lat: number; lng: number },
    addressComponents?: {
      city?: string;
      region?: string;
      postalCode?: string;
      countryCode?: string;
    }
  ) => void;
  onBack: () => void;
}

export function AddressStep({
  selectedAddress,
  onAddressSelect,
  onBack,
}: AddressStepProps) {
  const handleAddressSelect = (address: string, location: { lat: number; lng: number }) => {
    // Parse address components from the full address string
    // This is a simplified version - Mapbox provides more detailed components
    onAddressSelect(address, location);
  };

  return (
    <motion.div
      key="address"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="container mx-auto p-6 h-full"
    >
      <div
        className="container mx-auto space-y-6"
        style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Customer selected</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-primary font-medium">Property address</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-muted-foreground/60">Schedule</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <H2 className="text-2xl border-0">Where is the property?</H2>
          <P className="text-muted-foreground">
            Enter the address for the photo shoot location
          </P>
        </div>

        {/* Address Search */}
        <div className="bg-card rounded-2xl border-2 border-border p-6">
          <AddressSearch onAddressSelect={handleAddressSelect} />
        </div>

        {/* Selected Address Display */}
        {selectedAddress && (
          <div className="bg-card rounded-2xl border-2 border-primary/20 p-6">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground/80 mb-1">
                  Selected Location
                </div>
                <div className="text-lg text-foreground">{selectedAddress}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

