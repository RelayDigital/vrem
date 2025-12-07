import { Injectable } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardForUser(user: AuthenticatedUser, ctx: OrgContext) {
    const orgId = ctx.org.id;
    const managerRoles = [
      'PERSONAL_OWNER',
      'OWNER',
      'ADMIN',
      'PROJECT_MANAGER',
    ];

    if (managerRoles.includes(ctx.effectiveRole)) {
      return this.getOrgManagerDashboard(orgId);
    }

    if (ctx.effectiveRole === 'TECHNICIAN' || ctx.effectiveRole === 'EDITOR') {
      return this.getProviderDashboard(user.id, orgId);
    }

    return this.getProviderDashboard(user.id, orgId);
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
      role: 'AGENT',
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
      role: 'PROVIDER',
      assignedShoots,
      recentCompleted,
    };
  }

  // ---------- Org Manager (admin/owner) ----------

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
      role: 'COMPANY',
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
      role: 'COMPANY',
      projects,
      counts,
    };
  }
}
