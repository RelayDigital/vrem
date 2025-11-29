"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { LiveJobMapView } from "@/components/features/dispatcher/views/LiveJobMapView";
import { Photographer, JobRequest } from "@/types";
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented (visual placeholder only)
import { photographers as initialPhotographers } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/utils";
import { MapLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";

export default function PhotographerMapPage() {
  const { user, isLoading } = useRequireRole([
    "TECHNICIAN",
    "photographer",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();
  const jobManagement = useJobManagement();
  const [photographers] = useState<Photographer[]>(USE_MOCK_DATA ? initialPhotographers : []);

  if (isLoading) {
    return <MapLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  // Filter jobs to only show those assigned to the current photographer
  const assignedJobs = useMemo(() => {
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedPhotographerId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user]);

  // Only include this photographer in the map technicians list
  const mapPhotographers = useMemo(() => {
    const ids = new Set(
      assignedJobs
        .map((job) => job.assignedPhotographerId || job.assignedTechnicianId)
        .filter((id): id is string => Boolean(id))
    );
    return photographers.filter((p) => ids.has(p.id));
  }, [assignedJobs, photographers]);

  const handleJobSelect = (job: JobRequest) => {
    if (jobManagement.selectedJob?.id === job.id) {
      jobManagement.selectJob(null);
    } else {
      jobManagement.selectJob(job);
    }
  };

  const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
    jobManagement.selectJob(job);
    router.push(`/photographer/jobs/${job.id}`);
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <LiveJobMapView
        jobs={assignedJobs}
        photographers={mapPhotographers}
        selectedJob={jobManagement.selectedJob}
        onSelectJob={handleJobSelect}
        onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
        // Photographers cannot assign jobs from the map
        onJobAssign={undefined}
        hasSidebar={false}
      />
    </div>
  );
}


