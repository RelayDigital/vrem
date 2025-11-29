"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { ProjectStatus } from "@/types";
import { api } from "@/lib/api";
import { JobsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { H2, P } from "@/components/ui/typography";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [loadingJob, setLoadingJob] = useState(true);

  const jobId = params?.id as string;

  // Load job by ID
  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return;

      try {
        // First try to get from context
        const jobFromContext = jobManagement.getJobById(jobId);
        if (jobFromContext) {
          jobManagement.selectJob(jobFromContext);
          setLoadingJob(false);
          return;
        }

        // If not in context, fetch from API
        const project = await api.projects.getById(jobId);
        const jobCard = api.mapProjectToJobCard(project);
        jobManagement.selectJob(jobCard);
        setLoadingJob(false);
      } catch (error) {
        console.error("Failed to load job:", error);
        setLoadingJob(false);
      }
    };

    loadJob();
  }, [jobId, jobManagement]);

  // Fetch messages when job is loaded
  useEffect(() => {
    if (jobManagement.selectedJob && jobManagement.selectedJob.id === jobId) {
      messaging.fetchMessages(jobId);
    }
  }, [jobManagement.selectedJob, jobId, messaging]);

  if (isLoading || loadingJob) {
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const selectedJob = jobManagement.selectedJob;

  if (!selectedJob || selectedJob.id !== jobId) {
    return (
      <div className="size-full overflow-x-hidden p-6">
        <H2 className="text-2xl font-bold mb-4">Job Not Found</H2>
        <P className="text-muted-foreground">
          The requested job could not be found.
        </P>
      </div>
    );
  }

  // Check if user has access to this job
  const userRole = user.role;
  const hasAccess =
    ["dispatcher", "ADMIN", "PROJECT_MANAGER", "EDITOR"].includes(userRole) ||
    selectedJob.assignedPhotographerId === user.id ||
    selectedJob.assignedTechnicianId === user.id ||
    selectedJob.createdBy === user.id;

  if (!hasAccess) {
    return (
      <div className="size-full overflow-x-hidden p-6">
        <H2 className="text-2xl font-bold mb-4">Access Denied</H2>
        <P className="text-muted-foreground">
          You do not have access to view this job.
        </P>
      </div>
    );
  }

  const handleStatusChange = (status: string) => {
    const statusMap: Record<string, ProjectStatus> = {
      pending: ProjectStatus.BOOKED,
      assigned: ProjectStatus.SHOOTING,
      in_progress: ProjectStatus.SHOOTING,
      editing: ProjectStatus.EDITING,
      delivered: ProjectStatus.DELIVERED,
      cancelled: ProjectStatus.BOOKED,
    };
    jobManagement.changeJobStatus(
      selectedJob.id,
      statusMap[status] || ProjectStatus.BOOKED
    );
  };

  // Empty photographers array - backend will provide when endpoint is ready
  const photographers: any[] = [];

  return (
    <div className="size-full overflow-x-hidden">
      {/* Job Task View - Full Page (Page variant) */}
      <JobTaskView
        job={selectedJob}
        photographer={
          selectedJob?.assignedPhotographerId
            ? photographers.find(
                (p) => p.id === selectedJob?.assignedPhotographerId
              )
            : undefined
        }
        messages={messaging.getMessagesForJob(selectedJob.id)}
        currentUserId={user?.id || "current-user-id"}
        currentUserName={user?.name || "Current User"}
        isClient={false}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            router.push("/jobs/all-jobs");
          }
        }}
        onSendMessage={(content, chatType, threadId) =>
          messaging.sendMessage(selectedJob.id, content, chatType, threadId)
        }
        onEditMessage={(messageId, content) =>
          messaging.editMessage(messageId, content)
        }
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={handleStatusChange}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="page"
      />
    </div>
  );
}
