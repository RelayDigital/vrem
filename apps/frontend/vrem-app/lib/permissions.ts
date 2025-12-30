import { OrgRole, Project } from '@/types';

/**
 * Permission utilities that mirror the backend AuthorizationService.
 * These functions determine what actions a user can perform based on their
 * organization role and project assignment.
 * 
 * IMPORTANT: These are for UI gating only. The backend MUST enforce the same rules.
 */

/**
 * Effective organization role type including personal org owner.
 */
export type EffectiveOrgRole = OrgRole | 'PERSONAL_OWNER' | 'NONE';

/**
 * Roles with full administrative privileges (can edit ANY project, delete, change customers).
 */
const ADMIN_ROLES: readonly EffectiveOrgRole[] = ['PERSONAL_OWNER', 'OWNER', 'ADMIN'];

/**
 * Roles that can create projects/orders.
 */
const ORDER_CREATOR_ROLES: readonly EffectiveOrgRole[] = ['PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER'];

/**
 * Roles that can manage customers at the CRM level.
 * Note: PROJECT_MANAGER is intentionally excluded.
 */
const CUSTOMER_ADMIN_ROLES: readonly EffectiveOrgRole[] = ['PERSONAL_OWNER', 'OWNER', 'ADMIN'];

// =============================
// Project Permissions
// =============================

/**
 * Check if user can view a project.
 * 
 * - OWNER/ADMIN/PROJECT_MANAGER: Can view ALL projects in their org
 * - TECHNICIAN: Can view ONLY projects where they are assigned as technicianId
 * - EDITOR: Can view ONLY projects where they are assigned as editorId
 */
