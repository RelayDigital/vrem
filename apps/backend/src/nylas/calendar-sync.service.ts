import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NylasService } from './nylas.service';
import { CalendarEventSyncStatus, Project, CalendarEvent, NotificationType, ProjectStatus } from '@prisma/client';
import { FRONTEND_URL } from '../config/urls.config';

interface ProjectWithRelations extends Project {
  organization: { name: string };
  customer?: { name: string; email?: string | null; phone?: string | null } | null;
  technician?: { id: string; name: string; email: string } | null;
  calendarEvent?: CalendarEvent | null;
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private prisma: PrismaService,
    private nylas: NylasService,
  ) {}

  /**
   * Sync a project to the technician's calendar
   * Called when: project created, technician assigned, scheduled time changed
   */
  async syncProjectToCalendar(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        customer: true,
        technician: true,
        calendarEvent: true,
      },
    }) as ProjectWithRelations | null;

    if (!project) {
      this.logger.warn(`Project ${projectId} not found for calendar sync`);
      return;
    }

    if (!project.technicianId || !project.technician) {
      this.logger.debug(`Project ${projectId} has no technician assigned, skipping sync`);
      return;
    }

    // Check if technician has a write target calendar
    const integration = await this.nylas.getWriteTargetIntegration(project.technicianId);
    if (!integration?.nylasGrantId || !integration?.nylasCalendarId) {
      this.logger.debug(`Technician ${project.technicianId} has no connected calendar`);
      return;
    }

    const eventTitle = this.buildEventTitle(project);
    const eventDescription = this.buildEventDescription(project);
    const eventLocation = this.buildEventLocation(project);

    const startTime = new Date(project.scheduledTime);
    // Use scheduledEndTime if available, otherwise default to 1 hour
    const endTime = project.scheduledEndTime
      ? new Date(project.scheduledEndTime)
      : new Date(startTime.getTime() + 60 * 60 * 1000);

    try {
      // Check if we should update an existing event or create new
      // Only update if the event was created with the same grant
      const shouldUpdate = project.calendarEvent?.nylasEventId &&
        project.calendarEvent?.nylasGrantId === integration.nylasGrantId;

      if (shouldUpdate) {
        // Update existing event
        try {
          await this.nylas.updateEvent(
            integration.nylasGrantId,
            integration.nylasCalendarId,
            project.calendarEvent!.nylasEventId!,
            {
              title: eventTitle,
              description: eventDescription,
              location: eventLocation,
              startTime,
              endTime,
            },
          );

          await this.prisma.calendarEvent.update({
            where: { id: project.calendarEvent!.id },
            data: {
              lastSyncedAt: new Date(),
              syncStatus: CalendarEventSyncStatus.SYNCED,
              lastError: null,
            },
          });

          this.logger.log(`Updated calendar event for project ${projectId}`);
          return;
        } catch (updateError) {
          // If update fails (event might have been deleted), create new event
          this.logger.warn(`Failed to update event, will create new: ${updateError}`);
        }
      }

      // Create new event
      const nylasEvent = await this.nylas.createEvent(project.technicianId, {
        title: eventTitle,
        description: eventDescription,
        location: eventLocation,
        startTime,
        endTime,
        metadata: {
          vrem_project_id: projectId,
          vrem_org_id: project.orgId,
        },
      });

      if (nylasEvent) {
        await this.prisma.calendarEvent.upsert({
          where: { projectId },
          update: {
            nylasEventId: nylasEvent.id,
            nylasCalendarId: integration.nylasCalendarId,
            nylasGrantId: integration.nylasGrantId,
            lastSyncedAt: new Date(),
            syncStatus: CalendarEventSyncStatus.SYNCED,
            lastError: null,
          },
          create: {
            projectId,
            nylasEventId: nylasEvent.id,
            nylasCalendarId: integration.nylasCalendarId,
            nylasGrantId: integration.nylasGrantId,
            lastSyncedAt: new Date(),
            syncStatus: CalendarEventSyncStatus.SYNCED,
          },
        });

        this.logger.log(`Created calendar event ${nylasEvent.id} for project ${projectId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync project ${projectId} to calendar`, error);

      // Update sync status to failed
      if (project.calendarEvent) {
        await this.prisma.calendarEvent.update({
          where: { id: project.calendarEvent.id },
          data: {
            syncStatus: CalendarEventSyncStatus.FAILED,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }

  /**
   * Remove a project event from the calendar
   * Called when: project cancelled, technician unassigned
   */
  async removeProjectFromCalendar(projectId: string): Promise<void> {
    const calendarEvent = await this.prisma.calendarEvent.findUnique({
      where: { projectId },
    });

    if (!calendarEvent?.nylasEventId || !calendarEvent?.nylasGrantId || !calendarEvent?.nylasCalendarId) {
      this.logger.debug(`No Nylas event to remove for project ${projectId}`);
      return;
    }

    try {
      await this.nylas.deleteEvent(
        calendarEvent.nylasGrantId,
        calendarEvent.nylasCalendarId,
        calendarEvent.nylasEventId,
      );

      await this.prisma.calendarEvent.update({
        where: { id: calendarEvent.id },
        data: {
          syncStatus: CalendarEventSyncStatus.DELETED,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Removed calendar event for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to remove calendar event for project ${projectId}`, error);
    }
  }

  /**
   * Handle external calendar event changes (from webhook)
   * Marks project as needing attention rather than auto-updating
   */
  async handleExternalEventChange(
    nylasEventId: string,
    grantId: string,
    changeType: 'updated' | 'deleted',
  ): Promise<void> {
    // Find the project linked to this event
    const calendarEvent = await this.prisma.calendarEvent.findFirst({
      where: {
        nylasEventId,
        nylasGrantId: grantId,
      },
      include: {
        project: {
          include: {
            technician: true,
            organization: true,
            customer: true,
          },
        },
      },
    });

    if (!calendarEvent) {
      this.logger.debug(`No project found for Nylas event ${nylasEventId}`);
      return;
    }

    const project = calendarEvent.project;

    if (changeType === 'deleted') {
      // Event was deleted externally - flag the project
      await this.prisma.project.update({
        where: { id: project.id },
        data: {
          calendarConflict: true,
          calendarConflictNote: 'Calendar event was deleted externally',
        },
      });

      await this.prisma.calendarEvent.update({
        where: { id: calendarEvent.id },
        data: { syncStatus: CalendarEventSyncStatus.DELETED },
      });

      this.logger.log(`Project ${project.id} flagged - external event deleted`);
    } else if (changeType === 'updated') {
      // Event was updated externally - check if time changed
      const nylasEvent = await this.nylas.getEvent(
        grantId,
        calendarEvent.nylasCalendarId!,
        nylasEventId,
      );

      if (!nylasEvent) {
        return;
      }

      // Compare times
      const externalStartTime = nylasEvent.when.start_time
        ? new Date(nylasEvent.when.start_time * 1000)
        : null;

      if (externalStartTime && project.scheduledTime) {
        const projectTime = new Date(project.scheduledTime);
        const timeDiff = Math.abs(externalStartTime.getTime() - projectTime.getTime());

        // If times differ by more than 1 minute, flag as conflict
        if (timeDiff > 60000) {
          await this.prisma.project.update({
            where: { id: project.id },
            data: {
              calendarConflict: true,
              calendarConflictNote: `Calendar event time changed to ${externalStartTime.toISOString()}`,
            },
          });

          this.logger.log(`Project ${project.id} flagged - external event time changed`);
        }
      }
    }

    // Create notification for the technician/admin
    if (project.technicianId) {
      await this.createConflictNotification(project);
    }
  }

  /**
   * Reconcile a project's calendar state
   * Re-syncs the event to match the project's current state
   */
  async reconcileProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { calendarEvent: true },
    });

    if (!project) {
      return { success: false, message: 'Project not found' };
    }

    // Clear conflict flag
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        calendarConflict: false,
        calendarConflictNote: null,
      },
    });

    // Re-sync to calendar
    await this.syncProjectToCalendar(projectId);

    return { success: true, message: 'Project calendar event reconciled' };
  }

  /**
   * Sync all assigned projects for a technician to their calendar
   * Useful after initially connecting a calendar
   */
  async syncAllProjectsForTechnician(technicianId: string): Promise<{
    synced: number;
    failed: number;
    skipped: number;
  }> {
    // Get all projects assigned to this technician with scheduled times
    const projects = await this.prisma.project.findMany({
      where: {
        technicianId,
        scheduledTime: { not: undefined },
        status: { notIn: [ProjectStatus.CANCELLED, ProjectStatus.DELIVERED] },
      },
      select: { id: true },
    });

    this.logger.log(`Syncing ${projects.length} projects for technician ${technicianId}`);

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const project of projects) {
      try {
        await this.syncProjectToCalendar(project.id);
        synced++;
      } catch (error) {
        this.logger.error(`Failed to sync project ${project.id}`, error);
        failed++;
      }
    }

    this.logger.log(`Sync complete: ${synced} synced, ${failed} failed, ${skipped} skipped`);

    return { synced, failed, skipped };
  }

  /**
   * Get sync status for a project
   */
  async getProjectSyncStatus(projectId: string): Promise<{
    synced: boolean;
    status: string;
    lastSyncedAt?: Date;
    error?: string;
    hasConflict: boolean;
    conflictNote?: string;
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { calendarEvent: true },
    });

    if (!project) {
      return { synced: false, status: 'NOT_FOUND', hasConflict: false };
    }

    if (!project.calendarEvent) {
      return {
        synced: false,
        status: 'NOT_CONNECTED',
        hasConflict: project.calendarConflict,
        conflictNote: project.calendarConflictNote || undefined,
      };
    }

    return {
      synced: project.calendarEvent.syncStatus === CalendarEventSyncStatus.SYNCED,
      status: project.calendarEvent.syncStatus,
      lastSyncedAt: project.calendarEvent.lastSyncedAt || undefined,
      error: project.calendarEvent.lastError || undefined,
      hasConflict: project.calendarConflict,
      conflictNote: project.calendarConflictNote || undefined,
    };
  }

  // =============================
  // Helpers
  // =============================

  private buildEventTitle(project: ProjectWithRelations): string {
    const address = project.addressLine1 || 'TBD';
    return `VREM Shoot: ${address}`;
  }

  private buildEventDescription(project: ProjectWithRelations): string {
    const lines = [
      `Organization: ${project.organization.name}`,
      project.customer ? `Customer: ${project.customer.name}` : null,
      project.customer?.email ? `Email: ${project.customer.email}` : null,
      project.customer?.phone ? `Phone: ${project.customer.phone}` : null,
      `Status: ${project.status}`,
      project.notes ? `Notes: ${project.notes}` : null,
      '',
      `View in VREM: ${FRONTEND_URL}/jobs/${project.id}`,
    ];

    return lines.filter(Boolean).join('\n');
  }

  private buildEventLocation(project: ProjectWithRelations): string {
    const parts = [
      project.addressLine1,
      project.addressLine2,
      project.city,
      project.region,
      project.postalCode,
      project.countryCode,
    ];

    return parts.filter(Boolean).join(', ');
  }

  private async createConflictNotification(project: ProjectWithRelations): Promise<void> {
    try {
      // Create notification for technician
      if (project.technicianId) {
        await this.prisma.notification.create({
          data: {
            userId: project.technicianId,
            orgId: project.orgId,
            type: NotificationType.PROJECT_ASSIGNED, // Reusing type, could add CALENDAR_CONFLICT
            projectId: project.id,
            payload: {
              message: 'Calendar event changed externally - please review',
              conflictNote: project.calendarConflictNote,
            },
          },
        });
      }

      this.logger.log(`Created conflict notification for project ${project.id}`);
    } catch (error) {
      this.logger.error(`Failed to create conflict notification`, error);
    }
  }
}
