'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';

export function useCurrentOrganization() {
  const { memberships, activeOrganizationId, switchOrganization } = useAuth();

  const activeMembership = useMemo(() => {
    if (!activeOrganizationId) return null;
    return memberships.find((m) => m.orgId === activeOrganizationId) || null;
  }, [activeOrganizationId, memberships]);

  return {
    memberships,
    activeOrganizationId,
    activeMembership,
    setActiveOrganization: switchOrganization,
  };
}
