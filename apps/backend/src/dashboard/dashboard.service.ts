import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, ProjectStatus } from '@prisma/client';

type CurrentUser = { id: string; role: Role };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardForUser(user: CurrentUser, orgId: string | null) {
    switch (user.role) {
      case Role.AGENT:
        return this.getAgentDashboard(user.id);
      case Role.TECHNICIAN:
        if (!orgId) return this.getTechnicianDashboard(user.id);
        return this.getTechnicianDashboard(user.id, orgId);
      case Role.DISPATCHER:
        if (!orgId) return this.getAdminDashboard();
        return this.getOrgManagerDashboard(orgId);
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

  private async getTechnicianDashboard(technicianId: string, orgId?: string) {
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

  // ---------- Org Manager (dispatcher/admin) ----------

  private async getOrgManagerDashboard(orgId: string) {
    const projects = await this.prisma.project.findMany({
      where: { orgId },
      include: {
        agent: true,
        technician: true,
        editor: true,
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
      role: Role.DISPATCHER,
      projects,
      counts,
    };
  }

  // ---------- Admin (fallback) ----------

  private async getAdminDashboard() {
    const projects = await this.prisma.project.findMany({
      include: {
        agent: true,
        technician: true,
        editor: true,
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
      role: Role.DISPATCHER,
      projects,
      counts,
    };
  }
}
