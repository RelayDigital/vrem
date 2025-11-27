'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DispatcherSidebar } from '@/components/features/dispatcher/DispatcherSidebar';
import { AppHeader } from '@/components/shared/layout/AppHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCreationProvider, useJobCreation } from '@/context/JobCreationContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { JobManagementProvider, useJobManagement } from '@/context/JobManagementContext';
import { DispatcherNavigationProvider } from '@/context/DispatcherNavigationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobRequestForm } from '@/components/shared/jobs';
import { RankingsDialog } from '@/components/features/dispatcher/dialogs';
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { ReactNode } from 'react';

export default function DispatcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);

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
      defaultOrganizationId={user?.organizationId}
    >
      <JobCreationProviderWrapper
        defaultUserId={user?.id}
        defaultOrganizationId={user?.organizationId}
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
  
  return (
    <JobCreationProvider 
      defaultUserId={defaultUserId}
      defaultOrganizationId={defaultOrganizationId}
      createJobHandler={jobManagement.createJob}
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
        className="min-w-0 pt-header-h"
      >
        {children}
      </SidebarInset>

      {/* Job Creation Dialog - Shared across all dispatcher pages */}
      <Dialog open={jobCreation.isOpen} onOpenChange={(open) => {
        if (!open) {
          jobCreation.closeJobCreationDialog();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
          </DialogHeader>
          <JobRequestForm
            initialValues={jobCreation.initialValues}
            onSubmit={jobCreation.handleJobCreate}
          />
        </DialogContent>
      </Dialog>

      {/* Rankings Dialog - Shared across all dispatcher pages */}
      <RankingsDialog
        open={jobManagement.showRankings}
        onOpenChange={(open) => {
          if (!open) {
            jobManagement.closeRankings();
          }
        }}
        selectedJob={jobManagement.selectedJob}
        photographers={initialPhotographers}
        onJobAssign={jobManagement.assignJob}
      />
    </SidebarProvider>
  );
}

