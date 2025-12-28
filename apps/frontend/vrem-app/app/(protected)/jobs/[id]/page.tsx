"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { ProjectStatus, Technician } from "@/types";
import { api } from "@/lib/api";
import { JobsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { H2, P } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { getEffectiveOrgRole } from "@/lib/roles";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
    "COMPANY",
  ]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [loadingJob, setLoadingJob] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const roleUpper = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const [, setLoadingTechnicians] = useState(false);
  const fetchedRef = useRef(false);

  const jobId = params?.id as string;

  // Read query params for initial tab state (from notifications)
  const initialTab = searchParams?.get("tab") || undefined;
  const initialChatTab = searchParams?.get("chat") as "client" | "team" | undefined;
  const userRole = getEffectiveOrgRole(user, memberships, organizationId);
  const isAgent =
    (user?.accountType || "").toUpperCase() === "AGENT" ||
    userRole === "AGENT";
  // Agents can always view customer chat (they ARE the customer)
  const canViewCustomerChat = isAgent || ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(roleUpper);

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
  // Agents only see CUSTOMER channel (they are the customer)
  // Other roles can see both TEAM and CUSTOMER channels
  useEffect(() => {
    if (
      jobManagement.selectedJob &&
      jobManagement.selectedJob.id === jobId
    ) {
      // Prevent infinite loop by only fetching once per job
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      const orgId = (jobManagement.selectedJob as any)?.organizationId;
      // Agents should only fetch CUSTOMER channel, not TEAM
      if (!isAgent) {
        messaging.fetchMessages(jobId, "TEAM", orgId);
      }
      if (canViewCustomerChat) {
        messaging.fetchMessages(jobId, "CUSTOMER", orgId);
      }
    }
  }, [jobManagement.selectedJob?.id, jobId, canViewCustomerChat, isAgent]);

  useEffect(() => {
    let cancelled = false;
    const loadTechnicians = async () => {
      // Agents don't need to load technicians - they're customers, not managers
      if (!user || isAgent) return;
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
  }, [user, isAgent]);

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
    ? technicians.find((tech) => tech.id === selectedJob.assignedTechnicianId)
    : undefined;
  const technician = assignedTechnician
    ? ({
        id: assignedTechnician.id,
        name: assignedTechnician.name,
        email: assignedTechnician.email,
        role: "TECHNICIAN" as const,
        accountType: "PROVIDER" as const,
        organizationId: assignedTechnician.organizationId,
        avatarUrl: assignedTechnician.avatar,
      } as any)
    : undefined;

  const hasAccess =
    isAgent ||
    userRole === "COMPANY" ||
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
    <div className="size-full overflow-x-hidden space-y-4">
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
          technician={technician as any}
          messages={messaging.getMessagesForJob(selectedJob.id)}
          currentUserId={user?.id || "current-user-id"}
          currentUserName={user?.name || "Current User"}
          currentUserAccountType={user?.accountType}
          isClient={false}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              router.push("/jobs/all-jobs");
            }
          }}
          onSendMessage={(content, channel, threadId) =>
            messaging.sendMessage(selectedJob.id, content, channel, threadId)
          }
          onEditMessage={(messageId, content) =>
            messaging.editMessage(messageId, content)
          }
          onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
          onStatusChange={(status) =>
            handleStatusChange(status, selectedJob.id)
          }
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="page"
          initialTab={initialTab}
          initialChatTab={initialChatTab}
        />
      )}
    </div>
  );
}
