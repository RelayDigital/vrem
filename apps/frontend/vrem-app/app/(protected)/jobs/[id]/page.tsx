"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { ProjectStatus, Technician } from "@/types";
import { api } from "@/lib/api";
import { JobsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { H2, P } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrganizationTechnicians } from "@/lib/technicians";

export default function JobDetailPage() {
  const params = useParams();
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
  const [loadingJob, setLoadingJob] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [, setLoadingTechnicians] = useState(false);

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
      messaging.fetchMessages(
        jobId,
        (jobManagement.selectedJob as any)?.organizationId
      );
    }
  }, [jobManagement.selectedJob, jobId, messaging]);

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
        console.error("Failed to load technicians for job detail:", error);
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

  const selectedJob = jobManagement.selectedJob;
  const hasSelectedJob = selectedJob && selectedJob.id === jobId;
  const isJobLoading = loadingJob;
  const assignedTechnician = selectedJob?.assignedTechnicianId
    ? technicians.find(
        (tech) => tech.id === selectedJob.assignedTechnicianId
      )
    : undefined;
  const photographer = assignedTechnician
    ? {
        id: assignedTechnician.id,
        name: assignedTechnician.name,
        email: assignedTechnician.email,
        role: "TECHNICIAN" as const,
        organizationId: assignedTechnician.organizationId,
        avatarUrl: assignedTechnician.avatar,
      }
    : undefined;

  const userRole = user.role;
  const hasAccess =
    ["dispatcher", "DISPATCHER", "PROJECT_MANAGER", "EDITOR"].includes(userRole) ||
    selectedJob?.assignedTechnicianId === user.id ||
    selectedJob?.assignedTechnicianId === user.id ||
    selectedJob?.createdBy === user.id;

  const handleStatusChange = (status: string, jobId: string) => {
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
    <div className="size-full overflow-x-hidden p-6 space-y-4">
      {isJobLoading && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="rounded-lg border p-4 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      )}

      {!isJobLoading && !hasSelectedJob && (
        <div className="p-6 border rounded-lg">
          <H2 className="text-2xl font-bold mb-4">Job Not Found</H2>
          <P className="text-muted-foreground">
            The requested job could not be found.
          </P>
        </div>
      )}

      {!isJobLoading && hasSelectedJob && !hasAccess && (
        <div className="p-6 border rounded-lg">
          <H2 className="text-2xl font-bold mb-4">Access Denied</H2>
          <P className="text-muted-foreground">
            You do not have access to view this job.
          </P>
        </div>
      )}

      {!isJobLoading && hasSelectedJob && hasAccess && selectedJob && (
        <JobTaskView
          job={selectedJob}
          photographer={photographer}
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
          onStatusChange={(status) => handleStatusChange(status, selectedJob.id)}
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="page"
        />
      )}
    </div>
  );
}
