'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCreationProvider, useJobCreation } from '@/context/JobCreationContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { JobManagementProvider, useJobManagement } from '@/context/JobManagementContext';
import { DispatcherNavigationProvider } from '@/context/DispatcherNavigationContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader, MobileMenuDock } from '@/components/shared/layout';
import { CompanySidebar } from '@/components/features/company/CompanySidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { JobRequestForm } from '@/components/shared/jobs';
import { RankingsDialog } from '@/components/features/company/dialogs';
import { BackendHealthAlert } from '@/components/shared/BackendHealthAlert';
import { useIsMobile } from '@/components/ui/use-mobile';
import { ReactNode, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { JobRequest, OrganizationMember, Project, TechnicianProfile } from '@/types';
import { USE_MOCK_DATA } from '@/lib/utils';
import { fetchOrganizationTechnicians } from '@/lib/technicians';

const deriveAccountTypeFromMembership = (
  membership: any,
  fallback: string | undefined
) => {
  const normalizedFallback =
    (fallback || '').toUpperCase() === 'COMPANY' ? 'COMPANY' : fallback;
  if (!membership) return normalizedFallback;
  const orgType =
    membership?.organization?.type ||
    membership?.organizationType ||
    '';
  if (orgType === 'PERSONAL') return normalizedFallback || 'PROVIDER';
  const roleUpper = (membership.role || '').toUpperCase();
  if (
    ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'].includes(
      roleUpper
    )
  ) {
    return 'COMPANY';
  }
  if (roleUpper === 'AGENT') return 'AGENT';
  return 'PROVIDER';
};

