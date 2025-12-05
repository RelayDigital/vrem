"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { LiveJobMapView } from "@/components/features/company/views/LiveJobMapView";
import { JobRequest, Technician } from "@/types";
import { MapLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { JobDataBoundary } from "@/components/shared/jobs";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { getEffectiveOrgRole, isDispatcherRole } from "@/lib/roles";

export default function MapPage() {
  const { user, isLoading, memberships, organizationId } = useRequireRole([
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

  const effectiveRole = getEffectiveOrgRole(user, memberships, organizationId);
  const dispatcherElevated = isDispatcherRole(effectiveRole);

  // Filter jobs based on role
  const displayJobs = useMemo(() => {
    if (!user) return [];

    const userRole = effectiveRole;

    // Dispatcher/Admin/Owner: Show all jobs
    if (dispatcherElevated) {
      return jobManagement.jobs;
    }

    // Technician/Technician: Only show assigned jobs
    if (["TECHNICIAN"].includes(userRole || "")) {
      return jobManagement.jobs.filter(
        (job) =>
          job.assignedTechnicianId === user.id ||
          job.assignedTechnicianId === user.id
      );
    }
    // Other roles: fallback to assigned
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedTechnicianId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [dispatcherElevated, effectiveRole, jobManagement.jobs, user]);

  // Filter technicians based on role
  const displayTechnicians = useMemo(() => {
    if (!user) return [];

    const userRole = effectiveRole;

    // Dispatcher/Admin/Owner: show all technicians
    if (dispatcherElevated) {
      return technicians;
    }

    // Technician: only those involved in their jobs + self
    if ((userRole || "") === "TECHNICIAN") {
      const ids = new Set(
        displayJobs
          .map((job) => job.assignedTechnicianId || job.assignedTechnicianId)
          .filter((id): id is string => Boolean(id))
      );
      const filtered = technicians.filter(
        (p) => ids.has(p.id) || p.id === user.id
      );
      if (!filtered.find((p) => p.id === user.id)) {
        const self = technicians.find((p) => p.id === user.id);
        return self ? [self] : filtered;
      }
      return filtered;
    }

    // Default: show all technicians
    return technicians;
  }, [dispatcherElevated, displayJobs, effectiveRole, technicians, user]);

  if (isLoading || loadingTechnicians) {
    return <MapLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = effectiveRole;
  const canAssignJobs = isDispatcherRole(userRole);
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
