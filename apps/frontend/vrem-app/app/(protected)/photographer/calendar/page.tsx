"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { CalendarView } from "@/components/features/calendar/CalendarView";
import { Photographer, ProjectStatus } from "@/types";
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented (visual placeholder only)
import { photographers as initialPhotographers } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/utils";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import {
  CalendarLoadingSkeleton,
  JobsLoadingSkeleton,
} from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";

export default function PhotographerCalendarPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
    "TECHNICIAN",
    "photographer",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [photographers] = useState<Photographer[]>(USE_MOCK_DATA ? initialPhotographers : []);

  // Filter jobs to only show those assigned to the current photographer
  const assignedJobs = useMemo(() => {
    if (!user) return [];
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedPhotographerId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user]);

  // Fetch messages when selected job changes
  useEffect(() => {
    if (jobManagement.selectedJob) {
      messaging.fetchMessages(jobManagement.selectedJob.id);
    }
  }, [jobManagement.selectedJob, messaging]);

  if (isLoading) {
    return <CalendarLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  // Use context handlers
  const handleJobClick = jobManagement.openTaskView;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/photographer/jobs/${jobManagement.selectedJob.id}`);
    }
  };
  const handleTaskViewClose = jobManagement.handleTaskViewClose;

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

  return (
    <div className="w-full overflow-x-hidden h-full">
      <CalendarView
        jobs={assignedJobs}
        // Photographer accounts are single-technician, so we don't show technicians list in the sidebar
        photographers={[]}
        onJobClick={handleJobClick}
        // Photographers cannot create jobs directly from the calendar
        onCreateJob={undefined}
      />

      {/* Job Task View - Sheet */}
      <JobTaskView
        job={jobManagement.selectedJob}
        photographer={
          jobManagement.selectedJob?.assignedPhotographerId
            ? photographers.find(
                (p) => p.id === jobManagement.selectedJob?.assignedPhotographerId
              )
            : undefined
        }
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
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="sheet"
        onFullScreen={handleFullScreen}
        onOpenInNewPage={handleOpenInNewPage}
      />

      {/* Job Task View - Dialog (Full Screen) */}
      <JobTaskView
        job={jobManagement.selectedJob}
        photographer={
          jobManagement.selectedJob?.assignedPhotographerId
            ? photographers.find(
                (p) => p.id === jobManagement.selectedJob?.assignedPhotographerId
              )
            : undefined
        }
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
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="dialog"
      />
    </div>
  );
}


