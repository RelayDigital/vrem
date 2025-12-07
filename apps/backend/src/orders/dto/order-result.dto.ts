import { Project, OrganizationCustomer, CalendarEvent, User } from '@prisma/client';

export interface OrderResult {
  project: Project & {
    customer?: OrganizationCustomer | null;
    calendarEvent?: CalendarEvent | null;
    technician?: User | null;
    editor?: User | null;
    projectManager?: User | null;
  };
  customer: OrganizationCustomer | null;
  calendarEvent: CalendarEvent | null;
  isNewCustomer: boolean;
}

