'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { useAuth } from '@/context/auth-context';
import { EffectiveRole, getEffectiveOrgRole, toEffectiveRole } from '@/lib/roles';

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
    const normalizedRequiredRoles = requiredRoles.map((role) =>
      toEffectiveRole(role),
    );
    const effectiveUserRole =
      getEffectiveOrgRole(user, memberships, activeOrganizationId) ||
      toEffectiveRole(user.accountType);

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
    const normalizedRequiredRoles = requiredRoles.map((role) =>
      toEffectiveRole(role),
    );
    const effectiveUserRole =
      getEffectiveOrgRole(user, memberships, activeOrganizationId) ||
      toEffectiveRole(user.accountType);
    return normalizedRequiredRoles.includes(effectiveUserRole as EffectiveRole);
  })();

  return {
    user,
    isLoading,
    isAllowed,
  };
}
