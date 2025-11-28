'use client';

import { useEffect, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { api } from '@/lib/api';
import { AnalyticsSummary } from '@/types';

export default function AnalyticsPage() {
  const { user, isLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER']);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.analytics.getSummary('week');
        setSummary(data);
      } catch (err: any) {
        setError(err?.message || 'Analytics not available');
      }
    };
    load();
  }, []);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  if (error) {
    return <div className="p-6 text-sm text-muted-foreground">Analytics unavailable: {error}</div>;
  }

  if (!summary) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Jobs Total" value={summary.jobs.total} />
        <Card title="Pending" value={summary.jobs.pending} />
        <Card title="Assigned" value={summary.jobs.assigned} />
        <Card title="Completed" value={summary.jobs.completed} />
        <Card title="Cancelled" value={summary.jobs.cancelled} />
        <Card title="Technicians Active" value={summary.technicians.active} />
        <Card title="Revenue" value={`${summary.revenue.total}`} />
        <Card title="On-Time Rate" value={`${Math.round(summary.performance.onTimeRate * 100)}%`} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
