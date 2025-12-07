'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { Project, OrgRole } from '@/types';
import {
  EffectiveOrgRole,
  ProjectPermissions,
  getProjectPermissions,
  canManageCustomers,
  canViewCustomers,
  canCreateOrder,
  isAdmin,
} from '@/lib/permissions';

/**
 * Get the effective organization role for the current user in the active organization.
 */
function getEffectiveRole(
  memberships: { orgId: string; role?: OrgRole; orgRole?: OrgRole; organization?: { type?: string } }[],
  activeOrgId: string | null,
): EffectiveOrgRole {
  if (!activeOrgId) return 'NONE';

  const membership = memberships.find((m) => m.orgId === activeOrgId);
  if (!membership) return 'NONE';

  // Check if this is a personal org
  const orgType = membership.organization?.type;
  if (orgType === 'PERSONAL') {
    return 'PERSONAL_OWNER';
  }

  // Get the role from membership (handle both naming conventions)
  const role = membership.orgRole || membership.role;
  if (!role) return 'NONE';

  return role as EffectiveOrgRole;
}

/**
 * Hook to get project-level permissions for the current user.
 * 
 * @param project - The project to check permissions for (can be null)
 * @returns ProjectPermissions object with all permission booleans
 * 
 * @example
 * ```tsx
 * const { canEditProject, canDeleteProject, canWriteCustomerChat } = useProjectPermissions(project);
 * 
 * return (
 *   <div>
 *     {canEditProject && <EditButton />}
 *     {canDeleteProject && <DeleteButton />}
 *   </div>
 * );
 * ```
 */
export function useProjectPermissions(
  project: Pick<Project, 'projectManagerId' | 'technicianId' | 'editorId'> | null,
): ProjectPermissions {
  const { user, memberships, activeOrganizationId } = useAuth();

  return useMemo(() => {
    const orgRole = getEffectiveRole(memberships, activeOrganizationId);
    const userId = user?.id ?? null;

    return getProjectPermissions(orgRole, project, userId);
  }, [user?.id, memberships, activeOrganizationId, project?.projectManagerId, project?.technicianId, project?.editorId]);
}

/**
 * Hook to get organization-level permissions for the current user.
 * These permissions don't depend on a specific project.
 * 
 * @returns Object with organization-level permission booleans
 */
export function useOrgPermissions() {
  const { user, memberships, activeOrganizationId } = useAuth();

  return useMemo(() => {
    const orgRole = getEffectiveRole(memberships, activeOrganizationId);

    return {
      /** Can manage customers at CRM level (create/edit/delete) - OWNER/ADMIN only */
      canManageCustomers: canManageCustomers(orgRole),
      /** Can view customers (read-only) - OWNER/ADMIN/PROJECT_MANAGER */
      canViewCustomers: canViewCustomers(orgRole),
      /** Can create projects/orders */
      canCreateOrder: canCreateOrder(orgRole),
      /** Has admin-level access (OWNER/ADMIN) */
      isAdmin: isAdmin(orgRole),
      /** The effective role in the current org */
      effectiveRole: orgRole,
      /** Current user ID */
      userId: user?.id ?? null,
    };
  }, [user?.id, memberships, activeOrganizationId]);
}

/**
 * Hook to get the effective organization role for the current user.
 * 
 * @returns The effective role in the current organization
 */
export function useEffectiveRole(): EffectiveOrgRole {
  const { memberships, activeOrganizationId } = useAuth();

  return useMemo(() => {
    return getEffectiveRole(memberships, activeOrganizationId);
  }, [memberships, activeOrganizationId]);
}

export type { ProjectPermissions, EffectiveOrgRole };

