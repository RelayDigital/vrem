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

// Map backend role names to frontend role names (for normalization)
// Same mapping as useRequireRole for consistency
const roleMap: Record<string, User['role']> = {
  DISPATCHER: 'DISPATCHER',
  TECHNICIAN: 'TECHNICIAN',
  AGENT: 'AGENT',
  // Legacy/old mappings to new roles
  ADMIN: 'DISPATCHER',
  PROJECT_MANAGER: 'DISPATCHER',
  EDITOR: 'DISPATCHER',
  dispatcher: 'DISPATCHER',
  technician: 'TECHNICIAN',
  agent: 'AGENT',
  admin: 'DISPATCHER',
  project_manager: 'DISPATCHER',
  editor: 'DISPATCHER',
};

/**
 * Hook to guard routes based on user roles
 * Returns whether the user is allowed access, without automatically redirecting
 * (unless redirectOnDeny is true)
 */
export function useRoleGuard(
  requiredRoles: (User['role'] | string)[],
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
      roleMap[role] || (role as User['role'])
    );
    const normalizedUserRole = roleMap[user.role] || user.role;
    const activeMembership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveUserRole =
      activeMembership && ['OWNER', 'ADMIN'].includes(activeMembership.role)
        ? 'DISPATCHER'
        : normalizedUserRole;

    // Check if user has one of the required roles
    const hasRequiredRole = normalizedRequiredRoles.includes(effectiveUserRole);

    // Redirect if access is denied and redirectOnDeny is true
    if (!hasRequiredRole && redirectOnDeny) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, requiredRoles, router, redirectOnDeny, redirectTo]);

  // Calculate isAllowed
  const isAllowed = (() => {
    if (isLoading || !user) {
      return false;
    }
    const normalizedRequiredRoles = requiredRoles.map(role =>
      roleMap[role] || (role as User['role'])
    );
    const normalizedUserRole = roleMap[user.role] || user.role;
    const activeMembership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveUserRole =
      activeMembership && ['OWNER', 'ADMIN'].includes(activeMembership.role)
        ? 'DISPATCHER'
        : normalizedUserRole;
    return normalizedRequiredRoles.includes(effectiveUserRole);
  })();

  return {
    user,
    isLoading,
    isAllowed,
  };
}
