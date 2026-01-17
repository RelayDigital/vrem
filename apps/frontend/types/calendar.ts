import { JobRequest, Technician } from './index';

export type CalendarView = 'day' | 'week' | 'month' | 'list';

export type CalendarEventType = 'Scheduled' | 'Unscheduled' | 'External';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  jobId?: string;
  orderNumber?: string;
  technicianId?: string;
  type: CalendarEventType;
  allDay?: boolean;
  territory?: string;
  description?: string;
  // Additional fields for external events
  externalSource?: string;
  // Conflict marker for overlapping events
  hasConflict?: boolean;
}

export interface CalendarFilters {
  eventTypes: {
    Scheduled: boolean;
    Unscheduled: boolean;
    External: boolean;
  };
  territories: string[];
  technicians: string[];
}

export interface TechnicianColor {
  technicianId: string;
  color: string;
}

// Helper function to generate colors for technicians
export function generateTechnicianColors(technicians: Technician[]): TechnicianColor[] {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ];
  
  return technicians.map((tech, index) => ({
    technicianId: tech.id,
    color: colors[index % colors.length],
  }));
}

