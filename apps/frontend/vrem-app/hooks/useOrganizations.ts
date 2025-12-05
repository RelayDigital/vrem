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
            (m) => m.organization?.type === 'PERSONAL'
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

  useEffect(() => {
    const handleOrganizationUpdated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const updatedOrg = detail?.organization;
      if (!updatedOrg) return;
      setMemberships((prev) =>
        prev.map((m) =>
          m.orgId === updatedOrg.id
            ? { ...m, organization: { ...m.organization, ...updatedOrg } }
            : m
        )
      );
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('organizationUpdated', handleOrganizationUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('organizationUpdated', handleOrganizationUpdated);
      }
    };
  }, []);

  return {
    memberships,
    isLoading,
    activeOrganizationId,
    setActiveOrganization,
  };
}
