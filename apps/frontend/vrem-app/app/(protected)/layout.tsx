'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCreationProvider, useJobCreation } from '@/context/JobCreationContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { JobManagementProvider, useJobManagement } from '@/context/JobManagementContext';
import { DispatcherNavigationProvider } from '@/context/DispatcherNavigationContext';
import { TourProvider } from '@/context/tour-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader, MobileMenuDock } from '@/components/shared/layout';
import { CompanySidebar } from '@/components/features/company/CompanySidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { JobRequestForm } from '@/components/shared/jobs';
import { RankingsDialog } from '@/components/features/company/dialogs';
import { BackendHealthAlert } from '@/components/shared/BackendHealthAlert';
import { useIsMobile } from '@/components/ui/use-mobile';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { JobRequest, OrganizationMember, Project, TechnicianProfile, User } from '@/types';
import { USE_MOCK_DATA } from '@/lib/utils';
import { fetchOrganizationTechnicians } from '@/lib/technicians';
import { getUIContext, UIContext } from '@/lib/roles';

// Layout content component that renders header, sidebar, and dialogs
function LayoutContent({
  children,
  user,
  memberships,
  activeOrgId,
  uiContext,
}: {
  children: ReactNode;
  user: User;
  memberships: OrganizationMember[];
  activeOrgId: string | null;
  uiContext: UIContext;
}) {
  const jobCreation = useJobCreation();
  const jobManagement = useJobManagement();
  const isMobile = useIsMobile();
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [, setLoadingTechnicians] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadTechnicians = async () => {
      if (!activeOrgId) return;
      setLoadingTechnicians(true);
      try {
        const techs = await fetchOrganizationTechnicians();
        if (!cancelled) {
          setTechnicians(techs);
        }
      } catch (error) {
        console.error('Failed to load technicians for rankings', error);
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
  }, [activeOrgId]);

  // Use UIContext for layout decisions
  const { showSidebar, canCreateOrder, navItems, accountType } = uiContext;
  
  // For company org, check if user is project manager or editor (limited roles)
  const activeMembership = memberships.find((m) => m?.orgId === activeOrgId);
  const activeRole = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || '') as string
  ).toUpperCase();
  const isProjectManager = activeRole === 'PROJECT_MANAGER' && showSidebar;
  const isEditor = activeRole === 'EDITOR' && showSidebar;
  const isLimitedRole = isProjectManager || isEditor;
  
  // In company orgs, only OWNER and ADMIN can create jobs (not PM or Editor)
  const canCreateJobs = showSidebar && canCreateOrder && !isLimitedRole;

  const jobFormContent = (
    <JobRequestForm
      initialValues={jobCreation.initialValues}
      onSubmit={jobCreation.handleJobCreate}
    />
  );

  // For COMPANY orgs - show sidebar layout
  if (showSidebar) {
    return (
      <SidebarProvider>
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <AppHeader 
            user={user} 
            showNewJobButton={canCreateJobs}
            uiContext={uiContext}
          />
        </div>

        {/* Sidebar */}
        <CompanySidebar />

        {/* Main Content */}
        <SidebarInset className="min-w-0 pt-header-h pb-dock-h md:pb-0!">
          {children}
        </SidebarInset>

        {/* Mobile Menu Dock */}
        <MobileMenuDock uiContext={uiContext} />

        {/* Job Creation - Drawer on mobile, Dialog on desktop */}
        {canCreateJobs && (
          isMobile ? (
            <Drawer open={jobCreation.isOpen} onOpenChange={(open) => {
              if (!open) jobCreation.closeJobCreationDialog();
            }}>
              <DrawerContent>
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Create New Job</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-4">
                  {jobFormContent}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={jobCreation.isOpen} onOpenChange={(open) => {
              if (!open) jobCreation.closeJobCreationDialog();
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Job</DialogTitle>
                </DialogHeader>
                {jobFormContent}
              </DialogContent>
            </Dialog>
          )
        )}

        {/* Rankings Dialog - For admin roles */}
        <RankingsDialog
          open={jobManagement.showRankings}
          onOpenChange={(open) => {
            if (!open) jobManagement.closeRankings();
          }}
          selectedJob={jobManagement.selectedJob}
          technicians={USE_MOCK_DATA ? [] : technicians}
          onJobAssign={jobManagement.assignJob}
        />
      </SidebarProvider>
    );
  }

  // For PERSONAL/TEAM orgs - header-only layout
  return (
    <div className="flex h-screen w-full flex-col overflow-y-scroll">
      {/* Header with navigation */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppHeader
          user={user}
          showNewJobButton={false}
          uiContext={uiContext}
        />
      </div>

      {/* Main Content */}
      <main className="pt-header-h pb-dock-h md:pb-0! size-full flex-1">
        {children}
      </main>

      {/* Mobile Menu Dock */}
      <MobileMenuDock uiContext={uiContext} />
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Support all roles that can access protected routes
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    'AGENT',
    'TECHNICIAN',
    'COMPANY',
  ]);
  const [initialProjects, setInitialProjects] = useState<Project[] | null>(null);
  
  // Build UIContext from user and memberships
  const uiContext = useMemo(() => {
    return getUIContext(user, memberships, organizationId);
  }, [user, memberships, organizationId]);
  
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const effectiveMemberRole = (activeMembership as any)?.orgRole || activeMembership?.role || null;

  // Preload projects from dashboard API
  useEffect(() => {
    const loadInitialProjects = async () => {
      if (!organizationId) return;
      api.organizations.setActiveOrganization(organizationId);
      try {
        const dashboardData = await api.dashboard.get();
        setInitialProjects(dashboardData.projects || []);
      } catch (error) {
        console.error('Failed to preload projects', error);
        try {
          const projects = await api.projects.listForCurrentUser();
          setInitialProjects(projects);
        } catch (fallbackError) {
          console.error('Failed to load projects as fallback', fallbackError);
        }
      }
    };

    loadInitialProjects();
  }, [organizationId]);

  if (isLoading) {
    return (
      <SidebarProvider>
        {/* Header Skeleton */}
        <div className="fixed top-0 left-0 right-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-sm">
          <div className="w-full max-w-full py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6 pt-header-h">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!user || !uiContext) {
    return null; // Redirect handled by hook
  }

  return (
    <JobManagementProvider
      defaultUserId={user?.id}
      defaultOrganizationId={organizationId || undefined}
      initialProjects={initialProjects || undefined}
      userRole={uiContext.accountType}
      memberRole={effectiveMemberRole}
    >
      <JobCreationProviderWrapper
        defaultUserId={user?.id}
        defaultOrganizationId={organizationId || undefined}
        userRole={uiContext.accountType}
      >
        <MessagingProvider
          defaultUserId={user?.id}
          defaultUserName={user?.name}
        >
          <DispatcherNavigationProvider>
            <TourProvider>
              <LayoutContent
                user={user}
                memberships={memberships}
                activeOrgId={organizationId}
                uiContext={uiContext}
              >
                {children}
              </LayoutContent>
            </TourProvider>
            <BackendHealthAlert />
          </DispatcherNavigationProvider>
        </MessagingProvider>
      </JobCreationProviderWrapper>
    </JobManagementProvider>
  );
}

// Wrapper component to connect JobManagementContext with JobCreationContext
function JobCreationProviderWrapper({
  children,
  defaultUserId,
  defaultOrganizationId,
  userRole,
}: {
  children: ReactNode;
  defaultUserId?: string;
  defaultOrganizationId?: string;
  userRole?: string;
}) {
  const jobManagement = useJobManagement();

  const handleCreateJob = async (job: Partial<JobRequest>): Promise<JobRequest> => {
    const projectData: Partial<Project> = {
      address: {
        unparsed_address: job.propertyAddress || "",
        latitude: job.location?.lat,
        longitude: job.location?.lng,
      },
      scheduledTime: job.scheduledDate && job.scheduledTime
        ? new Date(`${job.scheduledDate}T${job.scheduledTime}`)
        : undefined,
      notes: job.requirements,
      customerId: job.customerId,
      orgId: job.organizationId || defaultOrganizationId,
      projectManagerId: job.createdBy || (userRole === 'AGENT' ? defaultUserId : undefined),
    };

    const newProject = await jobManagement.createJob(projectData);
    return api.mapProjectToJobCard(newProject);
  };

  return (
    <JobCreationProvider
      defaultUserId={defaultUserId}
      defaultOrganizationId={defaultOrganizationId}
      createJobHandler={handleCreateJob}
    >
      {children}
    </JobCreationProvider>
  );
}