export function canViewProject(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'technicianId' | 'editorId'> | null,
  userId: string | null,
): boolean {
  if (!orgRole || orgRole === 'NONE') return false;

  // OWNER, ADMIN, PROJECT_MANAGER can view all projects
  if (['PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(orgRole)) {
    return true;
  }

  // TECHNICIAN can only view projects they're assigned to
  if (orgRole === 'TECHNICIAN') {
    return project?.technicianId === userId;
  }

  // EDITOR can only view projects they're assigned to
  if (orgRole === 'EDITOR') {
    return project?.editorId === userId;
  }

  return false;
}

/**
 * Check if user can edit a project (assign tech/editor, change schedule, change status, update notes).
 * 
 * - OWNER/ADMIN: Can edit ANY project
 * - PROJECT_MANAGER: Can edit ONLY projects where they are assigned as projectManagerId
 * - TECHNICIAN/EDITOR: Cannot edit projects
 */
export function canEditProject(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId'> | null,
  userId: string | null,
): boolean {
  if (!orgRole || orgRole === 'NONE' || !project) return false;

  // OWNER and ADMIN can edit any project
  if (ADMIN_ROLES.includes(orgRole)) {
    return true;
  }

  // PROJECT_MANAGER can only edit projects where they are assigned
  if (orgRole === 'PROJECT_MANAGER') {
    return project.projectManagerId === userId;
  }

  return false;
}

/**
 * Check if user can delete a project.
 * Project deletion is DESTRUCTIVE and reserved for OWNER and ADMIN only.
 * PROJECT_MANAGER can NEVER delete projects.
 */
export function canDeleteProject(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return ADMIN_ROLES.includes(orgRole);
}

/**
 * Check if user can change the customer on a project.
 * Customer identity is commercial data - only OWNER/ADMIN can change it.
 */
export function canChangeProjectCustomer(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return ADMIN_ROLES.includes(orgRole);
}

/**
 * Check if user can assign a technician to a project.
 * Same rules as canEditProject, EXCEPT:
 * - PERSONAL_OWNER cannot assign technician (they ARE the technician in solo operations)
 */
export function canAssignTechnician(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId'> | null,
  userId: string | null,
): boolean {
  // PERSONAL_OWNER doesn't need assignment UI - they are the solo operator
  if (orgRole === 'PERSONAL_OWNER') {
    return false;
  }
  return canEditProject(orgRole, project, userId);
}

/**
 * Check if user can assign an editor to a project.
 * Same rules as canEditProject, EXCEPT:
 * - PERSONAL_OWNER cannot assign editor (they handle editing in solo operations)
 */
export function canAssignEditor(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId'> | null,
  userId: string | null,
): boolean {
  // PERSONAL_OWNER doesn't need assignment UI - they are the solo operator
  if (orgRole === 'PERSONAL_OWNER') {
    return false;
  }
  return canEditProject(orgRole, project, userId);
}

/**
 * Check if user can change the status of a project.
 * Same rules as canEditProject for full status control.
 * Note: TECHNICIAN/EDITOR have limited status transitions handled separately.
 */
export function canChangeStatus(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId'> | null,
  userId: string | null,
): boolean {
  return canEditProject(orgRole, project, userId);
}

/**
 * Check if user can reschedule a project.
 * Same rules as canEditProject.
 */
export function canReschedule(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId'> | null,
  userId: string | null,
): boolean {
  return canEditProject(orgRole, project, userId);
}

/**
 * Check if user can create projects/orders.
 */
export function canCreateOrder(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return ORDER_CREATOR_ROLES.includes(orgRole);
}

// =============================
// Messaging Permissions
// =============================

/**
 * Check if user can read team chat.
 * 
 * - OWNER/ADMIN/PROJECT_MANAGER: Can read team chat for all org projects
 * - TECHNICIAN/EDITOR: Can read team chat ONLY for projects they can view (assigned to)
 * 
 * Note: This function only checks role-level permission. For TECHNICIAN/EDITOR,
 * the caller should also verify project visibility using canViewProject.
 */
export function canReadTeamChat(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return true;
}

/**
 * Check if user can write to team chat.
 * Same rules as reading - must be able to view the project.
 */
export function canWriteTeamChat(orgRole: EffectiveOrgRole | null): boolean {
  return canReadTeamChat(orgRole);
}

/**
 * Check if user can read customer chat.
 * 
 * - OWNER/ADMIN/PROJECT_MANAGER: Can read customer chat for all org projects
 * - TECHNICIAN: Cannot read customer chat (hidden in UI)
 * - EDITOR: Cannot read customer chat (hidden in UI)
 */
export function canReadCustomerChat(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  
  // EDITOR cannot read customer chat
  if (orgRole === 'EDITOR') return false;
  
  // TECHNICIAN cannot read customer chat
  if (orgRole === 'TECHNICIAN') return false;
  
  // OWNER, ADMIN, PROJECT_MANAGER can read customer chat
  return ['PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(orgRole);
}

/**
 * Check if user can write to customer chat.
 * 
 * - OWNER/ADMIN: Can write to any project's customer chat
 * - PROJECT_MANAGER: Can write ONLY to customer chat on projects they manage
 * - TECHNICIAN/EDITOR: Cannot write to customer chat
 * - AGENT (customer): Can write to customer chat on projects where they are the linked customer
 */
export function canWriteCustomerChat(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId'> & { customerId?: string | null } | null,
  userId: string | null,
  options?: {
    /** User's account type */
    userAccountType?: string;
    /** The customer's userId (from OrganizationCustomer.userId) */
    customerUserId?: string | null;
  },
): boolean {
  // AGENT customers can write to customer chat on their linked projects
  if (
    options?.userAccountType === 'AGENT' &&
    options?.customerUserId &&
    options.customerUserId === userId
  ) {
    return true;
  }

  if (!orgRole || orgRole === 'NONE' || !project) return false;

  // OWNER and ADMIN can write to any customer chat
  if (ADMIN_ROLES.includes(orgRole)) {
    return true;
  }

  // PROJECT_MANAGER can only write to customer chat on their assigned projects
  if (orgRole === 'PROJECT_MANAGER') {
    return project.projectManagerId === userId;
  }

  // TECHNICIAN and EDITOR cannot write to customer chat
  return false;
}

// =============================
// Customer Management Permissions
// =============================

/**
 * Check if user can manage customers at the CRM level (create/edit/delete).
 * Only OWNER and ADMIN can manage customers.
 * PROJECT_MANAGER is intentionally excluded - customer data is commercial, not operational.
 */
export function canManageCustomers(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return CUSTOMER_ADMIN_ROLES.includes(orgRole);
}

/**
 * Check if user can view customers (read-only).
 * OWNER, ADMIN, and PROJECT_MANAGER can view customers for project context.
 */
export function canViewCustomers(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return ['PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(orgRole);
}

// =============================
// Role Helpers
// =============================

/**
 * Check if user has admin-level access (OWNER, ADMIN, or PERSONAL_OWNER).
 */
export function isAdmin(orgRole: EffectiveOrgRole | null): boolean {
  if (!orgRole || orgRole === 'NONE') return false;
  return ADMIN_ROLES.includes(orgRole);
}

/**
 * Check if user is the assigned project manager for a project.
 */
export function isAssignedProjectManager(
  project: Pick<Project, 'projectManagerId'> | null,
  userId: string | null,
): boolean {
  if (!project || !userId) return false;
  return project.projectManagerId === userId;
}

/**
 * Check if user is the assigned technician for a project.
 */
export function isAssignedTechnician(
  project: Pick<Project, 'technicianId'> | null,
  userId: string | null,
): boolean {
  if (!project || !userId) return false;
  return project.technicianId === userId;
}

/**
 * Check if user is the assigned editor for a project.
 */
export function isAssignedEditor(
  project: Pick<Project, 'editorId'> | null,
  userId: string | null,
): boolean {
  if (!project || !userId) return false;
  return project.editorId === userId;
}

// =============================
// Permission Object Type
// =============================

/**
 * All project-level permissions in a single object.
 * Returned by useProjectPermissions hook.
 */
export interface ProjectPermissions {
  canViewProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canChangeCustomer: boolean;
  canAssignTechnician: boolean;
  canAssignEditor: boolean;
  canChangeStatus: boolean;
  canReschedule: boolean;
  canWriteTeamChat: boolean;
  canReadTeamChat: boolean;
  canWriteCustomerChat: boolean;
  canReadCustomerChat: boolean;
  isAssignedPM: boolean;
  isAssignedTechnician: boolean;
  isAssignedEditor: boolean;
}

/**
 * Compute all project permissions for a user.
 */
export function getProjectPermissions(
  orgRole: EffectiveOrgRole | null,
  project: Pick<Project, 'projectManagerId' | 'technicianId' | 'editorId'> | null,
  userId: string | null,
): ProjectPermissions {
  return {
    canViewProject: canViewProject(orgRole, project, userId),
    canEditProject: canEditProject(orgRole, project, userId),
    canDeleteProject: canDeleteProject(orgRole),
    canChangeCustomer: canChangeProjectCustomer(orgRole),
    canAssignTechnician: canAssignTechnician(orgRole, project, userId),
    canAssignEditor: canAssignEditor(orgRole, project, userId),
    canChangeStatus: canChangeStatus(orgRole, project, userId),
    canReschedule: canReschedule(orgRole, project, userId),
    canWriteTeamChat: canWriteTeamChat(orgRole),
    canReadTeamChat: canReadTeamChat(orgRole),
    canWriteCustomerChat: canWriteCustomerChat(orgRole, project, userId),
    canReadCustomerChat: canReadCustomerChat(orgRole),
    isAssignedPM: isAssignedProjectManager(project, userId),
    isAssignedTechnician: isAssignedTechnician(project, userId),
    isAssignedEditor: isAssignedEditor(project, userId),
  };
}

