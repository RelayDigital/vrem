'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { JobsView } from '@/components/features/dispatcher/views/JobsView';
import { JobTaskView } from '@/components/shared/tasks/JobTaskView';
import { Photographer } from '@/types';
import {
  photographers as initialPhotographers,
} from '@/lib/mock-data';
import { useJobManagement } from '@/context/JobManagementContext';
import { useMessaging } from '@/context/MessagingContext';
import { JobsLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/components/ui/use-mobile';

export default function ProjectManagementPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [photographers] = useState(initialPhotographers);
  const isMobile = useIsMobile();

  // Get sidebar state to adjust left offset
  let sidebarState: string | undefined;
  let sidebarOpen: boolean | undefined;
  try {
    const sidebar = useSidebar();
    sidebarState = sidebar.state;
    sidebarOpen = sidebar.open;
  } catch {
    // Not within SidebarProvider, use defaults
    sidebarState = 'expanded';
    sidebarOpen = true;
  }

  // Calculate left offset based on sidebar state
  // When collapsed to icon: 3rem (48px), when expanded: 16rem (256px)
  // On mobile, no offset (sidebar doesn't affect layout)
  const leftOffset = isMobile ? '0' : (sidebarState === 'collapsed' ? '3rem' : '16rem');

  // Trigger resize when sidebar state changes
  useEffect(() => {
    // Small delay to ensure DOM has updated after sidebar transition
    const timeoutId = setTimeout(() => {
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    }, 250); // Match sidebar transition duration (200ms) + buffer

    return () => clearTimeout(timeoutId);
  }, [sidebarState]);

  // Listen for navigation events to open job task view
  useEffect(() => {
    const handleOpenJobTaskView = (event: CustomEvent<{ id: string }>) => {
      const job = jobManagement.getJobById(event.detail.id);
      if (job) {
        jobManagement.selectJob(job);
        jobManagement.openTaskView(job);
      }
    };

    window.addEventListener('openJobTaskView', handleOpenJobTaskView as EventListener);
    return () => {
      window.removeEventListener('openJobTaskView', handleOpenJobTaskView as EventListener);
    };
  }, [jobManagement]);

  if (isLoading) {
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  // Use context handlers
  const handleViewRankings = jobManagement.openRankings;
  const handleJobAssign = jobManagement.assignJob;
  const handleJobClick = jobManagement.openTaskView;
  const handleJobStatusChange = jobManagement.changeJobStatus;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/dispatcher/jobs/${jobManagement.selectedJob.id}`);
    }
  };
  const handleTaskViewClose = jobManagement.handleTaskViewClose;

  return (
    <>
    <div
      className="fixed overflow-hidden transition-[left] duration-200 ease-linear flex flex-col"
      style={{
        top: 'var(--header-h)',
        left: leftOffset,
        right: 0,
        bottom: 0,
        height: 'calc(100vh - var(--header-h))'
      }}
    >
      <div className="container relative mx-auto px-md pt-md shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dispatcher/jobs/all">Jobs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Project Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <JobsView
        jobs={jobManagement.jobs}
        photographers={photographers}
        messages={messaging.messages}
        onViewRankings={handleViewRankings}
        onChangePhotographer={handleViewRankings}
        onJobStatusChange={handleJobStatusChange}
        onJobClick={handleJobClick}
        activeView="kanban"
      />
      </div>
    </div>

    {/* Job Task View - Sheet */}
    <JobTaskView
        job={jobManagement.selectedJob}
        photographer={
          jobManagement.selectedJob?.assignedPhotographerId
            ? photographers.find((p) => p.id === jobManagement.selectedJob?.assignedPhotographerId)
            : undefined
        }
        messages={jobManagement.selectedJob ? messaging.getMessagesForJob(jobManagement.selectedJob.id) : []}
        currentUserId={user?.id || 'current-user-id'}
        currentUserName={user?.name || 'Current User'}
        isClient={false}
        open={jobManagement.showTaskView}
        onOpenChange={handleTaskViewClose}
        onSendMessage={(content, chatType, threadId) => messaging.sendMessage(jobManagement.selectedJob?.id || '', content, chatType, threadId)}
        onEditMessage={(messageId, content) => messaging.editMessage(messageId, content)}
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={(status) => {
          if (jobManagement.selectedJob) {
            handleJobStatusChange(jobManagement.selectedJob.id, status);
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
        photographer={
          jobManagement.selectedJob?.assignedPhotographerId
            ? photographers.find((p) => p.id === jobManagement.selectedJob?.assignedPhotographerId)
            : undefined
        }
        messages={jobManagement.selectedJob ? messaging.getMessagesForJob(jobManagement.selectedJob.id) : []}
        currentUserId={user?.id || 'current-user-id'}
        currentUserName={user?.name || 'Current User'}
        isClient={false}
        open={jobManagement.showTaskDialog}
        onOpenChange={handleTaskDialogClose}
        onSendMessage={(content, chatType, threadId) => messaging.sendMessage(jobManagement.selectedJob?.id || '', content, chatType, threadId)}
        onEditMessage={(messageId, content) => messaging.editMessage(messageId, content)}
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={(status) => {
          if (jobManagement.selectedJob) {
            handleJobStatusChange(jobManagement.selectedJob.id, status);
          }
        }}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="dialog"
      />
    </>
  );
}

