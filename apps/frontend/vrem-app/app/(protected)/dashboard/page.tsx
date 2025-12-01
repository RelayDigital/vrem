"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { DispatcherDashboardView } from "@/components/features/dispatcher/views/DashboardView";
import { PhotographerDashboardView } from "@/components/features/photographer/views/DashboardView";
import { AgentJobsView } from "@/components/features/agent/AgentJobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import { JobRequest, Metrics, ProjectStatus } from "@/types";
import { DashboardLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { useJobCreation } from "@/context/JobCreationContext";
import { useDispatcherNavigation } from "@/context/DispatcherNavigationContext";
import { JobDataBoundary } from "@/components/shared/jobs";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const jobCreation = useJobCreation();
  const messaging = useMessaging();
  const jobManagement = useJobManagement();
  const navigation = useDispatcherNavigation();
  const assignedJobs = useMemo(() => {
    if (!user) return [];
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedPhotographerId === user.id ||
        job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user]);
  const assignedJobStats = useMemo(() => {
    const upcomingJobs = assignedJobs.filter(
      (job) => job.status === "assigned" || job.status === "pending"
    );
    const completedJobs = assignedJobs.filter(
      (job) => job.status === "delivered"
    );

    return {
      upcoming: upcomingJobs.length,
      completed: completedJobs.length,
      rating: 0, // TODO: Get from backend when available
      onTimeRate: "0",
    };
  }, [assignedJobs]);

  const shouldFetchMetrics = user
    ? ["dispatcher", "ADMIN", "PROJECT_MANAGER", "EDITOR"].includes(user.role)
    : false;

  const {
    metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useDashboardMetrics(!!user && shouldFetchMetrics);

  const emptyMetrics: Metrics = {
    organizationId: "",
    period: "week",
    jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
    photographers: { active: 0, available: 0, utilization: 0 },
    technicians: { active: 0, available: 0, utilization: 0 },
    performance: {
      averageAssignmentTime: 0,
      averageDeliveryTime: 0,
      onTimeRate: 0,
      clientSatisfaction: 0,
    },
    revenue: { total: 0, perJob: 0 },
  };

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

  // Role-based rendering
  const userRole = user.role;

  // Dispatcher/Admin/Project Manager/Editor: Use DispatcherDashboardView
  if (["dispatcher", "ADMIN", "PROJECT_MANAGER", "EDITOR"].includes(userRole)) {
    const displayMetrics = metrics ?? emptyMetrics;
    const handleViewRankings = jobManagement.openRankings;
    const handleJobAssign = jobManagement.assignJob;
    const handleJobSelect = jobManagement.toggleJobSelection;
    const handleJobClick = jobManagement.openTaskView;
    const handleFullScreen = jobManagement.openTaskDialog;
    const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
    const handleOpenInNewPage = () => {
      if (jobManagement.selectedJob) {
        router.push(`/jobs/${jobManagement.selectedJob.id}`);
      }
    };
    const handleTaskViewClose = jobManagement.handleTaskViewClose;
    const handleNavigateToJobsView = navigation.navigateToJobsView;
    const handleNavigateToMapView = navigation.navigateToMapView;
    const handleNavigateToCalendarView = navigation.navigateToCalendarView;
    const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
      jobManagement.selectJob(job);
      navigation.navigateToJobInProjectManagement(job);
    };

    // Empty photographers array - backend will provide when endpoint is ready
    const photographers: any[] = [];

    return (
      <div className="size-full overflow-x-hidden space-y-6">
        {metricsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load metrics</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{metricsError.message}</span>
              <Button variant="secondary" size="sm" onClick={refetchMetrics}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <JobDataBoundary fallback={<DashboardLoadingSkeleton />}>
          {metricsLoading && !metrics ? (
            <DashboardLoadingSkeleton />
          ) : (
            <DispatcherDashboardView
              jobs={jobManagement.jobs}
              photographers={photographers}
              metrics={displayMetrics}
              selectedJob={jobManagement.selectedJob}
              onViewRankings={handleViewRankings}
              onSelectJob={handleJobSelect}
              onNavigateToJobsView={handleNavigateToJobsView}
              onNavigateToMapView={handleNavigateToMapView}
              onNavigateToCalendarView={handleNavigateToCalendarView}
              onNavigateToJobInProjectManagement={
                handleNavigateToJobInProjectManagement
              }
              onJobAssign={handleJobAssign}
              onJobClick={handleJobClick}
            />
          )}
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
          onStatusChange={() => {}}
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
          onStatusChange={() => {}}
          onAssignPhotographer={jobManagement.handleAssignPhotographer}
          onChangePhotographer={jobManagement.handleChangePhotographer}
          variant="dialog"
        />
      </div>
    );
  }

  // Technician/Photographer: Use PhotographerDashboardView
  if (["TECHNICIAN"].includes(userRole)) {
    const handleJobClick = jobManagement.openTaskView;
    const handleJobSelect = jobManagement.toggleJobSelection;
    const handleFullScreen = jobManagement.openTaskDialog;
    const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
    const handleOpenInNewPage = () => {
      if (jobManagement.selectedJob) {
        router.push(`/jobs/${jobManagement.selectedJob.id}`);
      }
    };
    const handleTaskViewClose = jobManagement.handleTaskViewClose;

    // Navigation handlers
    const handleNavigateToJobsView = () => {
      router.push("/jobs/all-jobs");
    };
    const handleNavigateToMapView = () => {
      router.push("/map");
    };
    const handleNavigateToCalendarView = () => {
      router.push("/calendar");
    };
    const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
      jobManagement.selectJob(job);
      router.push(`/jobs/${job.id}`);
    };

    // Empty photographers array - backend will provide when endpoint is ready
    const photographers: any[] = [];

    return (
      <div className="size-full overflow-x-hidden space-y-6">
        <div className="container relative mx-auto px-md pb-md">
          <JobDataBoundary fallback={<DashboardLoadingSkeleton />}>
            <PhotographerDashboardView
              jobs={assignedJobs}
              photographers={photographers}
              selectedJob={jobManagement.selectedJob}
              stats={assignedJobStats}
              onSelectJob={handleJobSelect}
              onNavigateToJobsView={handleNavigateToJobsView}
              onNavigateToMapView={handleNavigateToMapView}
              onNavigateToCalendarView={handleNavigateToCalendarView}
              onNavigateToJobInProjectManagement={
                handleNavigateToJobInProjectManagement
              }
              onJobClick={handleJobClick}
            />
          </JobDataBoundary>
        </div>

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

  // Agent: Use AgentJobsView (their dashboard is essentially the jobs list)
  if (userRole === "AGENT") {
    const technicians: any[] = []; // TODO: Get from backend when endpoint is ready

    return (
      <div className="size-full overflow-x-hidden">
        <AgentJobsView
          jobs={jobManagement.jobCards}
          technicians={technicians}
          organizationId={user.organizationId || ""}
          onNewJobClick={() => router.push("/booking")}
        />
      </div>
    );
  }

  // Fallback: Show minimal dashboard for unknown roles
  return (
    <div className="size-full overflow-x-hidden p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Dashboard view for your role is coming soon.
      </p>
    </div>
  );
}
