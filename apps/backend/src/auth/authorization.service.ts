import { Injectable } from '@nestjs/common';
import { OrgType, Project, UserAccountType } from '@prisma/client';
import { AuthenticatedUser, EffectiveOrgRole, OrgContext } from './auth-context';

/**
 * Extended project type that includes customer relation for authorization checks.
 */
type ProjectWithCustomer = Project & {
  customer?: { userId?: string | null } | null;
};

/**
 * Roles that can create projects/orders.
 * PROJECT_MANAGER can create projects but edit restrictions apply per-project.
 */
const ORDER_CREATOR_ROLES: readonly EffectiveOrgRole[] = [
  'PERSONAL_OWNER',
  'OWNER',
  'ADMIN',
  'PROJECT_MANAGER',
] as const;

/**
 * Roles with full administrative privileges (can edit ANY project, delete, change customers).
 */
const ADMIN_ROLES: readonly EffectiveOrgRole[] = [
  'PERSONAL_OWNER',
  'OWNER',
  'ADMIN',
] as const;

/**
 * Roles that can manage customers at the CRM level.
 * Note: PROJECT_MANAGER is intentionally excluded - they cannot edit customer records.
 */
const CUSTOMER_ADMIN_ROLES: readonly EffectiveOrgRole[] = [
  'PERSONAL_OWNER',
  'OWNER',
  'ADMIN',
] as const;

@Injectable()
export class AuthorizationService {
  // =============================
  // Organization-level permissions
  // =============================

  canManageOrgSettings(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return ['OWNER', 'ADMIN'].includes(ctx.effectiveRole);
  }

  canManageTeamMembers(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return ['OWNER', 'ADMIN'].includes(ctx.effectiveRole);
  }

  // =============================
  // Project visibility
  // =============================

  /**
   * Check if user is the linked customer for a project.
   * Used to grant agents access to projects they're assigned to as customers.
   */
  private isLinkedCustomer(project: ProjectWithCustomer, user: AuthenticatedUser): boolean {
    return !!(
      user.accountType === UserAccountType.AGENT &&
      project.customer?.userId &&
      project.customer.userId === user.id
    );
  }

  /**
   * Determines if a user can view a project.
   * 
   * - OWNER/ADMIN/PROJECT_MANAGER: Can view ALL projects in their org
   * - TECHNICIAN: Can view ONLY projects where they are assigned as technicianId
   * - EDITOR: Can view ONLY projects where they are assigned as editorId
   * - AGENT (customer): Can view projects where they are the linked customer (cross-org)
   */
  canViewProject(ctx: OrgContext, project: ProjectWithCustomer, user: AuthenticatedUser): boolean {
    // AGENT customers can view projects they're assigned to, regardless of org
    if (this.isLinkedCustomer(project, user)) {
      return true;
    }

    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // OWNER, ADMIN, PROJECT_MANAGER can view all projects in their org
    if (['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(ctx.effectiveRole)) {
      return true;
    }

    // TECHNICIAN can only view projects they're assigned to
    if (ctx.effectiveRole === 'TECHNICIAN') {
      return project.technicianId === user.id;
    }

    // EDITOR can only view projects they're assigned to
    if (ctx.effectiveRole === 'EDITOR') {
      return project.editorId === user.id;
    }

    return false;
  }

  // =============================
  // Project editing permissions
  // =============================

  /**
   * Determines if a user can edit a project (assign tech/editor, change schedule, change status, update notes).
   * 
   * - OWNER/ADMIN: Can edit ANY project in the org
   * - PROJECT_MANAGER: Can edit ONLY projects where they are assigned as projectManagerId
   * - TECHNICIAN/EDITOR: Cannot edit projects (use canUpdateOwnWorkOnProject for limited updates)
   */
  canEditProject(
    ctx: OrgContext,
    project: Project,
    user: AuthenticatedUser,
  ): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // OWNER and ADMIN can edit any project
    if (['OWNER', 'ADMIN'].includes(ctx.effectiveRole)) {
      return true;
    }

    // PROJECT_MANAGER can only edit projects where they are assigned
    if (ctx.effectiveRole === 'PROJECT_MANAGER') {
      return project.projectManagerId === user.id;
    }

    return false;
  }

