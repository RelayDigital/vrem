'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { H2, P } from '@/components/ui/typography';
import {
  Camera,
  Video,
  Plane,
  Sunset,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceStepProps {
  mediaTypes: string[];
  priority: 'standard' | 'rush' | 'urgent';
  notes?: string;
  onComplete: (mediaTypes: string[], priority: 'standard' | 'rush' | 'urgent', notes?: string) => void;
  onBack: () => void;
}

const MEDIA_TYPE_OPTIONS = [
  { id: 'photo', label: 'Photography', icon: Camera, description: 'Professional photos' },
  { id: 'video', label: 'Video Tour', icon: Video, description: 'Walkthrough video' },
  { id: 'aerial', label: 'Aerial/Drone', icon: Plane, description: 'Drone photography' },
  { id: 'twilight', label: 'Twilight', icon: Sunset, description: 'Dusk/dawn shots' },
];

const PRIORITY_OPTIONS = [
  {
    id: 'standard',
    label: 'Standard',
    icon: Clock,
    description: '3-5 business days',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'rush',
    label: 'Rush',
    icon: Zap,
    description: '1-2 business days',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'urgent',
    label: 'Urgent',
    icon: AlertTriangle,
    description: 'Same day',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
];

export function ServiceStep({
  mediaTypes: initialMediaTypes,
  priority: initialPriority,
  notes: initialNotes,
  onComplete,
  onBack,
}: ServiceStepProps) {
  const [mediaTypes, setMediaTypes] = useState<string[]>(initialMediaTypes);
  const [priority, setPriority] = useState<'standard' | 'rush' | 'urgent'>(initialPriority);
  const [notes, setNotes] = useState(initialNotes || '');

  const handleContinue = () => {
    if (mediaTypes.length === 0) return;
    onComplete(mediaTypes, priority, notes.trim() || undefined);
  };

  const isValid = mediaTypes.length > 0;

  return (
    <motion.div
      key="service"
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
          <span>Customer</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Address</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Schedule</span>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-primary font-medium">Services</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <H2 className="text-2xl border-0">What do you need?</H2>
          <P className="text-muted-foreground">
            Select the media types and delivery priority
          </P>
        </div>

        <div className="bg-card rounded-2xl border-2 border-border p-6 space-y-6">
          {/* Media Types */}
          <div className="space-y-3">
            <Label className="text-sm">Media Types *</Label>
            <ToggleGroup
              type="multiple"
              value={mediaTypes}
              onValueChange={setMediaTypes}
              className="grid grid-cols-2 gap-3 w-full"
            >
              {MEDIA_TYPE_OPTIONS.map((type) => {
                const Icon = type.icon;
                const isSelected = mediaTypes.includes(type.id);
                return (
                  <ToggleGroupItem
                    key={type.id}
                    value={type.id}
                    className={cn(
                      'flex items-center gap-3 p-4 h-auto border-2 rounded-xl transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2.5 rounded-lg',
                        isSelected ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <Label className="text-sm">Delivery Priority</Label>
            <div className="grid grid-cols-3 gap-3">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = priority === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPriority(opt.id as any)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', opt.bgColor)}>
                      <Icon className={cn('h-5 w-5', opt.color)} />
                    </div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="notes">Special Instructions</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access codes, special requests, or any details the photographer should know..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!isValid}
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

