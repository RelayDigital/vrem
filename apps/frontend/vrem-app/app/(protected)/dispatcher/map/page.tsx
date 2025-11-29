'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { LiveJobMapView } from '@/components/features/dispatcher/views/LiveJobMapView';
import { JobRequest, Photographer } from '@/types';
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented (visual placeholder only)
import {
  photographers as initialPhotographers,
} from '@/lib/mock-data';
import { USE_MOCK_DATA } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { MapLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { useJobManagement } from '@/context/JobManagementContext';

export default function DispatcherMapPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const router = useRouter();
  const jobManagement = useJobManagement();
  const [photographers] = useState(USE_MOCK_DATA ? initialPhotographers : []);

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