  /**
   * Determines if a user can delete a project.
   * Project deletion is DESTRUCTIVE and reserved for OWNER and ADMIN only.
   * PROJECT_MANAGER can NEVER delete projects.
   */
  canDeleteProject(ctx: OrgContext, project: Project): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // Only OWNER and ADMIN can delete projects
    return ADMIN_ROLES.includes(ctx.effectiveRole);
  }

  /**
   * Determines if a user can change the customer on a project.
   * Customer identity is commercial data - only OWNER/ADMIN can change it.
   * PROJECT_MANAGER cannot change the customer on a project.
   */
  canChangeProjectCustomer(ctx: OrgContext, project: Project): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // Only OWNER and ADMIN can change customer
    return ADMIN_ROLES.includes(ctx.effectiveRole);
  }

  /**
   * @deprecated Use canEditProject instead. Kept for backward compatibility during migration.
   * 
   * This method previously allowed PROJECT_MANAGER to edit ANY project.
   * New code should use canEditProject which enforces per-project PM assignment.
   */
  canManageProject(ctx: OrgContext, project: Project): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    // For backward compatibility, this returns true for admin roles only
    // PROJECT_MANAGER should use canEditProject with user parameter
    return ADMIN_ROLES.includes(ctx.effectiveRole);
  }

  /**
   * Determines if a user can update their own work on a project.
   * Used for limited, role-specific updates (e.g., technician marking shoot complete).
   * 
   * - Users who can edit the project (via canEditProject) can always update
   * - TECHNICIAN can update if they are the assigned technician
   * - EDITOR can update if they are the assigned editor
   */
  canUpdateOwnWorkOnProject(
    ctx: OrgContext,
    project: Project,
    user: AuthenticatedUser,
  ): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    // If user can edit the project, they can update own work
    if (this.canEditProject(ctx, project, user)) {
      return true;
    }

    // TECHNICIAN can update if assigned
    if (
      ctx.effectiveRole === 'TECHNICIAN' &&
      project.technicianId === user.id
    ) {
      return true;
    }

    // EDITOR can update if assigned
    if (ctx.effectiveRole === 'EDITOR' && project.editorId === user.id) {
      return true;
    }

    return false;
  }

  // =============================
  // Media permissions
  // =============================

  /**
   * Determines if a user can upload media to a project.
   * - Users who can edit the project can upload
   * - Assigned TECHNICIAN or EDITOR can upload to their projects
   */
  canUploadMedia(
    ctx: OrgContext,
    project: Project,
    user: AuthenticatedUser,
  ): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    // If user can edit the project, they can upload media
    if (this.canEditProject(ctx, project, user)) {
      return true;
    }

    // TECHNICIAN can upload if assigned
    if (
      ctx.effectiveRole === 'TECHNICIAN' &&
      project.technicianId === user.id
    ) {
      return true;
    }

    // EDITOR can upload if assigned
    if (ctx.effectiveRole === 'EDITOR' && project.editorId === user.id) {
      return true;
    }

    return false;
  }

  // =============================
  // Messaging permissions
  // =============================

  /**
   * Determines if a user can read team chat messages.
   * 
   * - OWNER/ADMIN/PROJECT_MANAGER: Can read team chat for all org projects
   * - TECHNICIAN/EDITOR: Can read team chat ONLY for projects they can view (assigned to)
   */
  canReadTeamChat(ctx: OrgContext, project: Project, user: AuthenticatedUser): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // Must be able to view the project to read its team chat
    return this.canViewProject(ctx, project, user);
  }

  /**
   * Determines if a user can write to team chat.
   * Same rules as reading - must be able to view the project.
   */
  canWriteTeamChat(ctx: OrgContext, project: Project, user: AuthenticatedUser): boolean {
    // Same as read - must be able to view the project
    return this.canReadTeamChat(ctx, project, user);
  }

  /**
   * Determines if a user can read customer chat messages.
   * 
   * - OWNER/ADMIN/PROJECT_MANAGER: Can read customer chat for all org projects
   * - TECHNICIAN: Cannot read customer chat (hidden in UI)
   * - EDITOR: Cannot read customer chat (hidden in UI)
   * - AGENT (customer): Can read customer chat for projects they're assigned to
   */
  canReadCustomerChat(ctx: OrgContext, project: ProjectWithCustomer, user: AuthenticatedUser): boolean {
    // AGENT customers can read customer chat for their assigned projects
    if (this.isLinkedCustomer(project, user)) {
      return true;
    }

    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // EDITOR cannot read customer chat
    if (ctx.effectiveRole === 'EDITOR') {
      return false;
    }

    // TECHNICIAN cannot read customer chat
    if (ctx.effectiveRole === 'TECHNICIAN') {
      return false;
    }

    // OWNER, ADMIN, PROJECT_MANAGER can read customer chat for all org projects
    return ['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(ctx.effectiveRole);
  }

  /**
   * Determines if a user can write to customer chat.
   * 
   * - OWNER/ADMIN: Can write to any project's customer chat
   * - PROJECT_MANAGER: Can write ONLY to customer chat on projects they manage
   * - TECHNICIAN/EDITOR: Cannot write to customer chat
   * - AGENT (customer): Can write to customer chat for projects they're assigned to
   */
  canWriteCustomerChat(
    ctx: OrgContext,
    project: ProjectWithCustomer,
    user: AuthenticatedUser,
  ): boolean {
    // AGENT customers can write to customer chat for their assigned projects
    if (this.isLinkedCustomer(project, user)) {
      return true;
    }

    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    // OWNER and ADMIN can write to any customer chat
    if (['OWNER', 'ADMIN'].includes(ctx.effectiveRole)) {
      return true;
    }

    // PROJECT_MANAGER can only write to customer chat on their assigned projects
    if (ctx.effectiveRole === 'PROJECT_MANAGER') {
      return project.projectManagerId === user.id;
    }

    // TECHNICIAN and EDITOR cannot write to customer chat
    return false;
  }

  /**
   * Determines if a user can post a message to a channel.
   * Delegates to canWriteTeamChat or canWriteCustomerChat based on channel.
   */
  canPostMessage(
    ctx: OrgContext,
    project: ProjectWithCustomer,
    channel: 'team' | 'customer',
    user: AuthenticatedUser,
  ): boolean {
    // AGENT customers can post to customer chat regardless of org
    if (this.isLinkedCustomer(project, user) && channel === 'customer') {
      return true;
    }

    if (project.orgId !== ctx.org.id) {
      return false;
    }

    const normalizedChannel = channel === 'customer' ? 'customer' : 'team';

    if (normalizedChannel === 'team') {
      return this.canWriteTeamChat(ctx, project, user);
    }

    return this.canWriteCustomerChat(ctx, project, user);
  }

  // =============================
  // Customer management permissions
  // =============================

  /**
   * Determines if user can manage customers at the CRM level.
   * This includes creating, editing, and deleting customer records.
   * 
   * Note: PROJECT_MANAGER is intentionally excluded.
   * Customer identity and CRM data is commercial, not operational.
   * Only OWNER and ADMIN can manage customers.
   */
  canManageCustomers(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return CUSTOMER_ADMIN_ROLES.includes(ctx.effectiveRole);
  }

  /**
   * Determines if user can view customers (read-only).
   * PROJECT_MANAGER can view customers for project context but not edit them.
   */
  canViewCustomers(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    // OWNER, ADMIN, and PROJECT_MANAGER can view customers
    return ['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(ctx.effectiveRole);
  }

  // =============================
  // Inquiry permissions
  // =============================

  /**
   * Determines if user can view inquiries for the org.
   * Inquiries are org-scoped and require manager-level access.
   */
  canViewInquiries(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return ['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(ctx.effectiveRole);
  }

  /**
   * Determines if user can convert an inquiry to a project.
   * Requires manager-level access.
   */
  canConvertInquiry(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return ['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(ctx.effectiveRole);
  }

  // =============================
  // Organization creation
  // =============================

  /**
   * Determines if a user can create an organization of a given type.
   * - PERSONAL orgs are created automatically during registration (not via this check)
   * - TEAM orgs can be created by any user
   * - COMPANY orgs can be created by any user (business decision)
   */
  canCreateOrganization(_user: AuthenticatedUser, orgType: OrgType): boolean {
    // PERSONAL orgs are handled automatically during registration
    if (orgType === OrgType.PERSONAL) {
      return false;
    }
    // Any authenticated user can create TEAM or COMPANY orgs
    return true;
  }

  /**
   * Determines if user can create orders (projects with linked customer and calendar event).
   * Allowed roles: PERSONAL_OWNER, OWNER, ADMIN, PROJECT_MANAGER
   * 
   * For PERSONAL orgs: Only the owner can create orders
   * For TEAM/COMPANY orgs: OWNER, ADMIN, and PROJECT_MANAGER can create orders
   */
  canCreateOrder(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return ORDER_CREATOR_ROLES.includes(ctx.effectiveRole);
  }

  // =============================
  // Utility methods
  // =============================

  /**
   * Check if the user has one of the specified org roles.
   * Utility method for guards and controllers.
   */
  hasOrgRole(ctx: OrgContext, allowedRoles: EffectiveOrgRole[]): boolean {
    return allowedRoles.includes(ctx.effectiveRole);
  }

  /**
   * Check if the user has admin-level access (OWNER, ADMIN, or PERSONAL_OWNER).
   */
  isAdmin(ctx: OrgContext): boolean {
    return ADMIN_ROLES.includes(ctx.effectiveRole);
  }
}
