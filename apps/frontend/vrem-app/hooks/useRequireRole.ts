'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { currentUser, photographers } from '@/lib/mock-data';

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
      // For now, use mock data and check localStorage for account type
      const accountType = localStorage.getItem('accountType') as 'agent' | 'dispatcher' | 'photographer' | null;
      
      // Require authentication - if no accountType, redirect to login
      if (!accountType) {
        setUser(null);
        setIsLoading(false);
        router.push('/');
        return;
      }
      
      // Create user based on account type from localStorage
      let mockUser: User = { ...currentUser };
      
      if (accountType === 'agent') {
        // Set user to agent role and organization
        mockUser = {
          ...currentUser,
          role: 'agent',
          organizationId: 'org-client-001', // Agent organization
          organizationType: 'agent',
        };
      } else if (accountType === 'photographer') {
        // Set user to photographer role - find matching photographer or use first one
        const matchingPhotographer = photographers.find((p) => p.email === currentUser.email) || photographers[0];
        if (matchingPhotographer) {
          mockUser = {
            ...currentUser,
            id: matchingPhotographer.id,
            role: 'photographer',
            organizationId: matchingPhotographer.organizationId,
            organizationType: matchingPhotographer.isIndependent ? undefined : 'media_company',
          };
        } else {
          mockUser = {
            ...currentUser,
            role: 'photographer',
          };
        }
      } else if (accountType === 'dispatcher') {
        // Set user to dispatcher role
        mockUser = currentUser;
      } else {
        // Invalid account type, redirect to login
        setUser(null);
        setIsLoading(false);
        router.push('/');
        return;
      }

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

