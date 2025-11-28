'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
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
const roleMap: Record<string, User['role']> = {
  'ADMIN': 'ADMIN',
  'PROJECT_MANAGER': 'PROJECT_MANAGER',
  'TECHNICIAN': 'TECHNICIAN',
  'EDITOR': 'EDITOR',
  'AGENT': 'AGENT',
  // Legacy lowercase mappings (for backwards compatibility)
  'dispatcher': 'ADMIN',
  'photographer': 'TECHNICIAN',
  'agent': 'AGENT',
  'admin': 'ADMIN',
  'project_manager': 'PROJECT_MANAGER',
  'editor': 'EDITOR',
};

/**
 * Hook to require a user to have one of the specified roles
 */
export function useRequireRole(
  allowedRoles: (User['role'] | string)[],
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

    // Normalize role names (handle both backend and frontend role formats)
    const normalizedAllowedRoles = allowedRoles.map(role => 
      roleMap[role] || (role as User['role'])
    );
    const normalizedUserRole = roleMap[user.role] || user.role;

    // Check if user has one of the allowed roles
    const hasAllowedRole = normalizedAllowedRoles.includes(normalizedUserRole);

    if (!hasAllowedRole) {
      // Redirect to user's appropriate dashboard based on their role
      if (options.redirectTo) {
        router.push(options.redirectTo);
      } else {
        // Get the user's role dashboard path
        const getUserDashboardPath = (role: User['role']): string => {
          if (role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'EDITOR') {
            return '/dispatcher';
          } else if (role === 'AGENT') {
            return '/agent';
          } else if (role === 'TECHNICIAN') {
            return '/photographer';
          }
          // Fallback to root if role is unknown
          return '/';
        };
        
        const dashboardPath = getUserDashboardPath(user.role);
        router.push(dashboardPath);
      }
    }
  }, [user, isLoading, allowedRoles, router, options.redirectTo]);

  return { user, organizationId: activeOrganizationId, memberships, isLoading };
}
