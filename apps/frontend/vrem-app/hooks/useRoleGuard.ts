'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { useAuth } from '@/context/auth-context';

interface UseRoleGuardOptions {
  /**
   * If true, automatically redirect to /dashboard when access is denied
   * If false, return isAllowed: false so the component can render a 403
   * @default false
   */
  redirectOnDeny?: boolean;
  /**
   * Custom redirect path when redirectOnDeny is true
   * @default '/dashboard'
   */
  redirectTo?: string;
}

interface UseRoleGuardReturn {
  user: User | null;
  isLoading: boolean;
  isAllowed: boolean;
}

type NormalizedRole = 'DISPATCHER' | 'TECHNICIAN' | 'AGENT';

// Map backend role names to frontend role names (for normalization)
// Same mapping as useRequireRole for consistency
const roleMap: Record<string, NormalizedRole> = {
  COMPANY: 'DISPATCHER',
  DISPATCHER: 'DISPATCHER',
  PROVIDER: 'TECHNICIAN',
  TECHNICIAN: 'TECHNICIAN',
  AGENT: 'AGENT',
  // Legacy/old mappings to new roles
  ADMIN: 'DISPATCHER',
  PROJECT_MANAGER: 'DISPATCHER',
  EDITOR: 'DISPATCHER',
  company: 'DISPATCHER',
  dispatcher: 'DISPATCHER',
  provider: 'TECHNICIAN',
  technician: 'TECHNICIAN',
  agent: 'AGENT',
  admin: 'DISPATCHER',
  project_manager: 'DISPATCHER',
  editor: 'DISPATCHER',
};

const mapMembershipToEffectiveRole = (
  membership: any | undefined,
  fallback: NormalizedRole
): NormalizedRole => {
  if (!membership) return fallback;
  const orgType =
    membership.organization?.type || membership.organizationType || '';
  if (orgType === 'PERSONAL') return 'DISPATCHER';
  const role = (membership.role || '').toUpperCase();
  if (
    ['OWNER', 'ADMIN', 'DISPATCHER', 'PROJECT_MANAGER', 'EDITOR'].includes(role)
  ) {
    return 'DISPATCHER';
  }
  return 'TECHNICIAN';
};

/**
 * Hook to guard routes based on user roles
 * Returns whether the user is allowed access, without automatically redirecting
 * (unless redirectOnDeny is true)
 */
export function useRoleGuard(
  requiredRoles: (User['accountType'] | string)[],
  options: UseRoleGuardOptions = {}
): UseRoleGuardReturn {
  const router = useRouter();
  const { user, isLoading, memberships, activeOrganizationId } = useAuth();
  const { redirectOnDeny = false, redirectTo = '/dashboard' } = options;

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // If no user, redirect to login (handled by parent layout)
    if (!user) {
      if (redirectOnDeny) {
        router.replace('/');
      }
      return;
    }

    // Normalize role names (handle both backend and frontend role formats)
    const normalizedRequiredRoles = requiredRoles.map(role =>
      roleMap[role] || (role as NormalizedRole)
    );
    const normalizedUserRole: NormalizedRole =
      roleMap[user.accountType] || 'AGENT';
    const activeMembership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveUserRole = mapMembershipToEffectiveRole(
      activeMembership,
      normalizedUserRole
    );

    // Check if user has one of the required roles
    const hasRequiredRole = normalizedRequiredRoles.includes(effectiveUserRole);

    // Redirect if access is denied and redirectOnDeny is true
    if (!hasRequiredRole && redirectOnDeny) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, requiredRoles, router, redirectOnDeny, redirectTo, memberships, activeOrganizationId]);

  // Calculate isAllowed
  const isAllowed = (() => {
    if (isLoading || !user) {
      return false;
    }
    const normalizedRequiredRoles = requiredRoles.map(role =>
      roleMap[role] || (role as NormalizedRole)
    );
    const normalizedUserRole: NormalizedRole =
      roleMap[user.accountType] || 'AGENT';
    const activeMembership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveUserRole = mapMembershipToEffectiveRole(
      activeMembership,
      normalizedUserRole
    );
    return normalizedRequiredRoles.includes(effectiveUserRole);
  })();

  return {
    user,
    isLoading,
    isAllowed,
  };
}
