import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, UserAccountType } from '@prisma/client';

type CurrentUser = { id: string; accountType: UserAccountType };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardForUser(user: CurrentUser, orgId: string | null) {
    switch (user.accountType) {
      case UserAccountType.AGENT:
        return this.getAgentDashboard(user.id);
      case UserAccountType.PROVIDER:
        if (!orgId) return this.getProviderDashboard(user.id);
        return this.getProviderDashboard(user.id, orgId);
      case UserAccountType.COMPANY:
        if (!orgId) return this.getAdminDashboard();
        return this.getOrgManagerDashboard(orgId);
      default:
        return { role: user.accountType, data: null };
    }
  }

  // ---------- Agent ----------

  private async getAgentDashboard(agentId: string) {
    const now = new Date();

    const upcomingShoots = await this.prisma.project.findMany({
      where: {
        projectManagerId: agentId,
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
        projectManagerId: agentId,
        status: ProjectStatus.DELIVERED,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        media: true,
      },
    });

    const lastProject = await this.prisma.project.findFirst({
      where: { projectManagerId: agentId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      role: UserAccountType.AGENT,
      upcomingShoots,
      deliveredProjects,
      lastProjectForRebook: lastProject,
    };
  }

  // ---------- Technician ----------

  private async getProviderDashboard(technicianId: string, orgId?: string) {
    const assignedShoots = await this.prisma.project.findMany({
      where: {
        technicianId,
        ...(orgId ? { orgId } : {}),
        status: {
          in: [ProjectStatus.BOOKED, ProjectStatus.SHOOTING],
        },
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        projectManager: true,
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
        projectManager: true,
      },
    });

    return {
      role: UserAccountType.PROVIDER,
      assignedShoots,
      recentCompleted,
    };
  }

  // ---------- Org Manager (dispatcher/admin) ----------

  private async getOrgManagerDashboard(orgId: string) {
    const projects = await this.prisma.project.findMany({
      where: { orgId },
      include: {
        technician: true,
        editor: true,
        projectManager: true,
        customer: true,
        media: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const counts = projects.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      role: UserAccountType.COMPANY,
      projects,
      counts,
    };
  }

  // ---------- Admin (fallback) ----------

  private async getAdminDashboard() {
    const projects = await this.prisma.project.findMany({
      include: {
        technician: true,
        editor: true,
        projectManager: true,
        customer: true,
        media: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const counts = projects.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      role: UserAccountType.COMPANY,
      projects,
      counts,
    };
  }
}
