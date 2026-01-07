"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { CompanyDashboardView } from "@/components/features/company/views/DashboardView";
import { ProviderDashboardView } from "@/components/features/provider/views/DashboardView";
import { AgentJobsView } from "@/components/features/agent/AgentJobsView";
import { JobTaskView } from "@/components/shared/tasks/JobTaskView";
import {
  JobRequest,
  Metrics,
  Organization,
  ProjectStatus,
  ProviderProfile,
  Technician,
} from "@/types";
import { DashboardLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useJobManagement } from "@/context/JobManagementContext";
import { useMessaging } from "@/context/MessagingContext";
import { useDispatcherNavigation } from "@/context/DispatcherNavigationContext";
import { JobDataBoundary } from "@/components/shared/jobs";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { fetchOrganizationTechnicians, geocodeAddress } from "@/lib/technicians";
import { getUIContext } from "@/lib/roles";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const messaging = useMessaging();
  const jobManagement = useJobManagement();
  const navigation = useDispatcherNavigation();
  const fetchedJobsRef = useRef<Set<string>>(new Set());
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [orgGeocodedCoords, setOrgGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Build UIContext for role-based rendering
  const uiContext = useMemo(() => {
    return getUIContext(user, memberships, organizationId);
  }, [user, memberships, organizationId]);

  // Get active org details for self-marker
  const activeMembership = memberships.find((m) => m.orgId === organizationId);

  // Check organization type from multiple sources for robustness
  const membershipOrgType = activeMembership?.organization?.type;
  const isPersonalOrg =
    membershipOrgType === "PERSONAL" ||
    orgDetails?.type === "PERSONAL" ||
    (activeMembership as any)?.organizationType === "PERSONAL";

  // Fetch full org details (includes lat/lng and address)
  useEffect(() => {
    let cancelled = false;
    const loadOrg = async () => {
      if (!organizationId) {
        setOrgDetails(null);
        return;
      }
      try {
        const org = await api.organizations.getById(organizationId);
        if (!cancelled) {
          setOrgDetails(org);
        }
      } catch (error) {
        if (!cancelled) {
          setOrgDetails(null);
          console.error("Failed to load organization for dashboard", error);
        }
      }
    };
    if (user) {
      loadOrg();
    } else {
      setOrgDetails(null);
    }
    return () => {
      cancelled = true;
    };
  }, [organizationId, user]);

  // Get location from orgDetails (full API response) since membership.organization doesn't include lat/lng
  const orgLatRaw = orgDetails?.lat;
  const orgLngRaw = orgDetails?.lng;
  const orgLat = typeof orgLatRaw === "string" ? parseFloat(orgLatRaw) : orgLatRaw;
  const orgLng = typeof orgLngRaw === "string" ? parseFloat(orgLngRaw) : orgLngRaw;
  const hasOrgLocation = typeof orgLat === "number" && !Number.isNaN(orgLat) && typeof orgLng === "number" && !Number.isNaN(orgLng);

  // Geocode org address if lat/lng not available
  // Only runs when orgDetails is loaded (full API response with address fields)
  useEffect(() => {
    const tryGeocode = async () => {
      // Skip if we already have coordinates from orgDetails
      if (hasOrgLocation) return;
      // Skip if orgDetails hasn't loaded yet (need full org data for address fields)
      if (!orgDetails) return;

      const addressParts = [
        orgDetails.addressLine1,
        orgDetails.addressLine2,
        orgDetails.city,
        orgDetails.region,
        orgDetails.postalCode,
        orgDetails.countryCode,
      ].filter(Boolean);

      if (!addressParts.length) {
        // No address - don't show marker
        return;
      }

      const addressString = addressParts.join(", ");
      try {
        const coords = await geocodeAddress(addressString);
        if (coords) {
          setOrgGeocodedCoords(coords);
        } else {
          // Geocoding failed - don't show marker
          console.warn("Geocoding returned no results for org address");
        }
      } catch (error) {
        console.error("Failed to geocode org address for dashboard:", error);
      }
    };
    void tryGeocode();
  }, [orgDetails, hasOrgLocation]);
  
  // Create selfTechnician for PERSONAL org users with a location
  // Requires orgDetails to be loaded for location data
  const selfTechnician: Technician | null = useMemo(() => {
    if (!user || !isPersonalOrg || (!hasOrgLocation && !orgGeocodedCoords)) {
      return null;
    }
    return {
      id: user.id,
      userId: user.id,
      orgMemberId: activeMembership?.id || user.id,
      orgId: organizationId || activeMembership?.orgId || orgDetails?.id || user.organizationId || "",
      memberId: activeMembership?.id,
      organizationId: orgDetails?.id,
      role: "TECHNICIAN",
      name: user.name || "Me",
      email: user.email || "",
      phone: orgDetails?.phone || "",
      isIndependent: true,
      companyId: undefined,
      companyName: undefined,
      homeLocation: {
        lat: (hasOrgLocation ? orgLat : orgGeocodedCoords?.lat) as number,
        lng: (hasOrgLocation ? orgLng : orgGeocodedCoords?.lng) as number,
        address: {
          street: orgDetails?.addressLine1 || "",
          city: orgDetails?.city || "",
          stateProvince: orgDetails?.region || "",
          country: orgDetails?.countryCode || "",
          postalCode: orgDetails?.postalCode || "",
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
  }, [user, isPersonalOrg, hasOrgLocation, orgGeocodedCoords, activeMembership, organizationId, orgDetails, orgLat, orgLng]);

  const roleUpper = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  
  // Filter technicians based on role
  // EDITOR: should not see any technicians on the map
  const technicians = useMemo(() => {
    if (roleUpper === "EDITOR") {
      return [];
    }
    return providers.filter((p) => p.role === "TECHNICIAN");
  }, [providers, roleUpper]);
  
  const providerProfile = useMemo(() => {
    if (!user) return null;
    return providers.find((provider) => provider.userId === user.id) || null;
  }, [providers, user]);
  const isAgent = (user?.accountType || "").toUpperCase() === "AGENT";
  // Agents can always view customer chat (they ARE the customer)
  // Other roles need OWNER/ADMIN/PROJECT_MANAGER
  const canViewCustomerChat = isAgent || ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(roleUpper);
  
  // Filter jobs based on role - TECHNICIAN sees their technician assignments, EDITOR sees their editor assignments
  const assignedJobs = useMemo(() => {
    if (!user) return [];

    // EDITOR: Filter by editorId
    if (roleUpper === "EDITOR") {
      return jobManagement.jobs.filter((job) => job.editorId === user.id);
    }

    // TECHNICIAN and others: Filter by assignedTechnicianId
    return jobManagement.jobs.filter(
      (job) => job.assignedTechnicianId === user.id
    );
  }, [jobManagement.jobs, user, roleUpper]);

  // Fetch dashboard metrics/stats for all authenticated users
  // Company orgs get org-level metrics, providers get individual stats
  const {
    metrics,
    stats: backendStats,
    role: dashboardRole,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useDashboardMetrics(!!user);

  const assignedJobStats = useMemo(() => {
    // Use backend-provided stats when available (for PROVIDER/TECHNICIAN/EDITOR dashboards)
    if (backendStats && 'upcomingJobs' in backendStats) {
      const providerStats = backendStats as import('@/types').ProviderStats;
      return {
        upcoming: providerStats.upcomingJobs,
        completed: providerStats.completedJobs,
        rating: providerProfile?.rating.overall ?? 0, // Rating still comes from provider profile
        onTimeRate: (providerStats.onTimeRate * 100).toFixed(0),
      };
    }

    // Fallback to client-side computation if backend stats not available
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
  }, [assignedJobs, providerProfile, backendStats]);

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

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      // Agents don't need to load technicians/providers - they're customers, not managers
      if (!user || isAgent) {
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
  }, [user, memberships, organizationId, isAgent]);

  // Layout already handles auth loading - if we reach here, user exists
  if (!user || !uiContext) {
    return null; // Redirect handled by hook
  }

  // Note: loadingProviders is handled inline with JobDataBoundary - no full-screen loader

  // Role-based rendering using UIContext
  const { showSidebar, accountType, orgType, isElevatedRole } = uiContext;

  // AGENT in PERSONAL or TEAM org: Show AgentJobsView (job cards with tabs)
  // Backend already filters to only return projects where agent is customer or project manager
  if (accountType === "AGENT" && !showSidebar) {
    const handleAgentJobClick = (job: JobRequest) => {
      jobManagement.selectJob(job);
      jobManagement.openTaskView(job);
    };
    const handleAgentTaskViewClose = jobManagement.handleTaskViewClose;
    const handleAgentFullScreen = jobManagement.openTaskDialog;
    const handleAgentTaskDialogClose = jobManagement.handleTaskDialogClose;
    const handleAgentOpenInNewPage = () => {
      if (jobManagement.selectedJob) {
        router.push(`/jobs/${jobManagement.selectedJob.id}`);
      }
    };

    return (
      <div className="size-full overflow-x-hidden">
        <AgentJobsView
          jobs={jobManagement.jobCards}
          technicians={technicians}
          organizationId={user.organizationId || ""}
          onNewJobClick={() => router.push("/booking")}
          onJobClick={handleAgentJobClick}
        />

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
          currentUserAccountType={user?.accountType}
          isClient={true}
          open={jobManagement.showTaskView}
          onOpenChange={handleAgentTaskViewClose}
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
          onAssignTechnician={() => {}}
          onChangeTechnician={() => {}}
          variant="sheet"
          onFullScreen={handleAgentFullScreen}
          onOpenInNewPage={handleAgentOpenInNewPage}
        />

        {/* Job Task View - Dialog (Full Screen) */}
        <JobTaskView
          job={jobManagement.selectedJob}
          messages={
            jobManagement.selectedJob
              ? messaging.getMessagesForJob(jobManagement.selectedJob.id)
              : []
          }
          currentUserId={user?.id || "current-user-id"}
          currentUserName={user?.name || "Current User"}
          currentUserAccountType={user?.accountType}
          isClient={true}
          open={jobManagement.showTaskDialog}
          onOpenChange={handleAgentTaskDialogClose}
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
          onAssignTechnician={() => {}}
          onChangeTechnician={() => {}}
          variant="dialog"
        />
      </div>
    );
  }

  // PROVIDER in PERSONAL org OR non-elevated role (TECHNICIAN/EDITOR) in COMPANY org:
  // Show ProviderDashboardView with their assigned jobs only
  if ((accountType === "PROVIDER" || accountType === "COMPANY") && !showSidebar) {
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

    const handleNavigateToJobsView = () => router.push("/jobs/all-jobs");
    const handleNavigateToMapView = () => router.push("/map");
    const handleNavigateToCalendarView = () => router.push("/calendar");
    const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
      jobManagement.selectJob(job);
      router.push(`/jobs/${job.id}`);
    };

    return (
      <div className="size-full overflow-x-hidden space-y-6" data-tour="dashboard-header">
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
            onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
            onJobClick={handleJobClick}
            currentUserId={user?.id}
            selfTechnicianOverride={selfTechnician}
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

  // COMPANY org: Show CompanyDashboardView (with sidebar)
  if (showSidebar) {
    console.log('[DashboardPage] showSidebar=true, metrics from hook:', metrics);
    console.log('[DashboardPage] metrics?.jobs:', metrics?.jobs);
    const displayMetrics = metrics ?? emptyMetrics;
    console.log('[DashboardPage] displayMetrics.jobs:', displayMetrics.jobs);
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
      <div className="size-full overflow-x-hidden space-y-6 pt-4" data-tour="dashboard-header">
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
              onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
              onJobAssign={handleJobAssign}
              onJobClick={handleJobClick}
            />
          )}
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
          onStatusChange={() => {}}
          onAssignTechnician={jobManagement.handleAssignTechnician}
          onChangeTechnician={jobManagement.handleChangeTechnician}
          variant="dialog"
        />
      </div>
    );
  }

  // Fallback: Show minimal dashboard for unknown contexts
  return (
    <div className="size-full overflow-x-hidden p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Dashboard view for your role is coming soon.
      </p>
    </div>
  );
}
