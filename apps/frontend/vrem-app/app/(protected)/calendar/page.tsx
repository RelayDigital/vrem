"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { CalendarView } from "@/components/features/calendar/CalendarView";
import { ProjectStatus } from "@/types";
import { CalendarLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { useJobCreation } from "@/context/JobCreationContext";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { PageHeader } from "@/components/shared/layout";
import { JobDataBoundary } from "@/components/shared/jobs";
import { getEffectiveOrgRole, isCompanyRole } from "@/lib/roles";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { Technician } from "@/types";

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const jobCreation = useJobCreation();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  // Filter jobs based on role
  const displayJobs = useMemo(() => {
    if (!user) return [];

    const effectiveRole = getEffectiveOrgRole(
      user,
      memberships,
      organizationId
    );

    // Technician/Technician: Only show assigned jobs
    if (effectiveRole === "TECHNICIAN") {
      return jobManagement.jobs.filter(
        (job) =>
          job.assignedTechnicianId === user.id ||
          job.assignedTechnicianId === user.id
      );
    }

    // Company/Admin/Project Manager/Editor/Agent: Show all jobs
    return jobManagement.jobs;
  }, [jobManagement.jobs, memberships, organizationId, user]);

  // Fetch messages when selected job changes
  useEffect(() => {
    if (jobManagement.selectedJob) {
      const orgId = (jobManagement.selectedJob as any)?.organizationId;
      messaging.fetchMessages(jobManagement.selectedJob.id, "TEAM", orgId);
      const activeMembership = memberships.find((m) => m.orgId === organizationId);
      const roleUpper = (
        (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
      ).toUpperCase();
      const canViewCustomerChat = ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(roleUpper);
      if (canViewCustomerChat) {
        messaging.fetchMessages(jobManagement.selectedJob.id, "CUSTOMER", orgId);
      }
    }
  }, [jobManagement.selectedJob, messaging, memberships, organizationId]);

  if (isLoading) {
    return <CalendarLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const effectiveRole = getEffectiveOrgRole(user, memberships, organizationId);
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const isPersonalOrg =
    activeMembership?.organization?.type === "PERSONAL" ||
    (activeMembership as any)?.organizationType === "PERSONAL";
  const activeRole = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const isProjectManager =
    activeRole === "PROJECT_MANAGER" && !isPersonalOrg;
  const isEditor = activeRole === "EDITOR" && !isPersonalOrg;
  const canCreateJobs =
    isCompanyRole(effectiveRole) && !isProjectManager && !isEditor;
  const canSeeTechnicians = isCompanyRole(effectiveRole) && !isPersonalOrg;

  useEffect(() => {
    let cancelled = false;
    const loadTechs = async () => {
      if (!canSeeTechnicians) {
        setTechnicians([]);
        setLoadingTechnicians(false);
        return;
      }
      setLoadingTechnicians(true);
      try {
        const techs = await fetchOrganizationTechnicians();
        const technicianOnly = techs.filter(
          (member) => (member.role || "").toUpperCase() === "TECHNICIAN"
        );
        if (!cancelled) {
          setTechnicians(technicianOnly);
        }
      } catch (error) {
        console.error("Failed to load technicians for calendar", error);
        if (!cancelled) {
          setTechnicians([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTechnicians(false);
        }
      }
    };
    loadTechs();
    return () => {
      cancelled = true;
    };
  }, [canSeeTechnicians, organizationId]);

  // Use context handlers
  const handleJobClick = jobManagement.openTaskView;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/jobs/${jobManagement.selectedJob.id}`);
    }
  };
  const handleTaskViewClose = jobManagement.handleTaskViewClose;

  const handleCreateJob = (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => {
    if (canCreateJobs) {
      jobCreation.openJobCreationDialog(initialValues);
    }
  };

  const handleJobStatusChangeWrapper = (jobId: string, status: string) => {
    const statusMap: Record<string, ProjectStatus> = {
      pending: ProjectStatus.BOOKED,
      assigned: ProjectStatus.SHOOTING,
      in_progress: ProjectStatus.SHOOTING,
      editing: ProjectStatus.EDITING,
      delivered: ProjectStatus.DELIVERED,
      cancelled: ProjectStatus.BOOKED,
    };
    jobManagement.changeJobStatus(
      jobId,
      statusMap[status] || ProjectStatus.BOOKED
    );
  };

  // Empty technicians array - backend will provide when endpoint is ready
  return (
    <div className="size-full overflow-x-hidden space-y-6">
      <JobDataBoundary fallback={<CalendarLoadingSkeleton />}>
        <CalendarView
          canSeeTechnicians={canSeeTechnicians}
          jobs={displayJobs}
          technicians={technicians}
          techniciansLoading={loadingTechnicians}
          onJobClick={handleJobClick}
          onCreateJob={canCreateJobs ? handleCreateJob : undefined}
        />
      </JobDataBoundary>

      {/* Job Task View - Sheet */}
      <JobTaskView
        job={jobManagement.selectedJob}
        // technician={undefined}
        messages={
          jobManagement.selectedJob
            ? messaging.getMessagesForJob(jobManagement.selectedJob.id)
            : []
        }
        currentUserId={user?.id || "current-user-id"}
        currentUserName={user?.name || "Current User"}
        isClient={false}
        open={jobManagement.showTaskView}
        onOpenChange={handleTaskViewClose}
        onSendMessage={(content, channel, threadId) =>
          messaging.sendMessage(
            jobManagement.selectedJob?.id || "",
            content,
            channel,
            threadId
          )
        }
        onEditMessage={(messageId, content) =>
          messaging.editMessage(messageId, content)
        }
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={(status) => {
          if (jobManagement.selectedJob) {
            handleJobStatusChangeWrapper(jobManagement.selectedJob.id, status);
          }
        }}
        onAssignTechnician={jobManagement.handleAssignTechnician}
        onChangeTechnician={jobManagement.handleChangeTechnician}
        variant="sheet"
        onFullScreen={handleFullScreen}
        onOpenInNewPage={handleOpenInNewPage}
      />

      {/* Job Task View - Dialog (Full Screen) */}
      <JobTaskView
        job={jobManagement.selectedJob}
        // technician={undefined}
        messages={
          jobManagement.selectedJob
            ? messaging.getMessagesForJob(jobManagement.selectedJob.id)
            : []
        }
        currentUserId={user?.id || "current-user-id"}
        currentUserName={user?.name || "Current User"}
        isClient={false}
        open={jobManagement.showTaskDialog}
        onOpenChange={handleTaskDialogClose}
        onSendMessage={(content, channel, threadId) =>
          messaging.sendMessage(
            jobManagement.selectedJob?.id || "",
            content,
            channel,
            threadId
          )
        }
        onEditMessage={(messageId, content) =>
          messaging.editMessage(messageId, content)
        }
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={(status) => {
          if (jobManagement.selectedJob) {
            handleJobStatusChangeWrapper(jobManagement.selectedJob.id, status);
          }
        }}
        onAssignTechnician={jobManagement.handleAssignTechnician}
        onChangeTechnician={jobManagement.handleChangeTechnician}
        variant="dialog"
      />
    </div>
  );
}
