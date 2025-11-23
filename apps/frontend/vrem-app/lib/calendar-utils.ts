import { JobRequest, Photographer } from '../types';
import { CalendarEvent } from '../types/calendar';
import { format, parseISO, startOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isWithinInterval } from 'date-fns';

/**
 * Convert JobRequest to CalendarEvent
 */
/**
 * Format a Date to ISO string preserving local timezone
 */
function formatLocalToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const offsetH = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetM = String(Math.abs(offset) % 60).padStart(2, '0');
  const sign = offset >= 0 ? '+' : '-';
  return `${y}-${m}-${d}T${h}:${min}:${s}${sign}${offsetH}:${offsetM}`;
}

export function jobToCalendarEvent(job: JobRequest): CalendarEvent {
  // Parse scheduled date string (format: YYYY-MM-DD) as local date
  const scheduledDateStr = job.scheduledDate || format(new Date(), 'yyyy-MM-dd');
  const [year, month, day] = scheduledDateStr.split('-').map(Number);
  
  if (!job.scheduledTime) {
    // Unscheduled appointment - use local midnight for start and end of day
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
    
    return {
      id: job.id,
      title: job.propertyAddress || job.clientName,
      start: formatLocalToISO(dayStart),
      end: formatLocalToISO(dayEnd),
      jobId: job.id,
      orderNumber: job.orderNumber,
      technicianId: job.assignedPhotographerId,
      type: 'Unscheduled',
      allDay: true,
      description: `${job.clientName} - ${job.propertyAddress}`,
    };
  }

  // Scheduled appointment - combine date and time in local timezone
  const [hours, minutes] = job.scheduledTime.split(':').map(Number);
  const scheduledDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  const duration = job.estimatedDuration || 60; // default 60 minutes
  const endDateTime = new Date(scheduledDateTime.getTime() + duration * 60 * 1000);

  return {
    id: job.id,
    title: job.propertyAddress || job.clientName,
    start: formatLocalToISO(scheduledDateTime),
    end: formatLocalToISO(endDateTime),
    jobId: job.id,
    orderNumber: job.orderNumber,
    technicianId: job.assignedPhotographerId,
    type: 'Scheduled',
    allDay: false,
    description: `${job.clientName} - ${job.propertyAddress}`,
  };
}

/**
 * Get events for a date range
 */
export function getEventsInRange(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    return (
      isWithinInterval(eventStart, { start: startDate, end: endDate }) ||
      isWithinInterval(eventEnd, { start: startDate, end: endDate }) ||
      (eventStart <= startDate && eventEnd >= endDate)
    );
  });
}

/**
 * Get events for a specific day
 * Compares dates using local date components to avoid timezone issues
 */
export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  // Normalize the input date to start of day in local timezone
  const dayStart = startOfDay(date);
  const dayYear = dayStart.getFullYear();
  const dayMonth = dayStart.getMonth();
  const dayDate = dayStart.getDate();
  
  return events.filter((event) => {
    // Parse ISO strings - these may have timezone offsets
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    
    // Get local date components (these are timezone-independent for day comparison)
    const startYear = eventStart.getFullYear();
    const startMonth = eventStart.getMonth();
    const startDate = eventStart.getDate();
    
    const endYear = eventEnd.getFullYear();
    const endMonth = eventEnd.getMonth();
    const endDate = eventEnd.getDate();
    
    // Check if event starts, ends, or spans the target day using local date components
    const startsOnDay = startYear === dayYear && startMonth === dayMonth && startDate === dayDate;
    const endsOnDay = endYear === dayYear && endMonth === dayMonth && endDate === dayDate;
    
    // For spanning check, create date objects at local midnight for comparison
    const eventStartLocal = new Date(startYear, startMonth, startDate);
    const eventEndLocal = new Date(endYear, endMonth, endDate);
    const targetDayLocal = new Date(dayYear, dayMonth, dayDate);
    const spansDay = eventStartLocal <= targetDayLocal && eventEndLocal >= targetDayLocal;
    
    return startsOnDay || endsOnDay || spansDay;
  });
}

/**
 * Get week range for a date
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
}

/**
 * Get month range for a date
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Format time range for display
 */
export function formatTimeRange(start: string, end: string, showTimezone = false): string {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const timeStr = `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  if (showTimezone) {
    const timeZoneName = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
    return `${timeStr} ${timeZoneName}`;
  }
  return timeStr;
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = parseISO(event1.start);
  const end1 = parseISO(event1.end);
  const start2 = parseISO(event2.start);
  const end2 = parseISO(event2.end);

  return start1 < end2 && start2 < end1;
}

