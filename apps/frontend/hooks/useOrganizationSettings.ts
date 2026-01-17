'use client';

import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/types';
import { api } from '@/lib/api';
import { useCurrentOrganization } from './useCurrentOrganization';

export function useOrganizationSettings(orgIdOverride?: string) {
  const { activeOrganizationId, setActiveOrganization } = useCurrentOrganization();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectiveOrgId = orgIdOverride || activeOrganizationId;

  useEffect(() => {
    if (orgIdOverride && orgIdOverride !== activeOrganizationId) {
      setActiveOrganization(orgIdOverride);
      api.organizations.setActiveOrganization(orgIdOverride);
    }
  }, [orgIdOverride, activeOrganizationId, setActiveOrganization]);

  const loadOrganization = useCallback(async () => {
    if (!effectiveOrgId) {
      setOrganization(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const org = await api.organizations.getById(effectiveOrgId);
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load organization'));
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const save = useCallback(async (updates: Partial<Organization>) => {
    if (!effectiveOrgId) {
      throw new Error('No active organization');
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.organizations.updateSettings(effectiveOrgId, updates);
      setOrganization(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update organization settings');
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [effectiveOrgId]);

  const reload = useCallback(() => {
    return loadOrganization();
  }, [loadOrganization]);

  return {
    organization,
    isLoading,
    isSaving,
    error,
    save,
    reload,
  };
}
