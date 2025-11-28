'use client';

import { User, Project } from '@/types';
import {
  JobRequest,
  Technician,
  AuditLogEntry,
  Metrics
} from '@/types';
import { useState } from 'react';
import { DispatcherDashboard } from '../dispatcher/DispatcherDashboard';

interface DashboardViewProps {
  user: User;
  projects: Project[];
  jobCards: JobRequest[];
  photographers: Technician[];
  auditLog: AuditLogEntry[];
  metrics: Metrics;
}

export function DashboardView({
  user,
  projects: _projects,
  jobCards,
  photographers: initialPhotographers,
  auditLog: initialAuditLog,
  metrics: initialMetrics
}: DashboardViewProps) {
  const [jobs] = useState(jobCards);
  const [photographers] = useState(initialPhotographers);
  const [auditLog] = useState(initialAuditLog);
  const [metrics] = useState(initialMetrics);

  const handleJobCreate = (job: Partial<JobRequest>) => {
    // In a real app, this would create the job via API
    console.log('Job created:', job);
  };

  const handleJobAssign = (jobId: string, photographerId: string, score: number) => {
    // In a real app, this would assign the job via API
    console.log('Job assigned:', { jobId, photographerId, score });
  };

  const handleJobStatusChange = (jobId: string, newStatus: JobRequest['status']) => {
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
