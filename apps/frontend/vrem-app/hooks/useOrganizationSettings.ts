'use client';

import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/types';
import { api } from '@/lib/api';
import { useCurrentOrganization } from './useCurrentOrganization';

export function useOrganizationSettings() {
  const { activeOrganizationId } = useCurrentOrganization();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadOrganization = useCallback(async () => {
    if (!activeOrganizationId) {
      setOrganization(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const org = await api.organizations.getById(activeOrganizationId);
      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load organization'));
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const save = useCallback(async (updates: Partial<Organization>) => {
    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.organizations.updateSettings(activeOrganizationId, updates);
      setOrganization(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update organization settings');
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [activeOrganizationId]);

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

