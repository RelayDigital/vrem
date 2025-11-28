'use client';

import { useEffect, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { api } from '@/lib/api';
import { MarketplaceJob } from '@/types';
import { toast } from 'sonner';

export default function MarketplacePage() {
  const { user, isLoading } = useRequireRole(['TECHNICIAN', 'ADMIN', 'PROJECT_MANAGER', 'AGENT']);
  const [jobs, setJobs] = useState<MarketplaceJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.marketplace.listJobs();
        setJobs(data);
      } catch (err: any) {
        setError(err?.message || 'Marketplace unavailable');
      }
    };
    load();
  }, []);

  const handleApply = async (jobId: string) => {
    try {
      await api.marketplace.apply(jobId, {});
      toast.success('Applied to job');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply');
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  if (error) {
    return <div className="p-6 text-sm text-muted-foreground">Marketplace unavailable: {error}</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Marketplace</h1>
      {jobs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No marketplace jobs available.</div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="border rounded-lg p-4 bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{job.title}</div>
                  <div className="text-sm text-muted-foreground">{job.location || 'Remote/On-site TBD'}</div>
                </div>
                <div className="text-sm font-medium">{job.currency} {job.compensation}</div>
              </div>
              <p className="text-sm text-muted-foreground">{job.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Status: {job.status}</span>
                <button
                  onClick={() => handleApply(job.id)}
                  className="ml-auto px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
