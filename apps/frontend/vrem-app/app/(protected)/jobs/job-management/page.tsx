"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobsView } from "@/components/features/company/views/JobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { JobRequest, ProjectStatus } from "@/types";
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
import { canChangeStatus } from "@/lib/permissions";
import { EffectiveOrgRole } from "@/lib/permissions";

export default function JobManagementPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "COMPANY",
    "PROJECT_MANAGER",
    "EDITOR",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const fetchedJobsRef = useRef<Set<string>>(new Set());
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const roleUpper = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const isAgent = (user?.accountType || "").toUpperCase() === "AGENT";
  // Agents can always view customer chat (they ARE the customer)
  const canViewCustomerChat = isAgent || ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(roleUpper);
  
  // Get effective role for permission checks
  const effectiveRole: EffectiveOrgRole = (roleUpper || 'NONE') as EffectiveOrgRole;
  
  // Permission check function for kanban drag-and-drop
  // EDITOR cannot change global status at all
  // PROJECT_MANAGER can only change status on projects they manage
  const canChangeJobStatus = useCallback((job: JobRequest): boolean => {
    // Need projectManagerId for the permission check
    const projectForPermission = {
      projectManagerId: job.projectManagerId ?? null,
    };
    return canChangeStatus(effectiveRole, projectForPermission, user?.id ?? null);
  }, [effectiveRole, user?.id]);

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
  // Agents only see CUSTOMER channel (they are the customer)
  // Other roles can see both TEAM and CUSTOMER channels
  useEffect(() => {
    if (jobManagement.selectedJob) {
      const jobId = jobManagement.selectedJob.id;
      // Prevent infinite loop by tracking fetched jobs
      if (fetchedJobsRef.current.has(jobId)) return;
      fetchedJobsRef.current.add(jobId);

      const orgId = (jobManagement.selectedJob as any)?.organizationId;
      // Agents should only fetch CUSTOMER channel, not TEAM
      if (!isAgent) {
        messaging.fetchMessages(jobId, "TEAM", orgId);
      }
      if (canViewCustomerChat) {
        messaging.fetchMessages(jobId, "CUSTOMER", orgId);
      }
    }
  }, [jobManagement.selectedJob?.id, canViewCustomerChat, isAgent]);

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
          canChangeJobStatus={canChangeJobStatus}
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
        currentUserAccountType={user?.accountType}
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
