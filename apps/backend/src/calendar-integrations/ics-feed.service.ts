import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import ical, { ICalCalendar, ICalEventStatus } from 'ical-generator';
import { randomUUID } from 'crypto';
import { FRONTEND_URL, API_URL } from '../config/urls.config';

@Injectable()
export class IcsFeedService {
  private readonly logger = new Logger(IcsFeedService.name);
  private readonly frontendUrl: string;
  private readonly apiUrl: string;

  constructor(private prisma: PrismaService) {
    this.frontendUrl = FRONTEND_URL;
    this.apiUrl = API_URL;
  }

  /**
   * Get or create an ICS feed for a user
   */
  async getOrCreateFeed(userId: string) {
    try {
      this.logger.log(`Getting or creating ICS feed for user ${userId}`);

      let feed = await this.prisma.userIcsFeed.findUnique({
        where: { userId },
      });

      if (!feed) {
        this.logger.log(`Creating new ICS feed for user ${userId}`);
        feed = await this.prisma.userIcsFeed.create({
          data: { userId },
        });
      }

      const feedUrl = `${this.apiUrl}/ics/${feed.feedToken}.ics`;

      return {
        id: feed.id,
        feedUrl,
        feedToken: feed.feedToken,
        isActive: feed.isActive,
        createdAt: feed.createdAt,
        lastAccessAt: feed.lastAccessAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get/create ICS feed for user ${userId}`, error);
      throw new InternalServerErrorException('Failed to get calendar feed');
    }
  }

  /**
   * Regenerate the feed token (invalidates old URL)
   */
  async regenerateFeedToken(userId: string) {
    try {
      this.logger.log(`Regenerating ICS feed token for user ${userId}`);

      const feed = await this.prisma.userIcsFeed.findUnique({
        where: { userId },
      });

      if (!feed) {
        throw new NotFoundException('No ICS feed found for this user');
      }

      const updated = await this.prisma.userIcsFeed.update({
        where: { id: feed.id },
        data: {
          feedToken: randomUUID(),
        },
      });

      const feedUrl = `${this.apiUrl}/ics/${updated.feedToken}.ics`;

      return {
        id: updated.id,
        feedUrl,
        feedToken: updated.feedToken,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        lastAccessAt: updated.lastAccessAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to regenerate ICS feed for user ${userId}`, error);
      throw new InternalServerErrorException('Failed to regenerate calendar feed');
    }
  }

  /**
   * Generate ICS calendar content for a feed token
   */
  async generateIcsContent(feedToken: string): Promise<string> {
    const feed = await this.prisma.userIcsFeed.findUnique({
      where: { feedToken },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!feed || !feed.isActive) {
      throw new NotFoundException('Calendar feed not found or inactive');
    }

    // Update last access time
    await this.prisma.userIcsFeed.update({
      where: { id: feed.id },
      data: { lastAccessAt: new Date() },
    });

    // Fetch projects assigned to this technician
    // Include projects from last 30 days and all future projects
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const projects = await this.prisma.project.findMany({
      where: {
        technicianId: feed.userId,
        status: { notIn: ['CANCELLED'] as any },
        scheduledTime: { gte: thirtyDaysAgo },
      },
      include: {
        customer: {
          select: { name: true, email: true, phone: true },
        },
        organization: {
          select: { name: true },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Create the calendar
    const calendar = ical({
      name: `VREM - ${feed.user.name}`,
      prodId: { company: 'VREM', product: 'Calendar', language: 'EN' },
      timezone: 'UTC',
      url: this.frontendUrl,
    });

    // Add each project as an event
    for (const project of projects) {
      const address = this.formatAddress(project);
      const description = this.formatDescription(project);

      // Calculate end time (1 hour after start)
      const endTime = new Date(project.scheduledTime);
      endTime.setHours(endTime.getHours() + 1);

      calendar.createEvent({
        id: `project-${project.id}@vrem.app`,
        start: project.scheduledTime,
        end: endTime,
        summary: `Shoot: ${project.addressLine1 || 'TBD'}`,
        location: address,
        description,
        url: `${this.frontendUrl}/jobs/${project.id}`,
        status: this.mapProjectStatus(project.status),
      });
    }

    return calendar.toString();
  }

  /**
   * Format address for calendar event
   */
  private formatAddress(project: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
  }): string {
    const parts = [
      project.addressLine1,
      project.addressLine2,
      project.city,
      project.region,
      project.postalCode,
      project.countryCode,
    ].filter(Boolean);

    return parts.join(', ') || 'Address TBD';
  }

  /**
   * Format description for calendar event
   */
  private formatDescription(project: {
    id: string;
    notes?: string | null;
    status: string;
    customer?: { name: string; email?: string | null; phone?: string | null } | null;
    organization?: { name: string } | null;
  }): string {
    const lines: string[] = [];

    if (project.organization?.name) {
      lines.push(`Organization: ${project.organization.name}`);
    }

    if (project.customer?.name) {
      lines.push(`Customer: ${project.customer.name}`);
      if (project.customer.email) {
        lines.push(`Email: ${project.customer.email}`);
      }
      if (project.customer.phone) {
        lines.push(`Phone: ${project.customer.phone}`);
      }
    }

    lines.push(`Status: ${project.status}`);

    if (project.notes) {
      lines.push('');
      lines.push('Notes:');
      lines.push(project.notes);
    }

    lines.push('');
    lines.push(`View in VREM: ${this.frontendUrl}/jobs/${project.id}`);

    return lines.join('\n');
  }

  /**
   * Map project status to iCal event status
   */
  private mapProjectStatus(status: string): ICalEventStatus {
    switch (status) {
      case 'BOOKED':
        return ICalEventStatus.CONFIRMED;
      case 'SHOOTING':
        return ICalEventStatus.CONFIRMED;
      case 'EDITING':
        return ICalEventStatus.CONFIRMED;
      case 'DELIVERED':
        return ICalEventStatus.CONFIRMED;
      default:
        return ICalEventStatus.TENTATIVE;
    }
  }
}
