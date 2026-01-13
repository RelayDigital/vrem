import { Injectable } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MetricsPeriod,
  JobMetrics,
  StaffMetrics,
  PerformanceMetrics,
  RevenueMetrics,
  OrgDashboardMetrics,
  ProviderStats,
  AgentStats,
} from './dto/dashboard-metrics.dto';

/**
 * MetricsService - Computes dashboard statistics from real data
 *
 * Design principles:
 * - All metrics are computed server-side
 * - Safe division (handles zero cases)
 * - Period-aware filtering
 * - Role-appropriate scoping
 */
@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get date range for a period
   * Uses start of day for start and end of day for end to be inclusive
   */
  private getPeriodDates(period: MetricsPeriod): { start: Date; end: Date } {
    const now = new Date();
    // End of today (23:59:59.999)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start: Date;

    switch (period) {
      case 'today':
        // Start of today (00:00:00)
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'week':
        // Start of day 7 days ago
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        break;
      case 'month':
        // Start of same day last month
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
        break;
      case 'all':
      default:
        start = new Date(0); // Beginning of time
        break;
    }

    return { start, end };
  }

  /**
   * Safe division that returns 0 instead of NaN/Infinity
   */
  private safeDiv(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Clamp a value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Ensure rate is between 0 and 1
   */
  private clampRate(rate: number): number {
    if (!Number.isFinite(rate)) return 0;
    return this.clamp(rate, 0, 1);
  }

  /**
   * Ensure value is non-negative
   */
  private nonNegative(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
  }

  /**
   * Compute job metrics for an organization
   * Uses scheduledTime to show jobs scheduled within the period
   */
  async computeJobMetrics(
    orgId: string,
    period: MetricsPeriod,
  ): Promise<JobMetrics> {
    const { start, end } = this.getPeriodDates(period);

    const projects = await this.prisma.project.findMany({
      where: {
        orgId,
        scheduledTime: { gte: start, lte: end },
        isDemo: false, // Exclude demo projects
      },
      select: { status: true },
    });

    const counts = projects.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: projects.length,
      pending: counts[ProjectStatus.PENDING] || 0,
      booked: counts[ProjectStatus.BOOKED] || 0,
      shooting: counts[ProjectStatus.SHOOTING] || 0,
      editing: counts[ProjectStatus.EDITING] || 0,
      delivered: counts[ProjectStatus.DELIVERED] || 0,
      cancelled: 0, // No CANCELLED status in schema, keeping for interface compatibility
    };
  }

  /**
   * Compute staff/technician metrics for an organization
   */
  async computeStaffMetrics(
    orgId: string,
    period: MetricsPeriod,
  ): Promise<StaffMetrics> {
    const { start, end } = this.getPeriodDates(period);

    // Get all org members who are technicians
    const technicianMembers = await this.prisma.organizationMember.findMany({
      where: {
        orgId,
        role: 'TECHNICIAN',
      },
      select: { userId: true },
    });

    const technicianIds = technicianMembers.map((m) => m.userId);

    if (technicianIds.length === 0) {
      return { active: 0, available: 0, utilization: 0 };
    }

    // Count technicians with at least one assignment in the period
    const projectsWithTechnicians = await this.prisma.project.findMany({
      where: {
        orgId,
        technicianId: { in: technicianIds },
        scheduledTime: { gte: start, lte: end },
        isDemo: false,
      },
      select: { technicianId: true, status: true },
    });

    const activeTechnicianIds = new Set(
      projectsWithTechnicians.map((p) => p.technicianId).filter(Boolean),
    );

    // Technicians with upcoming/in-progress work
    const busyStatuses: ProjectStatus[] = [
      ProjectStatus.BOOKED,
      ProjectStatus.SHOOTING,
      ProjectStatus.EDITING,
    ];
    const busyTechnicianIds = new Set(
      projectsWithTechnicians
        .filter((p) => busyStatuses.includes(p.status))
        .map((p) => p.technicianId)
        .filter(Boolean),
    );

    // Utilization = assigned technicians / total technicians
    const utilization = this.safeDiv(
      activeTechnicianIds.size,
      technicianIds.length,
    );

    return {
      active: this.nonNegative(activeTechnicianIds.size),
      available: this.nonNegative(technicianIds.length - busyTechnicianIds.size),
      utilization: this.clampRate(utilization),
    };
  }

  /**
   * Compute performance metrics for an organization
   */
  async computePerformanceMetrics(
    orgId: string,
    period: MetricsPeriod,
  ): Promise<PerformanceMetrics> {
    const { start, end } = this.getPeriodDates(period);

    // Get delivered projects with timing data (scheduled within period)
    const deliveredProjects = await this.prisma.project.findMany({
      where: {
        orgId,
        status: ProjectStatus.DELIVERED,
        scheduledTime: { gte: start, lte: end },
        isDemo: false,
      },
      select: {
        createdAt: true,
        scheduledTime: true,
        updatedAt: true, // Using updatedAt as proxy for delivery time
        deliveryEnabledAt: true,
        clientApprovalStatus: true,
        technicianId: true,
      },
    });

    // Get all projects for assignment time calculation (scheduled within period)
    const assignedProjects = await this.prisma.project.findMany({
      where: {
        orgId,
        technicianId: { not: null },
        scheduledTime: { gte: start, lte: end },
        isDemo: false,
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate average assignment time (hours from creation to first assignment)
    // Note: We don't have assignment timestamp, so we estimate based on update patterns
    // In a more mature system, we'd track assignment events explicitly
    const averageAssignmentTime = 0; // Placeholder - would need audit log or event table

    // Calculate average delivery time (hours from scheduled time to delivery)
    let totalDeliveryHours = 0;
    let deliveryCount = 0;
    for (const p of deliveredProjects) {
      if (p.deliveryEnabledAt && p.scheduledTime) {
        const deliveryHours =
          (p.deliveryEnabledAt.getTime() - p.scheduledTime.getTime()) /
          (1000 * 60 * 60);
        if (deliveryHours > 0) {
          totalDeliveryHours += deliveryHours;
          deliveryCount++;
        }
      }
    }
    const averageDeliveryTime = this.safeDiv(totalDeliveryHours, deliveryCount);

    // Calculate on-time rate (delivered on or before scheduled time + 24h buffer)
    let onTimeCount = 0;
    for (const p of deliveredProjects) {
      if (p.deliveryEnabledAt && p.scheduledTime) {
        const scheduledPlusBuffer = new Date(p.scheduledTime);
        scheduledPlusBuffer.setHours(scheduledPlusBuffer.getHours() + 24);
        if (p.deliveryEnabledAt <= scheduledPlusBuffer) {
          onTimeCount++;
        }
      }
    }
    const onTimeRate = this.safeDiv(onTimeCount, deliveredProjects.length);

    // Calculate client approval rate
    const approvedCount = deliveredProjects.filter(
      (p) => p.clientApprovalStatus === 'APPROVED',
    ).length;
    const clientApprovalRate = this.safeDiv(
      approvedCount,
      deliveredProjects.length,
    );

    return {
      averageAssignmentTime: Math.round(this.nonNegative(averageAssignmentTime) * 10) / 10,
      averageDeliveryTime: Math.round(this.nonNegative(averageDeliveryTime) * 10) / 10,
      onTimeRate: Math.round(this.clampRate(onTimeRate) * 100) / 100,
      clientApprovalRate: Math.round(this.clampRate(clientApprovalRate) * 100) / 100,
    };
  }

  /**
   * Compute revenue metrics for an organization
   */
  async computeRevenueMetrics(
    orgId: string,
    period: MetricsPeriod,
  ): Promise<RevenueMetrics> {
    const { start, end } = this.getPeriodDates(period);

    const paidProjects = await this.prisma.project.findMany({
      where: {
        orgId,
        paidAt: { not: null },
        scheduledTime: { gte: start, lte: end },
        isDemo: false,
      },
      select: {
        paymentAmount: true,
        paymentCurrency: true,
      },
    });

    const total = paidProjects.reduce(
      (sum, p) => sum + (p.paymentAmount || 0),
      0,
    );
    const perJob = this.safeDiv(total, paidProjects.length);
    const currency = paidProjects[0]?.paymentCurrency || 'usd';

    return {
      total: this.nonNegative(total),
      perJob: Math.round(this.nonNegative(perJob)),
      currency,
    };
  }

  /**
   * Compute full org dashboard metrics
   */
  async computeOrgMetrics(
    orgId: string,
    period: MetricsPeriod = 'week',
  ): Promise<OrgDashboardMetrics> {
    const { start, end } = this.getPeriodDates(period);

    const [jobs, staff, performance, revenue] = await Promise.all([
      this.computeJobMetrics(orgId, period),
      this.computeStaffMetrics(orgId, period),
      this.computePerformanceMetrics(orgId, period),
      this.computeRevenueMetrics(orgId, period),
    ]);

    return {
      organizationId: orgId,
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      jobs,
      staff,
      performance,
      revenue,
    };
  }

  /**
   * Compute stats for a provider (personal org or as technician)
   */
  async computeProviderStats(
    userId: string,
    orgId?: string,
  ): Promise<ProviderStats> {
    const whereClause = {
      technicianId: userId,
      ...(orgId ? { orgId } : {}),
      isDemo: false,
    };

    const projects = await this.prisma.project.findMany({
      where: whereClause,
      select: {
        status: true,
        scheduledTime: true,
        deliveryEnabledAt: true,
        clientApprovalStatus: true,
      },
    });

    const upcomingStatuses: ProjectStatus[] = [
      ProjectStatus.PENDING,
      ProjectStatus.BOOKED,
      ProjectStatus.SHOOTING,
    ];
    const upcomingJobs = projects.filter((p) =>
      upcomingStatuses.includes(p.status),
    ).length;
    const completedJobs = projects.filter(
      (p) => p.status === ProjectStatus.DELIVERED,
    ).length;
    const totalJobs = projects.length;

    // Calculate on-time rate
    const deliveredProjects = projects.filter(
      (p) => p.status === ProjectStatus.DELIVERED && p.deliveryEnabledAt,
    );
    let onTimeCount = 0;
    let totalDeliveryHours = 0;

    for (const p of deliveredProjects) {
      if (p.deliveryEnabledAt && p.scheduledTime) {
        const scheduledPlusBuffer = new Date(p.scheduledTime);
        scheduledPlusBuffer.setHours(scheduledPlusBuffer.getHours() + 24);
        if (p.deliveryEnabledAt <= scheduledPlusBuffer) {
          onTimeCount++;
        }
        const hours =
          (p.deliveryEnabledAt.getTime() - p.scheduledTime.getTime()) /
          (1000 * 60 * 60);
        if (hours > 0) {
          totalDeliveryHours += hours;
        }
      }
    }

    const onTimeRate = this.safeDiv(onTimeCount, deliveredProjects.length);
    const averageDeliveryTime = this.safeDiv(
      totalDeliveryHours,
      deliveredProjects.length,
    );

    // Client approval rate
    const approvedCount = deliveredProjects.filter(
      (p) => p.clientApprovalStatus === 'APPROVED',
    ).length;
    const clientApprovalRate = this.safeDiv(
      approvedCount,
      deliveredProjects.length,
    );

    return {
      upcomingJobs: this.nonNegative(upcomingJobs),
      completedJobs: this.nonNegative(completedJobs),
      totalJobs: this.nonNegative(totalJobs),
      onTimeRate: Math.round(this.clampRate(onTimeRate) * 100) / 100,
      averageDeliveryTime: Math.round(this.nonNegative(averageDeliveryTime) * 10) / 10,
      clientApprovalRate: Math.round(this.clampRate(clientApprovalRate) * 100) / 100,
    };
  }

  /**
   * Compute stats for an editor
   */
  async computeEditorStats(
    userId: string,
    orgId?: string,
  ): Promise<ProviderStats> {
    const whereClause = {
      editorId: userId,
      ...(orgId ? { orgId } : {}),
      isDemo: false,
    };

    const projects = await this.prisma.project.findMany({
      where: whereClause,
      select: {
        status: true,
        scheduledTime: true,
        deliveryEnabledAt: true,
        clientApprovalStatus: true,
      },
    });

    const pendingEditingStatuses: ProjectStatus[] = [ProjectStatus.EDITING];
    const upcomingJobs = projects.filter((p) =>
      pendingEditingStatuses.includes(p.status),
    ).length;
    const completedJobs = projects.filter(
      (p) => p.status === ProjectStatus.DELIVERED,
    ).length;
    const totalJobs = projects.length;

    // Calculate metrics
    const deliveredProjects = projects.filter(
      (p) => p.status === ProjectStatus.DELIVERED && p.deliveryEnabledAt,
    );

    let onTimeCount = 0;
    let totalDeliveryHours = 0;

    for (const p of deliveredProjects) {
      if (p.deliveryEnabledAt && p.scheduledTime) {
        const scheduledPlusBuffer = new Date(p.scheduledTime);
        scheduledPlusBuffer.setHours(scheduledPlusBuffer.getHours() + 48); // 48h buffer for editing
        if (p.deliveryEnabledAt <= scheduledPlusBuffer) {
          onTimeCount++;
        }
        const hours =
          (p.deliveryEnabledAt.getTime() - p.scheduledTime.getTime()) /
          (1000 * 60 * 60);
        if (hours > 0) {
          totalDeliveryHours += hours;
        }
      }
    }

    const onTimeRate = this.safeDiv(onTimeCount, deliveredProjects.length);
    const averageDeliveryTime = this.safeDiv(
      totalDeliveryHours,
      deliveredProjects.length,
    );

    const approvedCount = deliveredProjects.filter(
      (p) => p.clientApprovalStatus === 'APPROVED',
    ).length;
    const clientApprovalRate = this.safeDiv(
      approvedCount,
      deliveredProjects.length,
    );

    return {
      upcomingJobs: this.nonNegative(upcomingJobs),
      completedJobs: this.nonNegative(completedJobs),
      totalJobs: this.nonNegative(totalJobs),
      onTimeRate: Math.round(this.clampRate(onTimeRate) * 100) / 100,
      averageDeliveryTime: Math.round(this.nonNegative(averageDeliveryTime) * 10) / 10,
      clientApprovalRate: Math.round(this.clampRate(clientApprovalRate) * 100) / 100,
    };
  }

  /**
   * Compute stats for an agent (customer)
   */
  async computeAgentStats(agentId: string): Promise<AgentStats> {
    // Find all customer records for this agent
    const customerRecords = await this.prisma.organizationCustomer.findMany({
      where: { userId: agentId },
      select: { id: true },
    });
    const customerIds = customerRecords.map((c) => c.id);

    // Get projects where user is customer or project manager
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { projectManagerId: agentId },
          ...(customerIds.length > 0
            ? [{ customerId: { in: customerIds } }]
            : []),
        ],
        isDemo: false,
      },
      select: { status: true },
    });

    const upcomingStatuses: ProjectStatus[] = [
      ProjectStatus.BOOKED,
      ProjectStatus.SHOOTING,
      ProjectStatus.EDITING,
    ];
    const upcomingJobs = projects.filter((p) =>
      upcomingStatuses.includes(p.status),
    ).length;
    const completedJobs = projects.filter(
      (p) => p.status === ProjectStatus.DELIVERED,
    ).length;
    const pendingJobs = projects.filter(
      (p) => p.status === ProjectStatus.PENDING,
    ).length;
    const totalOrders = projects.length;

    return {
      upcomingJobs: this.nonNegative(upcomingJobs),
      completedJobs: this.nonNegative(completedJobs),
      totalOrders: this.nonNegative(totalOrders),
      pendingJobs: this.nonNegative(pendingJobs),
    };
  }
}
