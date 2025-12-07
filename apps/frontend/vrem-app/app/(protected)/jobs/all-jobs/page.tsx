"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobsView } from "@/components/features/company/views/JobsView";
import { AgentJobsView } from "@/components/features/agent/AgentJobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { ProjectStatus } from "@/types";
import { JobsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
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
import { JobDataBoundary, JobsGridSkeleton } from "@/components/shared/jobs";
import { Technician } from "@/types";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { getEffectiveOrgRole, isCompanyRole } from "@/lib/roles";

export default function JobsPage() {
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
  const isAgent =
    (user?.accountType || "").toUpperCase() === "AGENT";
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [, setLoadingTechnicians] = useState(false);
  const assignedJobs = useMemo(() => {
    if (!user) return [];
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedTechnicianId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user]);

  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const roleUpper = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const canViewCustomerChat = ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(roleUpper);

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

  useEffect(() => {
    let cancelled = false;
    const loadTechnicians = async () => {
      if (!user) return;
      setLoadingTechnicians(true);
      try {
        const techs = await fetchOrganizationTechnicians();
        if (!cancelled) {
          setTechnicians(techs);
        }
      } catch (error) {
        console.error("Failed to load technicians for jobs list:", error);
        if (!cancelled) {
          setTechnicians([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTechnicians(false);
        }
      }
    };

    loadTechnicians();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isLoading) {
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const userRole = getEffectiveOrgRole(user, memberships, organizationId);

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

  // Company/Admin/Project Manager/Editor: Use JobsView
  if (isCompanyRole(userRole)) {
    const technicianList = technicians;

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
            technicians={technicianList}
            messages={messaging.messages}
            onViewRankings={handleViewRankings}
            onChangeTechnician={handleViewRankings}
            onJobStatusChange={handleJobStatusChangeWrapper}
            onJobClick={handleJobClick}
            activeView="all"
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
              );
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
          currentUserAccountType={user?.accountType}
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
              );
            }
          }}
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="dialog"
        />
      </div>
    );
  }

  // Technician/Technician: Filter to assigned jobs only
  if (userRole === "TECHNICIAN") {
    const technicianList = technicians;

    return (
      <div className="size-full overflow-x-hidden space-y-6">
        <JobDataBoundary fallback={<JobsGridSkeleton />}>
          <JobsView
            jobs={assignedJobs}
            technicians={technicianList}
            messages={messaging.messages}
            onViewRankings={() => {}}
            onChangeTechnician={undefined}
            onJobStatusChange={handleJobStatusChangeWrapper}
            onJobClick={handleJobClick}
            activeView="all"
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
              );
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
              handleJobStatusChangeWrapper(
                jobManagement.selectedJob.id,
                status
              );
            }
          }}
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="dialog"
        />
      </div>
    );
  }

  // Agent: Use AgentJobsView
  if (userRole === "AGENT") {
    const technicianList = technicians;

    return (
      <div className="size-full overflow-x-hidden">
        <JobDataBoundary fallback={<JobsGridSkeleton />}>
          <AgentJobsView
            jobs={jobManagement.jobCards}
            technicians={technicianList}
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
