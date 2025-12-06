import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronofyService {
  private base = 'https://api.cronofy.com/v1';

  constructor(private prisma: PrismaService) {}

  private headers() {
    return {
      Authorization: `Bearer ${process.env.CRONOFY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
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
