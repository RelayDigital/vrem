'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccountType, OrgRole, User } from '@/types';
import { useAuth } from '@/context/auth-context';
import { OrganizationMember } from '@/types';

interface UseRequireRoleOptions {
  redirectTo?: string;
}

interface UseRequireRoleReturn {
  user: User | null;
  organizationId: string | null;
  memberships: OrganizationMember[];
  isLoading: boolean;
}

// Map backend role names to frontend role names (for normalization)
const roleMap: Record<string, OrgRole | AccountType> = {
  COMPANY: 'COMPANY',
  PROVIDER: 'PROVIDER',
  AGENT: 'AGENT',
  ADMIN: 'COMPANY',
  PROJECT_MANAGER: 'COMPANY',
  EDITOR: 'COMPANY',
  OWNER: 'COMPANY',
  TECHNICIAN: 'PROVIDER',
};

const mapMembershipToEffectiveRole = (
  membership: any | undefined,
  fallback: OrgRole | AccountType
): OrgRole | AccountType => {
  if (!membership) return fallback;
  const orgType =
    membership.organization?.type || membership.organizationType || '';
  if (orgType === 'PERSONAL') return fallback || 'PROVIDER';
  const role = (membership.role || '').toUpperCase();
  if (
    ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'].includes(role)
  ) {
    return 'COMPANY';
  }
  return 'PROVIDER';
};

/**
 * Hook to require a user to have one of the specified roles
 */
export function useRequireRole(
  allowedRoles: (string)[],
  options: UseRequireRoleOptions = {}
): UseRequireRoleReturn {
  const router = useRouter();
  const { user, isLoading, activeOrganizationId, memberships } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    const normalizedAllowedRoles = allowedRoles.map(role =>
      roleMap[role] || (role as OrgRole | AccountType)
    );
    const normalizedUserRole: OrgRole | AccountType =
      roleMap[user.accountType] || 'AGENT';
    const activeMembership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveUserRole = mapMembershipToEffectiveRole(
      activeMembership,
      normalizedUserRole
    );

    const hasAllowedRole = normalizedAllowedRoles.includes(effectiveUserRole);

    if (!hasAllowedRole) {
      if (options.redirectTo) {
        router.push(options.redirectTo);
      } else {
        const getUserDashboardPath = (role: OrgRole | AccountType): string => {
          if (role === 'COMPANY') return '/dashboard';
          if (role === 'AGENT') return '/dashboard';
          if (role === 'PROVIDER') return '/dashboard';
          return '/';
        };

        const dashboardPath = getUserDashboardPath(effectiveUserRole);
        router.push(dashboardPath);
      }
    }
  }, [user, isLoading, allowedRoles, router, options.redirectTo, memberships, activeOrganizationId]);

  return { user, organizationId: activeOrganizationId, memberships, isLoading };
}
