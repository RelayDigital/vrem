'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { LiveJobMapView } from '@/components/features/dispatcher/views/LiveJobMapView';
import { JobRequest } from '@/types';
import { MapLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { useJobManagement } from '@/context/JobManagementContext';

export default function MapPage() {
  const { user, isLoading } = useRequireRole([
    'dispatcher',
    'AGENT',
    'TECHNICIAN',
    'EDITOR',
    'ADMIN',
    'PROJECT_MANAGER',
  ]);
  const router = useRouter();
  const jobManagement = useJobManagement();

  // Filter jobs based on role
  const displayJobs = useMemo(() => {
    if (!user) return [];
    
    const userRole = user.role;
    
    // Technician/Photographer: Only show assigned jobs
    if (['TECHNICIAN'].includes(userRole)) {
      return jobManagement.jobs.filter(
        (job) =>
          job.assignedPhotographerId === user.id ||
          job.assignedTechnicianId === user.id
      );
    }
    
    // Dispatcher/Admin/Project Manager/Editor/Agent: Show all jobs
    return jobManagement.jobs;
  }, [jobManagement.jobs, user]);

  // Filter photographers based on role
  const displayPhotographers = useMemo(() => {
    // Empty array - backend will provide when endpoint is ready
    const photographers: any[] = [];
    
    if (!user) return photographers;
    
    const userRole = user.role;
    
    // Technician/Photographer: Only include photographers that appear in their jobs
    if (['TECHNICIAN'].includes(userRole)) {
      const ids = new Set(
        displayJobs
          .map((job) => job.assignedPhotographerId || job.assignedTechnicianId)
          .filter((id): id is string => Boolean(id))
      );
      return photographers.filter((p) => ids.has(p.id));
    }
    
    // Dispatcher/Admin/Project Manager/Editor/Agent: Show all photographers
    return photographers;
  }, [displayJobs, user]);

  if (isLoading) {
    return <MapLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = user.role;
  const canAssignJobs = ['dispatcher', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'].includes(userRole);
  const isDispatcherView = canAssignJobs; // Only dispatcher roles see "Pending Assignments" language

  const handleJobSelect = (job: JobRequest) => {
    if (jobManagement.selectedJob?.id === job.id) {
      jobManagement.selectJob(null);
    } else {
      jobManagement.selectJob(job);
    }
  };

  const handleJobAssign = canAssignJobs ? jobManagement.assignJob : undefined;

  const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
    jobManagement.selectJob(job);
    router.push(`/jobs/${job.id}`);
  };

  return (
    <div className="size-full overflow-x-hidden">
      <LiveJobMapView
        jobs={displayJobs}
        photographers={displayPhotographers}
        selectedJob={jobManagement.selectedJob}
        onSelectJob={handleJobSelect}
        onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
        onJobAssign={handleJobAssign}
        hasSidebar={canAssignJobs}
        isDispatcherView={isDispatcherView}
      />
    </div>
  );
}
