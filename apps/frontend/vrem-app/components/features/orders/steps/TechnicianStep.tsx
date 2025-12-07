'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { H2, P, Muted } from '@/components/ui/typography';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  MapPin,
  Star,
  Clock,
  SkipForward,
} from 'lucide-react';
import { Technician } from '@/types';
import { cn } from '@/lib/utils';

interface TechnicianStepProps {
  technicians: Technician[];
  selectedTechnicianId?: string;
  scheduledDate: string;
  scheduledTime: string;
  location?: { lat: number; lng: number };
  onSelect: (technicianId?: string, technicianName?: string) => void;
  onBack: () => void;
}

// Calculate distance between two points (simplified Haversine)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function TechnicianStep({
  technicians,
  selectedTechnicianId,
  scheduledDate,
  scheduledTime,
  location,
  onSelect,
  onBack,
}: TechnicianStepProps) {
  const [selected, setSelected] = useState<string | undefined>(selectedTechnicianId);

  // Sort technicians by distance if location is available
  const sortedTechnicians = useMemo(() => {
    if (!location || technicians.length === 0) return technicians;

    return [...technicians].sort((a, b) => {
      const aLoc = a.homeLocation;
      const bLoc = b.homeLocation;
      
      if (!aLoc || !bLoc) return 0;
      
      const distA = calculateDistance(
        location.lat,
        location.lng,
        aLoc.lat,
        aLoc.lng
      );
      const distB = calculateDistance(
        location.lat,
        location.lng,
        bLoc.lat,
        bLoc.lng
      );
      
      return distA - distB;
    });
  }, [technicians, location]);

  const handleSelect = (tech: Technician) => {
    setSelected(tech.id);
  };

  const handleContinue = () => {
    const tech = technicians.find((t) => t.id === selected);
    onSelect(selected, tech?.name);
  };

  const handleSkip = () => {
    onSelect(undefined, undefined);
  };

  const getDistanceText = (tech: Technician): string | null => {
    if (!location || !tech.homeLocation) return null;
    const dist = calculateDistance(
      location.lat,
      location.lng,
      tech.homeLocation.lat,
      tech.homeLocation.lng
    );
    return `${dist.toFixed(1)} km away`;
  };

  return (
    <motion.div
      key="technician"
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Customer</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Address</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Schedule</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Services</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-primary font-medium">Assign</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <H2 className="text-2xl border-0">Assign a photographer</H2>
          <P className="text-muted-foreground">
            Select a technician or skip to assign later
          </P>
        </div>

        {/* Technician List */}
        <div className="space-y-3 max-h-[450px] overflow-y-auto">
          {sortedTechnicians.length > 0 ? (
            sortedTechnicians.map((tech, index) => {
              const isSelected = selected === tech.id;
              const distance = getDistanceText(tech);
              const isRecommended = index === 0 && distance;

              return (
                <button
                  key={tech.id}
                  onClick={() => handleSelect(tech)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={tech.avatar} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {tech.name}
                      </span>
                      {isRecommended && (
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {distance && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {distance}
                        </span>
                      )}
                      {tech.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {tech.rating.overall.toFixed(1)}
                        </span>
                      )}
                      {tech.reliability && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(tech.reliability.onTimeRate * 100)}% on-time
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <P>No technicians available</P>
              <Muted>You can assign a technician later</Muted>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="ghost" onClick={handleSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selected}
            className="flex-1 bg-primary"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

