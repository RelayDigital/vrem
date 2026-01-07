'use client';

import { useEffect, useState, useMemo } from 'react';
import { OrgContextResponse, OrgContextMembership, CustomerOfOrg, OrgMetadata, OrganizationMember, OrgRole } from '@/types';
import { api } from '@/lib/api';
import { useCurrentOrganization } from './useCurrentOrganization';

/**
 * Convert the canonical org context response to legacy OrganizationMember format.
 * This allows existing components to work without changes.
 */
function toMembershipFormat(
  personalOrg: OrgMetadata,
  memberships: OrgContextMembership[],
  customerOfOrgs: CustomerOfOrg[],
): OrganizationMember[] {
  const result: OrganizationMember[] = [];

  // Personal org always comes first
  result.push({
    id: `personal-${personalOrg.id}`,
    userId: '', // Not needed for switcher
    user: {} as any, // Not needed for switcher
    orgId: personalOrg.id,
    organization: {
      id: personalOrg.id,
      name: personalOrg.name,
      type: personalOrg.type,
      logoUrl: personalOrg.logoUrl || undefined,
      createdAt: new Date(),
    },
    orgRole: 'OWNER' as OrgRole,
    role: 'OWNER' as OrgRole,
    createdAt: new Date(),
  });

  // Add TEAM and COMPANY memberships
  for (const m of memberships) {
    result.push({
      id: `member-${m.orgId}`,
      userId: '',
      user: {} as any,
      orgId: m.orgId,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        type: m.organization.type,
        logoUrl: m.organization.logoUrl || undefined,
        createdAt: m.createdAt,
      },
      orgRole: m.role,
      role: m.role,
      createdAt: m.createdAt,
    });
  }

  // Note: customerOfOrgs are NOT included in the org switcher list
  // They are only used for agent booking flows

  return result;
}

export function useOrganizations() {
  const [orgContext, setOrgContext] = useState<OrgContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { activeOrganizationId, setActiveOrganization } = useCurrentOrganization();

  // Convert to legacy format for backward compatibility
  const memberships = useMemo(() => {
    if (!orgContext) return [];
    return toMembershipFormat(
      orgContext.personalOrg,
      orgContext.memberships,
      orgContext.customerOfOrgs,
    );
  }, [orgContext]);

  // Expose customerOfOrgs for agent booking flows
  const customerOfOrgs = useMemo(() => {
    return orgContext?.customerOfOrgs || [];
  }, [orgContext]);

  // Personal org is always available
  const personalOrg = useMemo(() => {
    return orgContext?.personalOrg || null;
  }, [orgContext]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await api.me.orgContext();
        setOrgContext(data);

        // If no active org set, default to personal org
        if (!activeOrganizationId && data.personalOrg) {
          setActiveOrganization(data.personalOrg.id);
        }
      } catch (error) {
        console.error('Failed to load org context:', error);
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

      setOrgContext((prev) => {
        if (!prev) return prev;

        // Update personal org if it matches
        if (prev.personalOrg.id === updatedOrg.id) {
          return {
            ...prev,
            personalOrg: { ...prev.personalOrg, ...updatedOrg },
          };
        }

        // Update in memberships
        const updatedMemberships = prev.memberships.map((m) =>
          m.organization.id === updatedOrg.id
            ? { ...m, organization: { ...m.organization, ...updatedOrg } }
            : m
        );

        return {
          ...prev,
          memberships: updatedMemberships,
        };
      });
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
    // Legacy format for backward compatibility
    memberships,
    isLoading,
    activeOrganizationId,
    setActiveOrganization,
    // New canonical format
    orgContext,
    personalOrg,
    customerOfOrgs,
  };
}
