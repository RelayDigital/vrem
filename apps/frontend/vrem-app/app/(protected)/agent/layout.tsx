'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { AppHeader } from '@/components/shared/layout/AppHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCreationProvider, useJobCreation } from '@/context/JobCreationContext';
import { MessagingProvider } from '@/context/MessagingContext';
import { JobManagementProvider, useJobManagement } from '@/context/JobManagementContext';
import { ReactNode } from 'react';
import { api } from '@/lib/api';
import { JobRequest, Project } from '@/types';

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, organizationId } = useRequireRole(['AGENT', 'ADMIN', 'PROJECT_MANAGER']);

  if (isLoading) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-sm">
          <div className="w-full max-w-full py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </>
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
          <AgentLayoutContent user={user}>
            {children}
          </AgentLayoutContent>
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

function AgentLayoutContent({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  return (
    <div className="flex min-h-svh w-full">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-100">
        <AppHeader user={user} />
      </div>

      {/* Main Content */}
      <main className="pt-header-h w-full flex-1">
        {children}
      </main>
    </div>
  );
}
