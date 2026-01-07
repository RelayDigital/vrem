'use client';

import { useCallback, useEffect, useState } from 'react';
import { Metrics, ProviderStats, AgentStats } from '@/types';
import { api } from '@/lib/api';

type DashboardRole = 'COMPANY' | 'PROVIDER' | 'AGENT' | 'TECHNICIAN' | 'EDITOR';

interface DashboardMetricsState {
  metrics: Metrics | null;
  stats: ProviderStats | AgentStats | null;
  role: DashboardRole | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDashboardMetrics(enabled: boolean): DashboardMetricsState {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [stats, setStats] = useState<ProviderStats | AgentStats | null>(null);
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled) {
      setMetrics(null);
      setStats(null);
      setRole(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dashboardData = await api.dashboard.get();
      setMetrics(dashboardData.metrics);
      setStats(dashboardData.stats || null);
      setRole(dashboardData.role || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load dashboard metrics'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    stats,
    role,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}


