"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { CompanyDashboardView } from "@/components/features/company/views/DashboardView";
import { ProviderDashboardView } from "@/components/features/provider/views/DashboardView";
import { AgentJobsView } from "@/components/features/agent/AgentJobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import {
  JobRequest,
  Metrics,
  ProjectStatus,
  ProviderProfile,
  Technician,
} from "@/types";
import { DashboardLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { useJobCreation } from "@/context/JobCreationContext";
import { useDispatcherNavigation } from "@/context/DispatcherNavigationContext";
import { JobDataBoundary } from "@/components/shared/jobs";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { getEffectiveOrgRole, isDispatcherRole } from "@/lib/roles";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const jobCreation = useJobCreation();
  const messaging = useMessaging();
  const jobManagement = useJobManagement();
  const navigation = useDispatcherNavigation();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const technicians = useMemo(
    () => providers.filter((p) => p.role === "TECHNICIAN"),
    [providers]
  );
  const providerProfile = useMemo(() => {
    if (!user) return null;
    return providers.find((provider) => provider.userId === user.id) || null;
  }, [providers, user]);
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const roleUpper = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const canViewCustomerChat = ["OWNER", "ADMIN", "DISPATCHER"].includes(roleUpper);
  const assignedJobs = useMemo(() => {
    if (!user) return [];
    return jobManagement.jobs.filter(
      (job) =>
        job.assignedTechnicianId === user.id ||
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
      rating: providerProfile?.rating.overall ?? 0,
      onTimeRate: (
        (providerProfile?.reliability.onTimeRate || 0) * 100
      ).toFixed(0),
    };
  }, [assignedJobs, providerProfile]);

  const effectiveRole = getEffectiveOrgRole(user, memberships, organizationId);
  const shouldFetchMetrics = isDispatcherRole(effectiveRole);

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
      const orgId = (jobManagement.selectedJob as any)?.organizationId;
      messaging.fetchMessages(jobManagement.selectedJob.id, "TEAM", orgId);
      if (canViewCustomerChat) {
        messaging.fetchMessages(jobManagement.selectedJob.id, "CUSTOMER", orgId);
      }
    }
  }, [jobManagement.selectedJob, messaging, canViewCustomerChat]);

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      if (!user) {
        setProviders([]);
        setLoadingProviders(false);
        return;
      }

      setLoadingProviders(true);
      try {
        const fetchedProviders = await fetchOrganizationTechnicians();
        const activeMembership = memberships.find(
          (m) => m.orgId === organizationId
        );
        const isPersonalOrg =
          activeMembership?.organization?.type === "PERSONAL" ||
          (activeMembership as any)?.organizationType === "PERSONAL";

        // If viewing a personal organization, show the current provider using personal org details
        if (isPersonalOrg && user && activeMembership?.organization) {
          const personalOrg: any = activeMembership.organization;
          const selfProvider: ProviderProfile = {
            id: user.id,
            userId: user.id,
            orgMemberId: activeMembership.id,
            orgId: activeMembership.orgId,
            role: (activeMembership.role || "TECHNICIAN") as any,
            name: user.name || "Provider",
            email: user.email || "",
            phone: personalOrg.phone || "",
            organizationId: activeMembership.orgId,
            isIndependent: true,
            companyId: undefined,
            companyName: undefined,
            homeLocation: {
              lat: personalOrg?.serviceArea?.lat || 51.0447,
              lng: personalOrg?.serviceArea?.lng || -114.0719,
              address: {
                street: personalOrg.addressLine1 || "",
                city: personalOrg.city || "",
                stateProvince: personalOrg.region || "",
                country: personalOrg.countryCode || "",
                postalCode: personalOrg.postalCode || "",
              },
            },
            availability: [],
            reliability: {
              totalJobs: 0,
              noShows: 0,
              lateDeliveries: 0,
              onTimeRate: 0,
              averageDeliveryTime: 0,
            },
            skills: {
              residential: 0,
              commercial: 0,
              aerial: 0,
              twilight: 0,
              video: 0,
            },
            rating: {
              overall: 0,
              count: 0,
              recent: [],
            },
            preferredClients: [],
            status: "active",
            createdAt: new Date(),
            avatar: user.avatarUrl,
            bio: "",
            services: {
              photography: true,
              video: false,
              aerial: false,
              floorplan: false,
              measurement: false,
              twilight: false,
              editing: false,
              virtualStaging: false,
            },
            portfolio: [],
            certifications: [],
          };
          if (!cancelled) {
            setProviders([selfProvider]);
          }
          return;
        }

        if (!cancelled) {
          setProviders(fetchedProviders);
        }
      } catch (error) {
        console.error("Failed to load providers for dashboard:", error);
        if (!cancelled) {
          setProviders([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProviders(false);
        }
      }
    };

    loadProviders();

    return () => {
      cancelled = true;
    };
  }, [user, memberships, organizationId]);

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  if (loadingProviders && providers.length === 0) {
    return <DashboardLoadingSkeleton />;
  }

  // Role-based rendering
  const userRole = effectiveRole;

  // Dispatcher/Admin/Project Manager/Editor: Use CompanyDashboardView
  if (isDispatcherRole(userRole)) {
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
            <CompanyDashboardView
              jobs={jobManagement.jobs}
              technicians={technicians}
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
          onStatusChange={() => {}}
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
          onStatusChange={() => {}}
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="dialog"
        />
      </div>
    );
  }

  // Technician/Technician: Use ProviderDashboardView
  if (userRole === "TECHNICIAN") {
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

    return (
      <div className="size-full overflow-x-hidden space-y-6">
        {/* Provider Dashboard View */}
        <JobDataBoundary fallback={<DashboardLoadingSkeleton />}>
          <ProviderDashboardView
            jobs={assignedJobs}
            technicians={technicians}
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
            currentUserId={user?.id}
          />
        </JobDataBoundary>

        {/* Job Task View - Sheet */}
        <JobTaskView
          job={jobManagement.selectedJob}
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
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="dialog"
        />
      </div>
    );
  }

  // Agent: Use AgentJobsView (their dashboard is essentially the jobs list)
  if (userRole === "AGENT") {
    const technicianList = technicians;

    return (
      <div className="size-full overflow-x-hidden">
        <AgentJobsView
          jobs={jobManagement.jobCards}
          technicians={technicianList}
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
