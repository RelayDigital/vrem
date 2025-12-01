'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCreationProvider, useJobCreation } from '@/context/JobCreationContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { JobManagementProvider, useJobManagement } from '@/context/JobManagementContext';
import { DispatcherNavigationProvider } from '@/context/DispatcherNavigationContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader, MobileMenuDock } from '@/components/shared/layout';
import { DispatcherSidebar } from '@/components/features/dispatcher/DispatcherSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { JobRequestForm } from '@/components/shared/jobs';
import { RankingsDialog } from '@/components/features/dispatcher/dialogs';
import { BackendHealthAlert } from '@/components/shared/BackendHealthAlert';
import { useIsMobile } from '@/components/ui/use-mobile';
import { ReactNode, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { JobRequest, Project } from '@/types';
import { USE_MOCK_DATA } from '@/lib/utils';

// Layout content component that renders header, sidebar, and dialogs
function LayoutContent({
  children,
  user,
}: {
  children: ReactNode;
  user: any;
}) {
  const jobCreation = useJobCreation();
  const jobManagement = useJobManagement();
  const isMobile = useIsMobile();

  // Determine if user should see sidebar (dispatcher/admin/project manager/editor)
  const shouldShowSidebar = ['dispatcher', 'ADMIN', 'PROJECT_MANAGER', 'EDITOR'].includes(user.role);
  
  // Determine if user can create jobs (dispatcher/admin/project manager/editor)
  const canCreateJobs = shouldShowSidebar;

  const jobFormContent = (
    <>
      <JobRequestForm
        initialValues={jobCreation.initialValues}
        onSubmit={jobCreation.handleJobCreate}
      />
    </>
  );

  // For roles with sidebar (dispatcher/admin/project manager/editor)
  if (shouldShowSidebar) {
    return (
      <SidebarProvider>
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <AppHeader user={user} showNewJobButton={true} />
        </div>

        {/* Sidebar */}
        <DispatcherSidebar />

        {/* Main Content */}
        <SidebarInset
          className="min-w-0 pt-header-h pb-dock-h md:pb-0!"
        >
          {children}
        </SidebarInset>

        {/* Mobile Menu Dock */}
        <MobileMenuDock />

        {/* Job Creation - Drawer on mobile, Dialog on desktop */}
        {isMobile ? (
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
        )}

        {/* Rankings Dialog - For dispatcher/admin roles */}
        {/* TODO: replace with real photographer list from backend once users/technicians endpoint is implemented */}
        <RankingsDialog
          open={jobManagement.showRankings}
          onOpenChange={(open) => {
            if (!open) {
              jobManagement.closeRankings();
            }
          }}
          selectedJob={jobManagement.selectedJob}
          photographers={USE_MOCK_DATA ? [] : []}
          onJobAssign={jobManagement.assignJob}
        />
      </SidebarProvider>
    );
  }

  // For roles without sidebar (agent, technician/photographer)
  return (
    <div className="flex h-screen w-full flex-col overflow-y-scroll">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppHeader user={user} showNewJobButton={canCreateJobs} />
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
  const { user, isLoading, organizationId } = useRequireRole([
    'dispatcher',
    'AGENT',
    'TECHNICIAN',
    'EDITOR',
    'ADMIN',
    'PROJECT_MANAGER',
  ]);
  const [initialProjects, setInitialProjects] = useState<Project[] | null>(null);

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
    >
      <JobCreationProviderWrapper
        defaultUserId={user?.id}
        defaultOrganizationId={organizationId || undefined}
        userRole={user?.role}
      >
        <MessagingProvider
          defaultUserId={user?.id}
          defaultUserName={user?.name}
        >
          <DispatcherNavigationProvider>
            <LayoutContent user={user}>
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
// Reused from dispatcher/agent/photographer layouts
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
      address: job.propertyAddress,
      scheduledTime: job.scheduledDate && job.scheduledTime
        ? new Date(`${job.scheduledDate}T${job.scheduledTime}`)
        : undefined,
      // Map other fields as needed
      notes: job.requirements,
      agentId: job.createdBy || (userRole === 'AGENT' ? defaultUserId : undefined),
      customerId: job.customerId,
      orgId: job.organizationId || defaultOrganizationId,
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
