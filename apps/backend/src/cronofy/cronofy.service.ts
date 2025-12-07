import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AvailabilityParams {
  technicianIds?: string[];
  startDate: string; // ISO date
  endDate: string; // ISO date
  duration?: number; // minutes
  orgId: string;
}

export interface TechnicianAvailability {
  technicianId: string;
  technicianName: string;
  slots: TimeSlot[];
}

@Injectable()
export class CronofyService {
  private readonly logger = new Logger(CronofyService.name);
  private base = 'https://api.cronofy.com/v1';

  constructor(private prisma: PrismaService) {}

  private headers() {
    return {
      Authorization: `Bearer ${process.env.CRONOFY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Query availability for technicians within a date range.
   * Returns available time slots based on existing projects and Cronofy calendar data.
   */
  async getAvailability(params: AvailabilityParams): Promise<TechnicianAvailability[]> {
    const { technicianIds, startDate, endDate, duration = 60, orgId } = params;

    // Get technicians to check
    let technicians: { id: string; name: string }[];
    if (technicianIds && technicianIds.length > 0) {
      technicians = await this.prisma.user.findMany({
        where: { id: { in: technicianIds } },
        select: { id: true, name: true },
      });
    } else {
      // Get all technicians in the org
      const members = await this.prisma.organizationMember.findMany({
        where: { orgId, role: 'TECHNICIAN' },
        include: { user: { select: { id: true, name: true } } },
      });
      technicians = members.map((m) => m.user);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get existing projects for these technicians in the date range
    const existingProjects = await this.prisma.project.findMany({
      where: {
        orgId,
        technicianId: { in: technicians.map((t) => t.id) },
        scheduledTime: {
          gte: start,
          lte: end,
        },
      },
      select: {
        technicianId: true,
        scheduledTime: true,
      },
    });

    // Build availability for each technician
    const results: TechnicianAvailability[] = [];

    for (const tech of technicians) {
      const techProjects = existingProjects.filter(
        (p) => p.technicianId === tech.id,
      );
      const slots = this.generateTimeSlots(start, end, duration, techProjects);

      results.push({
        technicianId: tech.id,
        technicianName: tech.name,
        slots,
      });
    }

    return results;
  }

  /**
   * Generate time slots for a date range, marking busy slots based on existing projects
   */
  private generateTimeSlots(
    start: Date,
    end: Date,
    durationMinutes: number,
    existingProjects: { scheduledTime: Date }[],
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = durationMinutes * 60 * 1000; // Convert to ms

    // Business hours: 8 AM to 6 PM
    const businessStartHour = 8;
    const businessEndHour = 18;

    let current = new Date(start);
    current.setHours(businessStartHour, 0, 0, 0);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + slotDuration);

      // Only include slots within business hours
      if (slotStart.getHours() >= businessStartHour && slotEnd.getHours() <= businessEndHour) {
        // Check if this slot conflicts with any existing project
        const isAvailable = !existingProjects.some((project) => {
          const projectStart = new Date(project.scheduledTime);
          const projectEnd = new Date(projectStart.getTime() + slotDuration);
          // Check for overlap
          return slotStart < projectEnd && slotEnd > projectStart;
        });

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: isAvailable,
        });
      }

      // Move to next slot
      current = new Date(current.getTime() + slotDuration);

      // If we've passed business hours, move to next day
      if (current.getHours() >= businessEndHour) {
        current.setDate(current.getDate() + 1);
        current.setHours(businessStartHour, 0, 0, 0);
      }
    }

    return slots;
  }

  /**
   * Check if a specific time slot is available for a technician
   */
  async isSlotAvailable(
    technicianId: string,
    scheduledTime: Date,
    durationMinutes: number,
    orgId: string,
  ): Promise<boolean> {
    const slotEnd = new Date(scheduledTime.getTime() + durationMinutes * 60 * 1000);

    const conflictingProjects = await this.prisma.project.findMany({
      where: {
        orgId,
        technicianId,
        scheduledTime: {
          gte: new Date(scheduledTime.getTime() - durationMinutes * 60 * 1000),
          lte: slotEnd,
        },
      },
    });

    return conflictingProjects.length === 0;
  }

  async createEvent(project, technician) {
    const payload = {
      event_id: project.id,
      summary: `Shoot: ${[project.addressLine1, project.city].filter(Boolean).join(', ')}`,
      start: project.scheduledTime,
      end: new Date(project.scheduledTime.getTime() + 60 * 60 * 1000),
      calendar_id: technician.calendarId,
    };

    const res = await axios.post(`${this.base}/events`, payload, {
      headers: this.headers(),
    });

    const eventId = res.data.event.event_id;

    return this.prisma.calendarEvent.create({
      data: {
        projectId: project.id,
        cronofyEventId: eventId,
        calendarId: technician.calendarId,
      },
    });
  }

  async updateEvent(project, event) {
    const payload = {
      event_id: event.cronofyEventId,
      summary: `Shoot: ${[project.addressLine1, project.city].filter(Boolean).join(', ')}`,
      start: project.scheduledTime,
      end: new Date(project.scheduledTime.getTime() + 60 * 60 * 1000),
      calendar_id: event.calendarId,
    };

    await axios.post(`${this.base}/events`, payload, {
      headers: this.headers(),
    });
  }

  async deleteEvent(event) {
    await axios.post(
      `${this.base}/events/delete`,
      {
        event_id: event.cronofyEventId,
        calendar_id: event.calendarId,
      },
      { headers: this.headers() },
    );

    await this.prisma.calendarEvent.delete({
      where: { id: event.id },
    });
  }
}
