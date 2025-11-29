'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DispatcherSidebar } from '@/components/features/dispatcher/DispatcherSidebar';
import { AppHeader, MobileMenuDock } from '@/components/shared/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCreationProvider, useJobCreation } from '@/context/JobCreationContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { JobManagementProvider, useJobManagement } from '@/context/JobManagementContext';
import { DispatcherNavigationProvider } from '@/context/DispatcherNavigationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { JobRequestForm } from '@/components/shared/jobs';
import { RankingsDialog } from '@/components/features/dispatcher/dialogs';
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented; currently a visual placeholder
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { USE_MOCK_DATA } from '@/lib/utils';
import { useIsMobile } from '@/components/ui/use-mobile';
import { ReactNode } from 'react';
import { api } from '@/lib/api';
import { JobRequest, Project } from '@/types';

export default function DispatcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, organizationId } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);

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

        {/* Sidebar Skeleton */}
        <div className="fixed left-0 bottom-0 w-64 border-r bg-background p-4" style={{ top: 'var(--header-h)' }}>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="ml-64 p-6 pt-header-h">
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
    >
      <JobCreationProviderWrapper
        defaultUserId={user?.id}
        defaultOrganizationId={organizationId || undefined}
      >
        <MessagingProvider
          defaultUserId={user?.id}
          defaultUserName={user?.name}
        >
          <DispatcherNavigationProvider>
            <DispatcherLayoutContent user={user}>
              {children}
            </DispatcherLayoutContent>
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
}: {
  children: ReactNode;
  defaultUserId?: string;
  defaultOrganizationId?: string;
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
      agentId: job.createdBy,
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

function DispatcherLayoutContent({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  const jobCreation = useJobCreation();
  const jobManagement = useJobManagement();

  const jobFormContent = (
    <>
      <JobRequestForm
        initialValues={jobCreation.initialValues}
        onSubmit={jobCreation.handleJobCreate}
      />
    </>
  );

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
      {useIsMobile() ? (
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

      {/* Rankings Dialog - Shared across all dispatcher pages */}
      {/* TODO: replace initialPhotographers with real photographer list from backend once users/technicians endpoint is implemented; temporary visual placeholder */}
      <RankingsDialog
        open={jobManagement.showRankings}
        onOpenChange={(open) => {
          if (!open) {
            jobManagement.closeRankings();
          }
        }}
        selectedJob={jobManagement.selectedJob}
        photographers={USE_MOCK_DATA ? initialPhotographers : []}
        onJobAssign={jobManagement.assignJob}
      />
    </SidebarProvider>
  );
}
