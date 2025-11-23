'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { currentUser } from '@/lib/mock-data';

interface UseRequireRoleOptions {
  redirectTo?: string;
}

interface UseRequireRoleReturn {
  user: User | null;
  isLoading: boolean;
}

// Map backend role names to frontend role names
const roleMap: Record<string, User['role']> = {
  'ADMIN': 'admin',
  'PROJECT_MANAGER': 'project_manager',
  'TECHNICIAN': 'photographer', // Technicians are photographers in the frontend
  'EDITOR': 'editor',
  'AGENT': 'agent',
  'dispatcher': 'dispatcher',
  'photographer': 'photographer',
  'agent': 'agent',
  'admin': 'admin',
  'project_manager': 'project_manager',
  'editor': 'editor',
};

/**
 * Hook to require a user to have one of the specified roles
 * In a real app, this would check against an auth context/API
 */
export function useRequireRole(
  allowedRoles: (User['role'] | string)[],
  options: UseRequireRoleOptions = {}
): UseRequireRoleReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      // In a real app, this would get the user from auth context/API
      // For now, use mock data
      const mockUser = currentUser;

      // Normalize role names (handle both backend and frontend role formats)
      const normalizedAllowedRoles = allowedRoles.map(role => 
        roleMap[role] || role as User['role']
      );
      const normalizedUserRole = roleMap[mockUser.role] || mockUser.role;

      // Check if user has one of the allowed roles
      const hasAllowedRole = normalizedAllowedRoles.includes(normalizedUserRole);

      if (hasAllowedRole) {
        setUser(mockUser);
      } else {
        setUser(null);
        // Redirect to home or login if user doesn't have required role
        if (options.redirectTo) {
          router.push(options.redirectTo);
        } else {
          router.push('/');
        }
      }

      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [allowedRoles, router, options.redirectTo]);

  return { user, isLoading };
}

