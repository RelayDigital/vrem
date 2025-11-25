import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, ProjectStatus } from '@prisma/client';

type CurrentUser = { id: string; role: Role };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardForUser(user: CurrentUser) {
    switch (user.role) {
      case Role.AGENT:
        return this.getAgentDashboard(user.id);
      case Role.TECHNICIAN:
        return this.getTechnicianDashboard(user.id);
      case Role.EDITOR:
        return this.getEditorDashboard(user.id);
      case Role.PROJECT_MANAGER:
        return this.getPmDashboard();
      case Role.ADMIN:
        return this.getAdminDashboard();
      default:
        return { role: user.role, data: null };
    }
  }

  // ---------- Agent ----------

  private async getAgentDashboard(agentId: string) {
    const now = new Date();

    const upcomingShoots = await this.prisma.project.findMany({
      where: {
        agentId,
        status: {
          in: [
            ProjectStatus.BOOKED,
            ProjectStatus.SHOOTING,
            ProjectStatus.EDITING,
          ],
        },
        scheduledTime: { gte: now },
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        media: true,
      },
    });

    const deliveredProjects = await this.prisma.project.findMany({
      where: {
        agentId,
        status: ProjectStatus.DELIVERED,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        media: true,
      },
    });

    const lastProject = await this.prisma.project.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      role: Role.AGENT,
      upcomingShoots,
      deliveredProjects,
      lastProjectForRebook: lastProject,
    };
  }

  // ---------- Technician ----------

  private async getTechnicianDashboard(technicianId: string) {
    const assignedShoots = await this.prisma.project.findMany({
      where: {
        technicianId,
        status: {
          in: [ProjectStatus.BOOKED, ProjectStatus.SHOOTING],
        },
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        agent: true,
      },
    });

    const recentCompleted = await this.prisma.project.findMany({
      where: {
        technicianId,
        status: ProjectStatus.EDITING,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        agent: true,
      },
    });

    return {
      role: Role.TECHNICIAN,
      assignedShoots,
      recentCompleted,
    };
  }

  // ---------- Editor ----------

  private async getEditorDashboard(editorId: string) {
    const editingQueue = await this.prisma.project.findMany({
      where: {
        editorId,
        status: ProjectStatus.EDITING,
      },
      orderBy: { updatedAt: 'asc' },
      include: {
        agent: true,
        technician: true,
        media: true,
      },
    });

    const recentlyDelivered = await this.prisma.project.findMany({
      where: {
        editorId,
        status: ProjectStatus.DELIVERED,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        agent: true,
      },
    });

    return {
      role: Role.EDITOR,
      editingQueue,
      recentlyDelivered,
    };
  }

  // ---------- Project Manager ----------

  private async getPmDashboard() {
    const [booked, shooting, editing, delivered] = await Promise.all([
      this.prisma.project.findMany({
        where: { status: ProjectStatus.BOOKED },
        include: { agent: true, technician: true, editor: true },
        orderBy: { scheduledTime: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { status: ProjectStatus.SHOOTING },
        include: { agent: true, technician: true, editor: true },
        orderBy: { scheduledTime: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { status: ProjectStatus.EDITING },
        include: { agent: true, technician: true, editor: true },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { status: ProjectStatus.DELIVERED },
        include: { agent: true, technician: true, editor: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      role: Role.PROJECT_MANAGER,
      pipeline: {
        booked,
        shooting,
        editing,
        delivered,
      },
      counts: {
        booked: booked.length,
        shooting: shooting.length,
        editing: editing.length,
        delivered: delivered.length,
      },
    };
  }

  // ---------- Admin ----------

  private async getAdminDashboard() {
    const pmDashboard = await this.getPmDashboard();

    const [userCounts, totalProjects] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.project.count(),
    ]);

    return {
      role: Role.ADMIN,
      pipeline: pmDashboard.pipeline,
      counts: pmDashboard.counts,
      usersByRole: userCounts,
      totalProjects,
    };
  }
}
