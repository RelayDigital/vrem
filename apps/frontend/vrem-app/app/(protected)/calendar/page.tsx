"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { CalendarView } from "@/components/features/calendar/CalendarView";
import { ProjectStatus } from "@/types";
import { CalendarLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { useJobCreation } from "@/context/JobCreationContext";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { PageHeader } from "@/components/shared/layout";
import { JobDataBoundary } from "@/components/shared/jobs";

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
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

  const userRole = user.role;
  const canCreateJobs = [
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
    "EDITOR",
  ].includes(userRole);
  const canSeeTechnicians = [
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
    "EDITOR",
  ].includes(userRole);

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
  const technicians: any[] = [];

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
