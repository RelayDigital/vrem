'use client';

import { User } from '@/types';
import {
  jobRequests as initialJobRequests,
  photographers as initialPhotographers,
  auditLog as initialAuditLog,
  metrics,
} from '@/lib/mock-data';
import { useState } from 'react';
import { DispatcherDashboard } from '../dispatcher/DispatcherDashboard';

interface DashboardViewProps {
  user: User;
}

export function DashboardView({ user }: DashboardViewProps) {
  // For now, use mock data. In a real app, this would come from API/context
  const [jobs] = useState(initialJobRequests);
  const [photographers] = useState(initialPhotographers);
  const [auditLog] = useState(initialAuditLog);

  const handleJobCreate = (job: Partial<typeof initialJobRequests[0]>) => {
    // In a real app, this would create the job via API
    console.log('Job created:', job);
  };

  const handleJobAssign = (jobId: string, photographerId: string, score: number) => {
    // In a real app, this would assign the job via API
    console.log('Job assigned:', { jobId, photographerId, score });
  };

  const handleJobStatusChange = (jobId: string, newStatus: typeof initialJobRequests[0]['status']) => {
    // In a real app, this would update the job status via API
    console.log('Job status changed:', { jobId, newStatus });
  };

  return (
    <DispatcherDashboard
      jobs={jobs}
      photographers={photographers}
      auditLog={auditLog}
      metrics={metrics}
      onJobCreate={handleJobCreate}
      onJobAssign={handleJobAssign}
      onJobStatusChange={handleJobStatusChange}
      activeView="dashboard"
    />
  );
}

