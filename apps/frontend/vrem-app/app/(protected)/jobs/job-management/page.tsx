"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobsView } from "@/components/features/company/views/JobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { ProjectStatus } from "@/types";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { JobsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
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

export default function JobManagementPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
    "EDITOR",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const roleUpper = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const canViewCustomerChat = ["OWNER", "ADMIN", "DISPATCHER"].includes(roleUpper);

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
      const orgId = (jobManagement.selectedJob as any)?.organizationId;
      messaging.fetchMessages(jobManagement.selectedJob.id, "TEAM", orgId);
      if (canViewCustomerChat) {
        messaging.fetchMessages(jobManagement.selectedJob.id, "CUSTOMER", orgId);
      }
    }
  }, [jobManagement.selectedJob, messaging, canViewCustomerChat]);

  if (isLoading) {
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  // Use context handlers
  const handleViewRankings = jobManagement.openRankings;
  const handleJobAssign = jobManagement.assignJob;
  const handleJobClick = jobManagement.openTaskView;
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

  // Empty technicians array - backend will provide when endpoint is ready
  const technicians: any[] = [];

  return (
    <div className="size-full overflow-x-hidden flex flex-col h-[calc(100vh-var(--header-h))]">
      {/* Breadcrumb */}
      <div className="container relative mx-auto px-md pt-md shrink-0 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/jobs">Jobs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Job Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Jobs View with Kanban */}

      <JobDataBoundary fallback={<JobsGridSkeleton />}>
        <JobsView
          jobs={jobManagement.jobs}
          technicians={technicians}
          messages={messaging.messages}
          onViewRankings={handleViewRankings}
          onChangeTechnician={handleViewRankings}
          onJobStatusChange={handleJobStatusChangeWrapper}
          onJobClick={handleJobClick}
          activeView="kanban"
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
      />
    </div>
  );
}
