'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AccountType, OrgRole, User } from '@/types';
import { useAuth } from '@/context/auth-context';
import { OrganizationMember } from '@/types';
import {
  getActiveOrgRoleFromMemberships,
  getUserDashboardPath,
  mapMembershipToEffectiveRole,
} from './userRoleInfo';
import { toEffectiveRole } from '@/lib/roles';

interface UseRequireRoleOptions {
  redirectTo?: string;
  enforceRedirect?: boolean;
}

interface UseRequireRoleReturn {
  user: User | null;
  organizationId: string | null;
  memberships: OrganizationMember[];
  isLoading: boolean;
  getActiveOrgRole: () => OrgRole | null;
}

// Map backend role names to frontend role names (for normalization)
/**
 * Hook to require a user to have one of the specified roles
 */
export function useRequireRole(
  allowedRoles: (string)[],
  options: UseRequireRoleOptions = {}
): UseRequireRoleReturn {
  const router = useRouter();
  const { user, isLoading, activeOrganizationId, memberships } = useAuth();
  const { redirectTo, enforceRedirect } = options;

  const getActiveOrgRole = useCallback(
    (): OrgRole | null =>
      getActiveOrgRoleFromMemberships(memberships, activeOrganizationId),
    [memberships, activeOrganizationId],
  );

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    const normalizedAllowedRoles = allowedRoles.map(role =>
      toEffectiveRole(role)
    );
    const normalizedUserRole = toEffectiveRole(user.accountType);
    const activeMembership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveUserRole = mapMembershipToEffectiveRole(
      activeMembership,
      normalizedUserRole
    );

    const hasAllowedRole = normalizedAllowedRoles.includes(effectiveUserRole);

    if (!hasAllowedRole) {
      if (enforceRedirect === false) {
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        const dashboardPath = getUserDashboardPath(effectiveUserRole);
        router.push(dashboardPath);
      }
    }
  }, [user, isLoading, allowedRoles, router, redirectTo, enforceRedirect, memberships, activeOrganizationId]);

  return {
    user,
    organizationId: activeOrganizationId,
    memberships,
    isLoading,
    getActiveOrgRole,
  };
}
