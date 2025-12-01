"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { LiveJobMapView } from "@/components/features/dispatcher/views/LiveJobMapView";
import { JobRequest, Technician } from "@/types";
import { MapLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { JobDataBoundary } from "@/components/shared/jobs";
import { fetchOrganizationTechnicians } from "@/lib/technicians";

export default function MapPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();
  const jobManagement = useJobManagement();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTechnicians = async () => {
      setLoadingTechnicians(true);
      try {
        const techniciansFromMembers = await fetchOrganizationTechnicians();

        if (!cancelled) {
          setTechnicians(techniciansFromMembers);
        }
      } catch (error) {
        console.error("Failed to load technicians for map:", error);
        if (!cancelled) {
          setTechnicians([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTechnicians(false);
        }
      }
    };

    if (user) {
      loadTechnicians();
    } else {
      setTechnicians([]);
      setLoadingTechnicians(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Filter jobs based on role
  const displayJobs = useMemo(() => {
    if (!user) return [];

    const userRole = user.role;

    // Technician/Technician: Only show assigned jobs
    if (["TECHNICIAN"].includes(userRole)) {
      return jobManagement.jobs.filter(
        (job) =>
          job.assignedTechnicianId === user.id ||
          job.assignedTechnicianId === user.id
      );
    }

    // Dispatcher/Admin/Project Manager/Editor/Agent: Show all jobs
    return jobManagement.jobs;
  }, [jobManagement.jobs, user]);

  // Filter technicians based on role
  const displayTechnicians = useMemo(() => {
    if (!user) return [];

    const userRole = user.role;

    // Technician/Technician: Only include technicians that appear in their jobs
    if (["TECHNICIAN"].includes(userRole)) {
      const ids = new Set(
        displayJobs
          .map((job) => job.assignedTechnicianId || job.assignedTechnicianId)
          .filter((id): id is string => Boolean(id))
      );
      const filtered = technicians.filter(
        (p) => ids.has(p.id) || p.id === user.id
      );
      // Ensure the current technician sees themselves even if not on a job yet
      if (!filtered.find((p) => p.id === user.id)) {
        const self = technicians.find((p) => p.id === user.id);
        return self ? [self] : filtered;
      }
      return filtered;
    }

    // Dispatcher/Admin/Project Manager/Editor/Agent: Show all technicians
    return technicians;
  }, [displayJobs, user, technicians]);

  if (isLoading || loadingTechnicians) {
    return <MapLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = user.role;
  const canAssignJobs = [
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
    "EDITOR",
  ].includes(userRole);
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
    <JobDataBoundary fallback={<MapLoadingSkeleton />}>
      <LiveJobMapView
        jobs={displayJobs}
        technicians={displayTechnicians}
        selectedJob={jobManagement.selectedJob}
        onSelectJob={handleJobSelect}
        onNavigateToJobInProjectManagement=
          {handleNavigateToJobInProjectManagement}
        onJobAssign={handleJobAssign}
        hasSidebar={canAssignJobs}
        isDispatcherView={isDispatcherView}
      />
    </JobDataBoundary>
  );
}
