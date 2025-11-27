'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { LiveJobMapView } from '@/components/features/dispatcher/views/LiveJobMapView';
import { Photographer } from '@/types';
import {
  photographers as initialPhotographers,
} from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { MapLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { useJobManagement } from '@/context/JobManagementContext';

export default function DispatcherMapPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);
  const router = useRouter();
  const jobManagement = useJobManagement();
  const [photographers] = useState(initialPhotographers);

  if (isLoading) {
    return <MapLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const handleJobSelect = (job: JobRequest) => {
    if (jobManagement.selectedJob?.id === job.id) {
      jobManagement.selectJob(null);
    } else {
      jobManagement.selectJob(job);
    }
  };

  const handleJobAssign = jobManagement.assignJob;

  const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
    jobManagement.selectJob(job);
    router.push('/dispatcher/jobs');
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <LiveJobMapView
        jobs={jobManagement.jobs}
        photographers={photographers}
        selectedJob={jobManagement.selectedJob}
        onSelectJob={handleJobSelect}
        onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
        onJobAssign={handleJobAssign}
      />

    </div>
  );
}

