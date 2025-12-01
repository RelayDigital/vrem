'use client';

import { useEffect, useState } from 'react';
import { OrganizationMember } from '@/types';
import { api } from '@/lib/api';
import { useCurrentOrganization } from './useCurrentOrganization';

export function useOrganizations() {
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { activeOrganizationId, setActiveOrganization } = useCurrentOrganization();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await api.organizations.listMine();
        setMemberships(data);
        if (!activeOrganizationId && data.length > 0) {
          const personal = data.find(
            (m) => m.organization?.orgType === 'PERSONAL' || m.organization?.type === 'PERSONAL'
          );
          const fallbackOrgId = personal?.orgId || data[0]?.orgId || null;
          if (fallbackOrgId) {
            setActiveOrganization(fallbackOrgId);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return {
    memberships,
    isLoading,
    activeOrganizationId,
    setActiveOrganization,
  };
}
