'use client';

import { Button } from '../../../ui/button';
import { AddressSearch } from '../../../shared/search';
import { H1, Lead } from '../../../ui/typography';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onAddressSelect: (address: string, location: { lat: number; lng: number }) => void;
}

export function HeroSection({ onAddressSelect }: HeroSectionProps) {
  return (
    <section id="hero" className="relative bg-background py-20 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm mb-2">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Technician Matching</span>
            </div>
            
            <H1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
              Book professional photo shoots in minutes
            </H1>
            
            <Lead className="max-w-2xl mx-auto">
              Enter your property address to get started
            </Lead>
          </div>

          {/* Address Search */}
          <div className="w-full">
            <AddressSearch onAddressSelect={onAddressSelect} />
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Learn More
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

