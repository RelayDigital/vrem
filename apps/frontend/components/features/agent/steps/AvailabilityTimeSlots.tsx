'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface AvailabilityTimeSlotsProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  technicianId?: string;
  durationMins?: number;
  className?: string;
}

export function AvailabilityTimeSlots({
  selectedDate,
  selectedTime,
  onTimeSelect,
  technicianId,
  durationMins = 60,
  className,
}: AvailabilityTimeSlotsProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCalendar, setHasCalendar] = useState<boolean | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      // Start of the selected day and end of the day
      const start = startOfDay(selectedDate);
      const end = addDays(start, 1);

      const response = await api.nylas.getAvailability({
        start: start.toISOString(),
        end: end.toISOString(),
        durationMins,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        technicianId,
      });

      // Convert string dates to Date objects
      const parsedSlots: TimeSlot[] = (response.allSlots || []).map((slot: any) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
        available: slot.available,
      }));

      setSlots(parsedSlots);
      setHasCalendar(parsedSlots.length > 0);
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      setError('Could not load availability');
      setHasCalendar(false);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, technicianId, durationMins]);

  useEffect(() => {
    if (selectedDate && technicianId) {
      fetchAvailability();
    } else {
      // Reset when no date or technician
      setSlots([]);
      setHasCalendar(null);
    }
  }, [selectedDate, technicianId, fetchAvailability]);

  // If no technician ID, don't show availability slots (fallback to manual time picker)
  if (!technicianId) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Loading available times...</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAvailability}
            className="ml-2 h-7 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No date selected
  if (!selectedDate) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>Select a date to see available times</span>
        </div>
      </div>
    );
  }

  // No slots available (user has no calendar connected or no work hours)
  if (slots.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>No availability data for this date</span>
        </div>
        <p className="text-xs text-muted-foreground">
          The technician may not have connected their calendar or set work hours for this day.
        </p>
      </div>
    );
  }

  // Group slots by availability
  const availableSlots = slots.filter((s) => s.available);
  const unavailableCount = slots.filter((s) => !s.available).length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Available times for</span>
          <Badge variant="outline" className="font-normal">
            {format(selectedDate, 'EEE, MMM d')}
          </Badge>
        </div>
        {unavailableCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {unavailableCount} slots busy
          </span>
        )}
      </div>

      {availableSlots.length === 0 ? (
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            No available times on this date
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try selecting a different day
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot, index) => {
            const timeStr = format(slot.start, 'HH:mm');
            const displayTime = format(slot.start, 'h:mm a');
            const isSelected = selectedTime === timeStr;

            return (
              <Button
                key={index}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                disabled={!slot.available}
                onClick={() => onTimeSelect(timeStr)}
                className={cn(
                  'relative',
                  !slot.available && 'opacity-50 cursor-not-allowed line-through',
                  isSelected && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                {displayTime}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
