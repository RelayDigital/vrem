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
          setActiveOrganization(data[0].orgId);
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
