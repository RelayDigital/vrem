/**
 * Dashboard Metrics DTOs
 *
 * Canonical types for dashboard statistics.
 * All metrics are computed server-side.
 * Frontend should NOT perform business-critical calculations.
 */

/**
 * Period for filtering metrics
 */
export type MetricsPeriod = 'today' | 'week' | 'month' | 'all';

/**
 * Job counts by status - for COMPANY org dashboards
 */
export interface JobMetrics {
  total: number;
  pending: number;
  booked: number;
  shooting: number;
  editing: number;
  delivered: number;
  cancelled: number;
}

/**
 * Technician/staff metrics - for COMPANY org dashboards
 */
export interface StaffMetrics {
  /** Total technicians with at least one assignment */
  active: number;
  /** Technicians with upcoming assignments */
  available: number;
  /** Utilization rate (0-1): assigned hours / available hours */
  utilization: number;
}

/**
 * Performance metrics - for COMPANY org dashboards
 */
export interface PerformanceMetrics {
  /** Average time from project creation to assignment (hours) */
  averageAssignmentTime: number;
  /** Average time from shooting to delivery (hours) */
  averageDeliveryTime: number;
  /** Percentage of projects delivered on or before scheduled time (0-1) */
  onTimeRate: number;
  /** Average client approval rate (0-1) */
  clientApprovalRate: number;
}

/**
 * Revenue metrics - for COMPANY org dashboards
 */
export interface RevenueMetrics {
  /** Total revenue in cents for the period */
  total: number;
  /** Average revenue per completed job in cents */
  perJob: number;
  /** Currency code */
  currency: string;
}

/**
 * Full metrics object for COMPANY org manager dashboards
 */
export interface OrgDashboardMetrics {
  organizationId: string;
  period: MetricsPeriod;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  jobs: JobMetrics;
  staff: StaffMetrics;
  performance: PerformanceMetrics;
  revenue: RevenueMetrics;
}

/**
 * Provider personal performance stats
 * For PROVIDER users in their personal org
 */
export interface ProviderStats {
  /** Upcoming scheduled jobs (BOOKED, SHOOTING) */
  upcomingJobs: number;
  /** Total completed jobs (DELIVERED) */
  completedJobs: number;
  /** Total jobs in period */
  totalJobs: number;
  /** On-time delivery rate (0-1) */
  onTimeRate: number;
  /** Average hours from shooting to delivery */
  averageDeliveryTime: number;
  /** Average client approval rate (0-1) */
  clientApprovalRate: number;
}

/**
 * Agent dashboard stats
 * For AGENT users viewing their orders
 */
export interface AgentStats {
  /** Upcoming scheduled jobs */
  upcomingJobs: number;
  /** Completed/delivered jobs */
  completedJobs: number;
  /** Total orders placed */
  totalOrders: number;
  /** Pending jobs awaiting action */
  pendingJobs: number;
}

/**
 * Role-specific dashboard response types
 */
export interface OrgManagerDashboardResponse {
  role: 'COMPANY';
  metrics: OrgDashboardMetrics;
  // projects array handled separately
}

export interface ProviderDashboardResponse {
  role: 'PROVIDER';
  stats: ProviderStats;
}

export interface TechnicianDashboardResponse {
  role: 'TECHNICIAN';
  stats: ProviderStats;
}

export interface EditorDashboardResponse {
  role: 'EDITOR';
  stats: ProviderStats;
}

export interface AgentDashboardResponse {
  role: 'AGENT';
  stats: AgentStats;
}
