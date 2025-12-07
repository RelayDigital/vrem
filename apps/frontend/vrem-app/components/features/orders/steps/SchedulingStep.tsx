'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, startOfDay, isBefore, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { H2, P, Muted } from '@/components/ui/typography';
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface SchedulingStepProps {
  selectedDate: string;
  selectedTime: string;
  duration: number;
  technicianId?: string;
  organizationId?: string;
  onComplete: (date: string, time: string, duration: number) => void;
  onBack: () => void;
}

// Generate time slots for a day (8 AM to 6 PM)
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 8; hour < 18; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

export function SchedulingStep({
  selectedDate,
  selectedTime,
  duration,
  technicianId,
  organizationId,
  onComplete,
  onBack,
}: SchedulingStepProps) {
  const [date, setDate] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined
  );
  const [time, setTime] = useState(selectedTime || '');
  const [estimatedDuration, setEstimatedDuration] = useState(duration || 60);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Fetch availability when date changes
  useEffect(() => {
    if (!date || !organizationId) return;

    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const startDate = format(date, 'yyyy-MM-dd');
        const endDate = format(addDays(date, 1), 'yyyy-MM-dd');
        
        const params = new URLSearchParams({
          startDate,
          endDate,
          duration: estimatedDuration.toString(),
        });
        if (technicianId) {
          params.append('technicianIds', technicianId);
        }

        const token = localStorage.getItem('token');
        const orgId = localStorage.getItem('organizationId');
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/availability?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-org-id': orgId || '',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Flatten all technician slots
          const allSlots = data.flatMap((t: any) => t.slots);
          setAvailability(allSlots);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [date, technicianId, organizationId, estimatedDuration]);

  // Check if a time slot is available
  const isTimeAvailable = (timeStr: string): boolean => {
    if (!date || availability.length === 0) return true;
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hours, minutes, 0, 0);
    
    return availability.some((slot) => {
      const start = new Date(slot.start);
      return (
        start.getHours() === hours &&
        start.getMinutes() === minutes &&
        slot.available
      );
    });
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleContinue = () => {
    if (!date || !time) return;
    onComplete(format(date, 'yyyy-MM-dd'), time, estimatedDuration);
  };

  const isValid = date && time;

  return (
    <motion.div
      key="scheduling"
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
          <span className="text-primary font-medium">Schedule</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <H2 className="text-2xl border-0">When should we shoot?</H2>
          <P className="text-muted-foreground">
            Select a date and time for the photo shoot
          </P>
        </div>

        <div className="bg-card rounded-2xl border-2 border-border p-6 space-y-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Shoot Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative w-full justify-start text-left font-normal h-12"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                    {date ? (
                      format(date, 'PPP')
                    ) : (
                      <span className="text-muted-foreground">Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => isBefore(startOfDay(d), startOfDay(new Date()))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Estimated Duration</Label>
              <Select
                value={estimatedDuration.toString()}
                onValueChange={(v) => setEstimatedDuration(parseInt(v))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Slots */}
          {date && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Available Times *</Label>
                {isLoadingAvailability && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking availability...
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const available = isTimeAvailable(slot);
                  const isSelected = time === slot;
                  
                  return (
                    <button
                      key={slot}
                      onClick={() => available && setTime(slot)}
                      disabled={!available}
                      className={cn(
                        'p-3 rounded-lg text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : available
                          ? 'bg-muted hover:bg-muted/80 text-foreground'
                          : 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed line-through'
                      )}
                    >
                      {formatTime12Hour(slot)}
                    </button>
                  );
                })}
              </div>
              {!isLoadingAvailability && availability.length > 0 && (
                <Muted className="text-xs">
                  Gray slots indicate conflicts with existing bookings
                </Muted>
              )}
            </div>
          )}
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

