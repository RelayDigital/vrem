'use client';

import { User, Project } from '@/types';
import {
  JobRequest,
  Technician,
  AuditLogEntry,
  Metrics
} from '@/types';
import { useState } from 'react';
import { CompanyDashboard } from '../company/CompanyDashboard';

interface DashboardViewProps {
  user: User;
  projects: Project[];
  jobCards: JobRequest[];
  technicians: Technician[];
  auditLog: AuditLogEntry[];
  metrics: Metrics;
}

export function DashboardView({
  user,
  projects: _projects,
  jobCards,
  technicians: initialTechnicians,
  auditLog: initialAuditLog,
  metrics: initialMetrics
}: DashboardViewProps) {
  const [jobs] = useState(jobCards);
  const [technicians] = useState(initialTechnicians);
  const [auditLog] = useState(initialAuditLog);
  const [metrics] = useState(initialMetrics);

  const handleJobCreate = (job: Partial<JobRequest>) => {
    // In a real app, this would create the job via API
    console.log('Job created:', job);
  };

  const handleJobAssign = (jobId: string, technicianId: string, score: number) => {
    // In a real app, this would assign the job via API
    console.log('Job assigned:', { jobId, technicianId, score });
  };

  const handleJobStatusChange = (jobId: string, newStatus: JobRequest['status']) => {
    // In a real app, this would update the job status via API
    console.log('Job status changed:', { jobId, newStatus });
  };

  return (
    <CompanyDashboard
      jobs={jobs}
      technicians={technicians}
      auditLog={auditLog}
      metrics={metrics}
      onJobCreate={handleJobCreate}
      onJobAssign={handleJobAssign}
      onJobStatusChange={handleJobStatusChange}
      activeView="dashboard"
    />
  );
}
