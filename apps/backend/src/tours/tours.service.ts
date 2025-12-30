import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TourTrack, ProjectStatus } from '@prisma/client';
import { UpdateTourProgressDto } from './dto/update-tour-progress.dto';

// Define the total steps for each track (this should match frontend config)
const TRACK_TOTAL_STEPS: Record<TourTrack, number> = {
  DASHBOARD_OVERVIEW: 5,
  JOB_MANAGEMENT: 5,
  MESSAGING_CHAT: 5,
  SETTINGS_INTEGRATIONS: 6,
};

// Demo project data
const DEMO_PROJECT_DATA = {
  addressLine1: '123 Demo Street',
  city: 'Sample City',
  region: 'CA',
  postalCode: '90210',
  countryCode: 'US',
  lat: 34.0901,
  lng: -118.4065,
  notes: 'This is a demo project created for the guided tour. You can delete it after completing the tour.',
};

@Injectable()
export class ToursService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get or create the user's tour status
   */
  async getUserTourStatus(userId: string) {
    let status = await this.prisma.tourStatus.findUnique({
      where: { userId },
    });

    if (!status) {
      status = await this.prisma.tourStatus.create({
        data: { userId },
      });
    }

    // Get progress for all tracks
    const allProgress = await this.prisma.tourProgress.findMany({
      where: { userId },
    });

    // Calculate completion per track
    const trackProgress: Record<
      TourTrack,
      { completed: number; total: number; started: boolean; finished: boolean }
    > = {} as any;

    for (const track of Object.values(TourTrack)) {
      const trackSteps = allProgress.filter((p) => p.tourTrack === track);
      const completedSteps = trackSteps.filter((p) => p.completed).length;
      const totalSteps = TRACK_TOTAL_STEPS[track];

      trackProgress[track] = {
        completed: completedSteps,
        total: totalSteps,
        started: trackSteps.length > 0,
        finished: completedSteps >= totalSteps,
      };
    }

    // Calculate overall progress
    const totalCompleted = Object.values(trackProgress).reduce(
      (sum, t) => sum + t.completed,
      0,
    );
    const totalSteps = Object.values(TRACK_TOTAL_STEPS).reduce(
      (sum, t) => sum + t,
      0,
    );

    return {
      ...status,
      trackProgress,
      overallProgress: {
        completed: totalCompleted,
        total: totalSteps,
        percentage: Math.round((totalCompleted / totalSteps) * 100),
      },
      // Flag for frontend to detect orphaned demo projects
      hasDemoProject: !!status.demoProjectId,
    };
  }

  /**
   * Get progress for a specific tour track
   */
  async getTrackProgress(userId: string, tourTrack: TourTrack) {
    const progress = await this.prisma.tourProgress.findMany({
      where: { userId, tourTrack },
      orderBy: { startedAt: 'asc' },
    });

    const completedSteps = progress.filter((p) => p.completed);
    const skippedSteps = progress.filter((p) => p.skippedAt !== null);

    return {
      tourTrack,
      steps: progress,
      completedCount: completedSteps.length,
      skippedCount: skippedSteps.length,
      totalSteps: TRACK_TOTAL_STEPS[tourTrack],
      isComplete: completedSteps.length >= TRACK_TOTAL_STEPS[tourTrack],
    };
  }

  /**
   * Update progress for a specific step
   */
  async updateStepProgress(userId: string, dto: UpdateTourProgressDto) {
    const { tourTrack, stepId, completed, skipped } = dto;

    // Upsert the progress record
    const progress = await this.prisma.tourProgress.upsert({
      where: {
        userId_tourTrack_stepId: {
          userId,
          tourTrack,
          stepId,
        },
      },
      create: {
        userId,
        tourTrack,
        stepId,
        completed: completed ?? false,
        completedAt: completed ? new Date() : null,
        skippedAt: skipped ? new Date() : null,
      },
      update: {
        completed: completed ?? undefined,
        completedAt: completed ? new Date() : undefined,
        skippedAt: skipped ? new Date() : undefined,
      },
    });

    // Update last active track
    await this.prisma.tourStatus.upsert({
      where: { userId },
      create: {
        userId,
        lastActiveTrack: tourTrack,
      },
      update: {
        lastActiveTrack: tourTrack,
      },
    });

    return progress;
  }

  /**
   * Mark an entire track as completed
   */
  async completeTrack(userId: string, tourTrack: TourTrack) {
    // Get all steps for this track that have been started
    const existingProgress = await this.prisma.tourProgress.findMany({
      where: { userId, tourTrack },
    });

    // Mark all existing steps as completed
    await this.prisma.tourProgress.updateMany({
      where: { userId, tourTrack },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    // Check if all tracks are now complete
    const allStatus = await this.getUserTourStatus(userId);
    const allTracksComplete = Object.values(allStatus.trackProgress).every(
      (t) => t.finished,
    );

    if (allTracksComplete) {
      await this.prisma.tourStatus.update({
        where: { userId },
        data: { hasCompletedSetup: true },
      });
    }

    return { success: true, allTracksComplete };
  }

  /**
   * Skip/dismiss a tour track
   */
  async skipTrack(userId: string, tourTrack: TourTrack) {
    // Mark all steps in this track as skipped
    const existingProgress = await this.prisma.tourProgress.findMany({
      where: { userId, tourTrack },
    });

    if (existingProgress.length > 0) {
      await this.prisma.tourProgress.updateMany({
        where: { userId, tourTrack },
        data: {
          skippedAt: new Date(),
        },
      });
    }

    return { success: true };
  }

  /**
   * Dismiss the setup guide widget permanently
   */
  async dismissGuide(userId: string) {
    await this.prisma.tourStatus.upsert({
      where: { userId },
      create: {
        userId,
        dismissedGuide: true,
      },
      update: {
        dismissedGuide: true,
      },
    });

    return { success: true };
  }

  /**
   * Reset all tour progress (for testing or re-onboarding)
   */
  async resetProgress(userId: string) {
    // First delete any demo project
    await this.deleteDemoProject(userId);

    await this.prisma.tourProgress.deleteMany({
      where: { userId },
    });

    await this.prisma.tourStatus.upsert({
      where: { userId },
      create: { userId },
      update: {
        hasCompletedSetup: false,
        dismissedGuide: false,
        lastActiveTrack: null,
        demoProjectId: null,
      },
    });

    return { success: true };
  }

  /**
   * Create a demo project for the tour walkthrough
   */
  async createDemoProject(userId: string, orgId: string) {
    try {
      // Check if user already has a demo project
      const status = await this.prisma.tourStatus.findUnique({
        where: { userId },
      });

      if (status?.demoProjectId) {
        // Check if existing demo project exists
        const existingProject = await this.prisma.project.findUnique({
          where: { id: status.demoProjectId },
        });

        if (existingProject) {
          // Delete the old demo project - we'll recreate with proper assignments
          await this.prisma.message.deleteMany({ where: { projectId: existingProject.id } });
          await this.prisma.media.deleteMany({ where: { projectId: existingProject.id } });
          await this.prisma.notification.deleteMany({ where: { projectId: existingProject.id } });
          await this.prisma.project.delete({ where: { id: existingProject.id } }).catch(() => {});
        }
      }

      // Verify the organization exists
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!org) {
        throw new Error(`Organization ${orgId} not found`);
      }

      // Get user and their membership to determine how to assign the demo project
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId, orgId },
      });

      // Check if user is an organization customer (AGENT account type)
      let orgCustomer = await this.prisma.organizationCustomer.findFirst({
        where: { userId, orgId },
      });

      // For AGENT accounts without a customer record, create one for the demo
      if ((user?.accountType === 'AGENT') && !orgCustomer) {
        orgCustomer = await this.prisma.organizationCustomer.create({
          data: {
            orgId,
            userId,
            name: user.name || 'Demo Customer',
            email: user.email,
          },
        });
      }

      // Determine role-based assignment
      // Users can only see projects they're assigned to based on their role
      let projectManagerId: string | undefined;
      let technicianId: string | undefined;
      let editorId: string | undefined;
      let customerId: string | undefined;

      // Check if this is a PERSONAL org (solo provider)
      const isPersonalOrg = org.type === 'PERSONAL';

      // AGENT accounts are customers - use their OrganizationCustomer ID
      if (user?.accountType === 'AGENT' || orgCustomer) {
        customerId = orgCustomer?.id;
      } else if (isPersonalOrg && user?.accountType === 'PROVIDER') {
        // PROVIDER in PERSONAL org - they are the technician (solo operator)
        // Assign them as technician so they see the project and can work on it
        technicianId = userId;
      } else if (membership) {
        const role = membership.role;
        if (role === 'OWNER' || role === 'ADMIN' || role === 'PROJECT_MANAGER') {
          // Managers see all projects, but assign as PM for consistency
          projectManagerId = userId;
        } else if (role === 'TECHNICIAN') {
          // Technicians only see projects they're assigned to
          technicianId = userId;
        } else if (role === 'EDITOR') {
          // Editors only see projects they're assigned to
          editorId = userId;
        }
      } else {
        // No membership - assign as project manager by default so they can see it
        projectManagerId = userId;
      }

      // Create a demo project with sample data
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() + 3); // Schedule 3 days from now
      scheduledTime.setHours(10, 0, 0, 0); // 10 AM

      const demoProject = await this.prisma.project.create({
        data: {
          orgId,
          ...DEMO_PROJECT_DATA,
          scheduledTime,
          status: ProjectStatus.BOOKED,
          isDemo: true,
          projectManagerId,
          technicianId,
          editorId,
          customerId,
        },
        include: {
          technician: true,
          editor: true,
          projectManager: true,
          customer: true,
        },
      });

      // Update tour status with demo project ID
      await this.prisma.tourStatus.upsert({
        where: { userId },
        create: {
          userId,
          demoProjectId: demoProject.id,
        },
        update: {
          demoProjectId: demoProject.id,
        },
      });

      return demoProject;
    } catch (error) {
      console.error('Failed to create demo project:', error);
      throw error;
    }
  }

  /**
   * Delete the demo project for a user
   */
  async deleteDemoProject(userId: string) {
    const status = await this.prisma.tourStatus.findUnique({
      where: { userId },
    });

    if (!status?.demoProjectId) {
      return { success: true, message: 'No demo project to delete' };
    }

    const projectId = status.demoProjectId;

    // Delete associated data first (messages, media, etc.)
    await this.prisma.message.deleteMany({
      where: { projectId },
    });

    await this.prisma.media.deleteMany({
      where: { projectId },
    });

    await this.prisma.notification.deleteMany({
      where: { projectId },
    });

    // Delete the project
    await this.prisma.project.delete({
      where: { id: projectId },
    }).catch(() => {
      // Project might already be deleted
    });

    // Clear the demo project ID from tour status
    await this.prisma.tourStatus.update({
      where: { userId },
      data: { demoProjectId: null },
    });

    return { success: true, message: 'Demo project deleted' };
  }

  /**
   * Get the demo project for a user if it exists
   */
  async getDemoProject(userId: string) {
    const status = await this.prisma.tourStatus.findUnique({
      where: { userId },
    });

    if (!status?.demoProjectId) {
      return null;
    }

    return this.prisma.project.findUnique({
      where: { id: status.demoProjectId },
      include: {
        technician: true,
        editor: true,
        projectManager: true,
        customer: true,
      },
    });
  }
}
