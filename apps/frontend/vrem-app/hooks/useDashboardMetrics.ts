'use client';

import { useCallback, useEffect, useState } from 'react';
import { Metrics } from '@/types';
import { api } from '@/lib/api';

interface DashboardMetricsState {
  metrics: Metrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDashboardMetrics(enabled: boolean): DashboardMetricsState {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled) {
      setMetrics(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dashboardData = await api.dashboard.get();
      setMetrics(dashboardData.metrics);
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
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}


