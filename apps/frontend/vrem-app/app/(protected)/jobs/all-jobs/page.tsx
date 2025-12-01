"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobsView } from "@/components/features/dispatcher/views/JobsView";
import { AgentJobsView } from "@/components/features/agent/AgentJobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { ProjectStatus } from "@/types";
import { JobsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared/layout";
import { JobDataBoundary, JobsGridSkeleton } from "@/components/shared/jobs";

export default function JobsPage() {
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
  const assignedJobs = useMemo(() => {
    if (!user) return [];
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedPhotographerId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user]);

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
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = user.role;

  // Use context handlers
  const handleViewRankings = jobManagement.openRankings;
  const handleJobAssign = jobManagement.assignJob;
  const handleJobClick = jobManagement.openTaskView;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/jobs/${jobManagement.selectedJob.id}`);
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

  // Dispatcher/Admin/Project Manager/Editor: Use JobsView
  if (["dispatcher", "ADMIN", "PROJECT_MANAGER", "EDITOR"].includes(userRole)) {
    // Empty photographers array - backend will provide when endpoint is ready
    const photographers: any[] = [];

    return (
      <div className="size-full overflow-x-hidden">
        {/* Breadcrumb */}
        <div className="container relative mx-auto px-md pt-md">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/jobs">Jobs</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>All Jobs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <JobDataBoundary fallback={<JobsGridSkeleton />}>
          <JobsView
            jobs={jobManagement.jobs}
            photographers={photographers}
            messages={messaging.messages}
            onViewRankings={handleViewRankings}
            onChangePhotographer={handleViewRankings}
            onJobStatusChange={handleJobStatusChangeWrapper}
            onJobClick={handleJobClick}
            activeView="all"
          />
        </JobDataBoundary>

        {/* Job Task View - Sheet */}
        <JobTaskView
          job={jobManagement.selectedJob}
          photographer={undefined}
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
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
          photographer={undefined}
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
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

  // Technician/Photographer: Filter to assigned jobs only
  if (["TECHNICIAN"].includes(userRole)) {
    // Empty photographers array - backend will provide when endpoint is ready
    const photographers: any[] = [];

    return (
      <div className="size-full overflow-x-hidden space-y-6">
        <JobDataBoundary fallback={<JobsGridSkeleton />}>
          <JobsView
            jobs={assignedJobs}
            photographers={photographers}
            messages={messaging.messages}
            onViewRankings={() => {}}
            onChangePhotographer={undefined}
            onJobStatusChange={handleJobStatusChangeWrapper}
            onJobClick={handleJobClick}
            activeView="all"
          />
        </JobDataBoundary>

        {/* Job Task View - Sheet */}
        <JobTaskView
          job={jobManagement.selectedJob}
          photographer={undefined}
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
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
          photographer={undefined}
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
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

  // Agent: Use AgentJobsView
  if (userRole === "AGENT") {
    const technicians: any[] = []; // TODO: Get from backend when endpoint is ready

    return (
      <div className="size-full overflow-x-hidden">
        <JobDataBoundary fallback={<JobsGridSkeleton />}>
          <AgentJobsView
            jobs={jobManagement.jobCards}
            technicians={technicians}
            organizationId={user.organizationId || ""}
            onNewJobClick={() => router.push("/booking")}
          />
        </JobDataBoundary>
      </div>
    );
  }

  // Fallback
  return (
    <div className="size-full overflow-x-hidden p-6">

    </div>
  );
}