// Layout content component that renders header, sidebar, and dialogs
function LayoutContent({
  children,
  user,
  memberships,
  activeOrgId,
}: {
  children: ReactNode;
  user: any;
  memberships: any[];
  activeOrgId: string | null;
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

  // Determine if user should see sidebar (company or elevated membership only)
  const activeMembership = memberships.find((m: any) => m?.orgId === activeOrgId);
  const effectiveAccountType = deriveAccountTypeFromMembership(
    activeMembership,
    user.accountType
  );
  const userForUi = { ...user, accountType: effectiveAccountType, role: effectiveAccountType };
  const shouldShowSidebar =
    (effectiveAccountType || '').toUpperCase() === 'COMPANY';
  const activeRole = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || '') as string
  ).toUpperCase();
  const activeOrgType =
    activeMembership?.organization?.type ||
    (activeMembership as any)?.organizationType ||
    '';
  const isProjectManager =
    activeRole === 'PROJECT_MANAGER' && activeOrgType !== 'PERSONAL';
  const isEditor = activeRole === 'EDITOR' && activeOrgType !== 'PERSONAL';
  // Determine if user can create jobs (company only, excluding project managers)
  const canCreateJobs = shouldShowSidebar && !isProjectManager && !isEditor;

  const jobFormContent = (
    <>
      <JobRequestForm
        initialValues={jobCreation.initialValues}
        onSubmit={jobCreation.handleJobCreate}
      />
    </>
  );

  // For roles with sidebar (admin/project manager/editor)
  if (shouldShowSidebar) {
    return (
      <SidebarProvider>
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <AppHeader user={userForUi} showNewJobButton={canCreateJobs} />
        </div>

        {/* Sidebar */}
        <CompanySidebar />

        {/* Main Content */}
        <SidebarInset
          className="min-w-0 pt-header-h pb-dock-h md:pb-0!"
        >
          {children}
        </SidebarInset>

        {/* Mobile Menu Dock */}
        <MobileMenuDock />

        {/* Job Creation - Drawer on mobile, Dialog on desktop */}
        {canCreateJobs &&
          (isMobile ? (
            <Drawer open={jobCreation.isOpen} onOpenChange={(open) => {
              if (!open) {
                jobCreation.closeJobCreationDialog();
              }
            }}>
              <DrawerContent className="">
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
              if (!open) {
                jobCreation.closeJobCreationDialog();
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Job</DialogTitle>
                </DialogHeader>
                {jobFormContent}
              </DialogContent>
            </Dialog>
          ))}

        {/* Rankings Dialog - For admin roles */}
        <RankingsDialog
          open={jobManagement.showRankings}
          onOpenChange={(open) => {
            if (!open) {
              jobManagement.closeRankings();
            }
          }}
          selectedJob={jobManagement.selectedJob}
          technicians={USE_MOCK_DATA ? [] : technicians}
          onJobAssign={jobManagement.assignJob}
        />
      </SidebarProvider>
    );
  }

  // For roles without sidebar (agent, technician/technician)
  return (
    <div className="flex h-screen w-full flex-col overflow-y-scroll">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <AppHeader
            user={userForUi}
            showNewJobButton={canCreateJobs}
            forceShowNavigation={!shouldShowSidebar}
          />
        </div>

      {/* Main Content */}
      <main className="pt-header-h pb-dock-h md:pb-0! size-full flex-1">
        {children}
      </main>

      {/* Mobile Menu Dock */}
      <MobileMenuDock />

      {/* Job Creation - Only show if user can create jobs */}
      {canCreateJobs && (
        <>
          {isMobile ? (
            <Drawer open={jobCreation.isOpen} onOpenChange={(open) => {
              if (!open) {
                jobCreation.closeJobCreationDialog();
              }
            }}>
              <DrawerContent className="">
                <DrawerHeader className="">
                  <DrawerTitle>Create New Job</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-4">
                  {jobFormContent}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={jobCreation.isOpen} onOpenChange={(open) => {
              if (!open) {
                jobCreation.closeJobCreationDialog();
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Job</DialogTitle>
                </DialogHeader>
                {jobFormContent}
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
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
  const activeMembership = memberships.find((m) => m.orgId === organizationId);
  const effectiveAccountType = deriveAccountTypeFromMembership(
    activeMembership,
    user?.accountType
  );
  const effectiveMemberRole = activeMembership?.orgRole || null;
  const userForUi = {
    ...user,
    accountType: effectiveAccountType,
    role: effectiveAccountType,
  };

  // Preload projects from dashboard API (reused from agent layout)
  useEffect(() => {
    const loadInitialProjects = async () => {
      if (!organizationId) return;
      api.organizations.setActiveOrganization(organizationId);
      try {
        const dashboardData = await api.dashboard.get();
        setInitialProjects(dashboardData.projects || []);
      } catch (error) {
        console.error('Failed to preload projects', error);
        // Fallback: try to load projects directly
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

  if (!user) {
    return null; // Redirect handled by hook
  }

  return (
    <JobManagementProvider
      defaultUserId={user?.id}
      defaultOrganizationId={organizationId || undefined}
      initialProjects={initialProjects || undefined}
      userRole={userForUi?.accountType}
      memberRole={effectiveMemberRole}
    >
      <JobCreationProviderWrapper
        defaultUserId={user?.id}
        defaultOrganizationId={organizationId || undefined}
        userRole={userForUi?.accountType}
      >
        <MessagingProvider
          defaultUserId={user?.id}
          defaultUserName={user?.name}
        >
          <DispatcherNavigationProvider>
            <LayoutContent
              user={userForUi}
              memberships={memberships}
              activeOrgId={organizationId}
            >
              {children}
            </LayoutContent>
            <BackendHealthAlert />
          </DispatcherNavigationProvider>
        </MessagingProvider>
      </JobCreationProviderWrapper>
    </JobManagementProvider>
  );
}

// Wrapper component to connect JobManagementContext with JobCreationContext
// Reused from dispatcher/agent/technician layouts
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
    // Map JobRequest (View Model) to Project (Domain)
    const projectData: Partial<Project> = {
      address: {
        unparsed_address: job.propertyAddress || "",
        latitude: job.location?.lat,
        longitude: job.location?.lng,
      },
      scheduledTime: job.scheduledDate && job.scheduledTime
        ? new Date(`${job.scheduledDate}T${job.scheduledTime}`)
        : undefined,
      // Map other fields as needed
      notes: job.requirements,
      customerId: job.customerId,
      orgId: job.organizationId || defaultOrganizationId,
      projectManagerId: job.createdBy || (userRole === 'AGENT' ? defaultUserId : undefined),
      // ... copy other matching fields if any
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
