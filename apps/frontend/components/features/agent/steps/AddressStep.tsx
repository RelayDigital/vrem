import { H1, P } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { AddressSearch, AddressComponents } from '../../../shared/search';
import { motion } from 'framer-motion';
import { MapPin, ArrowLeft } from 'lucide-react';

interface AddressStepProps {
  onAddressSelect: (
    address: string,
    location: { lat: number; lng: number },
    addressComponents?: AddressComponents
  ) => void;
  // Optional: provider name when in agent flow
  selectedProviderName?: string;
  // Optional: back handler
  onBack?: () => void;
}

export function AddressStep({ onAddressSelect, selectedProviderName, onBack }: AddressStepProps) {
  // Determine if we're in agent flow (provider already selected)
  const isAgentFlow = !!selectedProviderName;

  return (
    <motion.div
      key="address"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center container mx-auto px-6 py-12 h-full"
    >
      <div className="w-full container mx-auto space-y-8" style={{ maxWidth: '896px' }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-foreground/90 text-sm mb-2">
            <MapPin className="h-4 w-4" />
            <span>{isAgentFlow ? `Booking with ${selectedProviderName}` : 'Property Location'}</span>
          </div>
          <H1 className="text-4xl md:text-5xl font-bold text-foreground">
            Where's the property?
          </H1>
          <P className="text-lg text-muted-foreground">
            Enter the address to get started with your photo shoot booking
          </P>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AddressSearch onAddressSelect={onAddressSelect} />
        </motion.div>

        {onBack && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

