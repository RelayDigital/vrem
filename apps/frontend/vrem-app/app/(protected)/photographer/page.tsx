"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { PhotographerDashboardView } from "@/components/features/photographer/views/DashboardView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { Photographer, ProjectStatus } from "@/types";
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented (visual placeholder only)
import { photographers as initialPhotographers } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/utils";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { DashboardLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";

export default function PhotographerDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
    "TECHNICIAN",
    "photographer",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [photographers] = useState(USE_MOCK_DATA ? initialPhotographers : []);

  // Filter jobs to only show those assigned to the current photographer
  const assignedJobs = useMemo(() => {
    if (!user) return [];
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedPhotographerId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user]);

  // Calculate stats from assigned jobs
  const stats = useMemo(() => {
    const upcomingJobs = assignedJobs.filter(
      (job) => job.status === "assigned" || job.status === "pending"
    );
    const completedJobs = assignedJobs.filter(
      (job) => job.status === "delivered"
    );

    // Find current photographer for rating/on-time rate
    const currentPhotographer = photographers.find((p) => p.id === user?.id);
    const rating = currentPhotographer?.rating?.overall || 0;
    const onTimeRate = currentPhotographer?.reliability?.onTimeRate || 0;

    return {
      upcoming: upcomingJobs.length,
      completed: completedJobs.length,
      rating,
      onTimeRate: (onTimeRate * 100).toFixed(0),
    };
  }, [assignedJobs, photographers, user]);

  // Listen for navigation events to open job task view
  useEffect(() => {
    const handleOpenJobTaskView = (event: CustomEvent<{ id: string }>) => {
      const job = jobManagement.getJobById(event.detail.id);
      if (job) {
        jobManagement.selectJob(job);
        jobManagement.openTaskView(job);
      }
    };

    window.addEventListener(
      "openJobTaskView",
      handleOpenJobTaskView as EventListener
    );
    return () => {
      window.removeEventListener(
        "openJobTaskView",
        handleOpenJobTaskView as EventListener
      );
    };
  }, [jobManagement]);

  // Fetch messages when selected job changes
  useEffect(() => {
    if (jobManagement.selectedJob) {
      messaging.fetchMessages(jobManagement.selectedJob.id);
    }
  }, [jobManagement.selectedJob, messaging]);

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  // Use context handlers
  const handleJobClick = jobManagement.openTaskView;
  const handleJobSelect = jobManagement.toggleJobSelection;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/photographer/jobs/${jobManagement.selectedJob.id}`);
    }
  };
  const handleTaskViewClose = jobManagement.handleTaskViewClose;

  // Navigation handlers
  const handleNavigateToJobsView = () => {
    router.push("/photographer/jobs/all");
  };
  const handleNavigateToMapView = () => {
    router.push("/photographer/map");
  };
  const handleNavigateToCalendarView = () => {
    router.push("/photographer/calendar");
  };
  const handleNavigateToJobInProjectManagement = (job: any) => {
    jobManagement.selectJob(job);
    router.push(`/photographer/jobs/${job.id}`);
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <PhotographerDashboardView
        jobs={assignedJobs}
        photographers={photographers}
        selectedJob={jobManagement.selectedJob}
        stats={stats}
        onSelectJob={handleJobSelect}
        onNavigateToJobsView={handleNavigateToJobsView}
        onNavigateToMapView={handleNavigateToMapView}
        onNavigateToCalendarView={handleNavigateToCalendarView}
        onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
        onJobClick={handleJobClick}
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
            const statusMap: Record<string, ProjectStatus> = {
              pending: ProjectStatus.BOOKED,
              assigned: ProjectStatus.SHOOTING,
              in_progress: ProjectStatus.SHOOTING,
              editing: ProjectStatus.EDITING,
              delivered: ProjectStatus.DELIVERED,
              cancelled: ProjectStatus.BOOKED,
            };
            jobManagement.changeJobStatus(
              jobManagement.selectedJob.id,
              statusMap[status] || ProjectStatus.BOOKED
            );
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
            const statusMap: Record<string, ProjectStatus> = {
              pending: ProjectStatus.BOOKED,
              assigned: ProjectStatus.SHOOTING,
              in_progress: ProjectStatus.SHOOTING,
              editing: ProjectStatus.EDITING,
              delivered: ProjectStatus.DELIVERED,
              cancelled: ProjectStatus.BOOKED,
            };
            jobManagement.changeJobStatus(
              jobManagement.selectedJob.id,
              statusMap[status] || ProjectStatus.BOOKED
            );
          }
        }}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="dialog"
      />
    </div>
  );
}
