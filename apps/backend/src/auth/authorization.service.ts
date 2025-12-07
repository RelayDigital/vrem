import { Injectable } from '@nestjs/common';
import { OrgType, Project } from '@prisma/client';
import { AuthenticatedUser, EffectiveOrgRole, OrgContext } from './auth-context';

const PROJECT_MANAGER_ROLES: readonly EffectiveOrgRole[] = [
  'PERSONAL_OWNER',
  'OWNER',
  'ADMIN',
  'PROJECT_MANAGER',
] as const;

const CUSTOMER_MANAGER_ROLES: readonly EffectiveOrgRole[] = [
  'PERSONAL_OWNER',
  'OWNER',
  'ADMIN',
  'PROJECT_MANAGER',
] as const;

@Injectable()
export class AuthorizationService {
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

  canViewProject(ctx: OrgContext, project: Project): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }

    return ctx.effectiveRole !== 'NONE';
  }

  canManageProject(ctx: OrgContext, project: Project): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    return PROJECT_MANAGER_ROLES.includes(ctx.effectiveRole as any);
  }

  canUpdateOwnWorkOnProject(
    ctx: OrgContext,
    project: Project,
    user: AuthenticatedUser,
  ): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (this.canManageProject(ctx, project)) {
      return true;
    }

    if (
      ctx.effectiveRole === 'TECHNICIAN' &&
      project.technicianId === user.id
    ) {
      return true;
    }

    if (ctx.effectiveRole === 'EDITOR' && project.editorId === user.id) {
      return true;
    }

    return false;
  }

  canUploadMedia(
    ctx: OrgContext,
    project: Project,
    user: AuthenticatedUser,
  ): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    if (PROJECT_MANAGER_ROLES.includes(ctx.effectiveRole as any)) {
      return true;
    }

    if (
      ctx.effectiveRole === 'TECHNICIAN' &&
      project.technicianId === user.id
    ) {
      return true;
    }

    if (ctx.effectiveRole === 'EDITOR' && project.editorId === user.id) {
      return true;
    }

    return false;
  }

  canPostMessage(
    ctx: OrgContext,
    project: Project,
    channel: 'team' | 'customer',
    _user: AuthenticatedUser,
  ): boolean {
    if (project.orgId !== ctx.org.id) {
      return false;
    }

    const normalizedChannel = channel === 'customer' ? 'customer' : 'team';

    if (normalizedChannel === 'team') {
      return ctx.effectiveRole !== 'NONE';
    }

    return ['PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(
      ctx.effectiveRole,
    );
  }

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
   * Determines if user can manage customers in the org context.
   * Allowed roles: PERSONAL_OWNER, OWNER, ADMIN, PROJECT_MANAGER
   */
  canManageCustomers(ctx: OrgContext, _user: AuthenticatedUser): boolean {
    if (ctx.isPersonalOrg) {
      return ctx.effectiveRole === 'PERSONAL_OWNER';
    }
    return CUSTOMER_MANAGER_ROLES.includes(ctx.effectiveRole);
  }

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

  /**
   * Check if the user has one of the specified org roles.
   * Utility method for guards and controllers.
   */
  hasOrgRole(ctx: OrgContext, allowedRoles: EffectiveOrgRole[]): boolean {
    return allowedRoles.includes(ctx.effectiveRole);
  }
}
