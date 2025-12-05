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
import { getEffectiveOrgRole, isDispatcherRole } from "@/lib/roles";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { Technician } from "@/types";

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const jobCreation = useJobCreation();
  const [technicians, setTechnicians] = useState<Technician[]>([]);

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

    // Dispatcher/Admin/Project Manager/Editor/Agent: Show all jobs
    return jobManagement.jobs;
  }, [jobManagement.jobs, memberships, organizationId, user]);

  // Fetch messages when selected job changes
  useEffect(() => {
    if (jobManagement.selectedJob) {
      messaging.fetchMessages(
        jobManagement.selectedJob.id,
        (jobManagement.selectedJob as any)?.organizationId
      );
    }
  }, [jobManagement.selectedJob, messaging]);

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
  const canCreateJobs = isDispatcherRole(effectiveRole);
  const canSeeTechnicians = isDispatcherRole(effectiveRole) && !isPersonalOrg;

  useEffect(() => {
    let cancelled = false;
    const loadTechs = async () => {
      if (!canSeeTechnicians) {
        setTechnicians([]);
        return;
      }
      try {
        const techs = await fetchOrganizationTechnicians();
        if (!cancelled) {
          setTechnicians(techs);
        }
      } catch (error) {
        console.error("Failed to load technicians for calendar", error);
        if (!cancelled) {
          setTechnicians([]);
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
        onSendMessage={(content, chatType, threadId) =>
          messaging.sendMessage(
            jobManagement.selectedJob?.id || "",
            content,
            chatType,
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
        onSendMessage={(content, chatType, threadId) =>
          messaging.sendMessage(
            jobManagement.selectedJob?.id || "",
            content,
            chatType,
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
