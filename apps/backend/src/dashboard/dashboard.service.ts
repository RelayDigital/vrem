import { Injectable } from '@nestjs/common';
import { ProjectStatus, UserAccountType } from '@prisma/client';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { MetricsPeriod } from './dto/dashboard-metrics.dto';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private metricsService: MetricsService,
  ) {}

  async getDashboardForUser(user: AuthenticatedUser, ctx: OrgContext) {
    const orgId = ctx.org.id;

    // For AGENT accountType in PERSONAL org, show agent dashboard
    // which includes projects where they are the customer
    if (
      user.accountType === UserAccountType.AGENT &&
      (ctx.effectiveRole === 'PERSONAL_OWNER' || ctx.isPersonalOrg)
    ) {
      return this.getAgentDashboard(user.id);
    }

    // For PROVIDER accountType in PERSONAL org, show provider dashboard
    // which includes their own performance stats alongside org metrics
    if (
      user.accountType === UserAccountType.PROVIDER &&
      (ctx.effectiveRole === 'PERSONAL_OWNER' || ctx.isPersonalOrg)
    ) {
      return this.getProviderPersonalDashboard(user.id, orgId);
    }

    const managerRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];

    if (managerRoles.includes(ctx.effectiveRole)) {
      return this.getOrgManagerDashboard(orgId);
    }

    if (ctx.effectiveRole === 'TECHNICIAN') {
      return this.getTechnicianDashboard(user.id, orgId);
    }

    if (ctx.effectiveRole === 'EDITOR') {
      return this.getEditorDashboard(user.id, orgId);
    }

    return this.getTechnicianDashboard(user.id, orgId);
  }

  // ---------- Agent ----------

  private async getAgentDashboard(agentId: string) {
    const now = new Date();

    // Find all OrganizationCustomer records where this user is linked
    const customerRecords = await this.prisma.organizationCustomer.findMany({
      where: { userId: agentId },
      select: { id: true },
    });
    const customerIds = customerRecords.map((c) => c.id);

    // Build the where clause to include projects where user is:
    // 1. The project manager (legacy behavior)
    // 2. The linked customer (via OrganizationCustomer.userId)
    const projectWhereClause = {
      OR: [
        { projectManagerId: agentId },
        ...(customerIds.length > 0 ? [{ customerId: { in: customerIds } }] : []),
      ],
    };


    const projectInclude = {
      media: true,
      customer: true,
      organization: true,
      technician: true,
      editor: true,
      projectManager: true,
      messages: true,
    };

    // Fetch all projects for this agent (for the main projects array)
    const projects = await this.prisma.project.findMany({
      where: projectWhereClause,
      orderBy: { createdAt: 'desc' },
      include: projectInclude,
    });
    

    const upcomingShoots = await this.prisma.project.findMany({
      where: {
        ...projectWhereClause,
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
      include: projectInclude,
    });

    const deliveredProjects = await this.prisma.project.findMany({
      where: {
        ...projectWhereClause,
        status: ProjectStatus.DELIVERED,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: projectInclude,
    });

    const lastProject = await this.prisma.project.findFirst({
      where: projectWhereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Compute agent stats
    const stats = await this.metricsService.computeAgentStats(agentId);

    return {
      role: 'AGENT',
      projects, // Main projects array for frontend compatibility
      upcomingShoots,
      deliveredProjects,
      lastProjectForRebook: lastProject,
      stats,
    };
  }

  // ---------- Provider (personal org) ----------

  private async getProviderPersonalDashboard(providerId: string, orgId: string) {
    const now = new Date();

    const projectInclude = {
      media: true,
      customer: true,
      organization: true,
      technician: true,
      editor: true,
      projectManager: true,
      messages: true,
    };

    // Get all projects in the provider's personal org
    const projects = await this.prisma.project.findMany({
      where: { orgId, isDemo: false },
      orderBy: { createdAt: 'desc' },
      include: projectInclude,
    });

    // Upcoming shoots (provider is technician)
    const upcomingShoots = await this.prisma.project.findMany({
      where: {
        orgId,
        technicianId: providerId,
        status: {
          in: [ProjectStatus.BOOKED, ProjectStatus.SHOOTING],
        },
        scheduledTime: { gte: now },
        isDemo: false,
      },
      orderBy: { scheduledTime: 'asc' },
      include: projectInclude,
    });

    // Completed projects
    const completedProjects = await this.prisma.project.findMany({
      where: {
        orgId,
        status: ProjectStatus.DELIVERED,
        isDemo: false,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: projectInclude,
    });

    // Compute provider stats (their performance as technician)
    const stats = await this.metricsService.computeProviderStats(
      providerId,
      orgId,
    );

    // Also compute org-level metrics for their personal org
    const metrics = await this.metricsService.computeOrgMetrics(orgId, 'week');

    return {
      role: 'PROVIDER',
      projects,
      upcomingShoots,
      completedProjects,
      stats,
      metrics,
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
        projectManager: true,
        technician: true,
        editor: true,
        customer: true,
        media: true,
      },
    });

    const recentCompleted = await this.prisma.project.findMany({
      where: {
        technicianId,
        ...(orgId ? { orgId } : {}),
        status: ProjectStatus.EDITING,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        projectManager: true,
        technician: true,
        editor: true,
        customer: true,
        media: true,
      },
    });

    // Return all assigned projects for the technician
    const projects = await this.prisma.project.findMany({
      where: {
        technicianId,
        ...(orgId ? { orgId } : {}),
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        projectManager: true,
        technician: true,
        editor: true,
        customer: true,
        media: true,
        messages: true,
      },
    });

    // Compute provider stats for this technician
    const stats = await this.metricsService.computeProviderStats(
      technicianId,
      orgId,
    );

    return {
      role: 'TECHNICIAN',
      projects,
      assignedShoots,
      recentCompleted,
      stats,
    };
  }

  // ---------- Editor ----------

  private async getEditorDashboard(editorId: string, orgId?: string) {
    // Get all projects assigned to this editor
    const projects = await this.prisma.project.findMany({
      where: {
        editorId,
        ...(orgId ? { orgId } : {}),
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        projectManager: true,
        technician: true,
        editor: true,
        customer: true,
        media: true,
        messages: true,
      },
    });

    // Projects ready for editing (shooting complete)
    const readyForEditing = await this.prisma.project.findMany({
      where: {
        editorId,
        ...(orgId ? { orgId } : {}),
        status: ProjectStatus.EDITING,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        projectManager: true,
        technician: true,
        editor: true,
        customer: true,
        media: true,
      },
    });

    // Recently delivered projects
    const recentDelivered = await this.prisma.project.findMany({
      where: {
        editorId,
        ...(orgId ? { orgId } : {}),
        status: ProjectStatus.DELIVERED,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        projectManager: true,
        technician: true,
        editor: true,
        customer: true,
        media: true,
      },
    });

    // Compute editor stats
    const stats = await this.metricsService.computeEditorStats(editorId, orgId);

    return {
      role: 'EDITOR',
      projects,
      readyForEditing,
      recentDelivered,
      stats,
    };
  }

  // ---------- Org Manager (admin/owner) ----------

  private async getOrgManagerDashboard(
    orgId: string,
    period: MetricsPeriod = 'week',
  ) {
    const projects = await this.prisma.project.findMany({
      where: { orgId, isDemo: false },
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

    // Compute full org metrics for the period
    const metrics = await this.metricsService.computeOrgMetrics(orgId, period);

    // Debug: log to understand what's happening
    console.log('[Dashboard] orgId:', orgId);
    console.log('[Dashboard] total projects:', projects.length);
    console.log('[Dashboard] projects with scheduledTime:', projects.filter(p => p.scheduledTime).length);
    console.log('[Dashboard] metrics.jobs:', metrics.jobs);

    return {
      role: 'COMPANY',
      projects,
      counts,
      metrics,
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
