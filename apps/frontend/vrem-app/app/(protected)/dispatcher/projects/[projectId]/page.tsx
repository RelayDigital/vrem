'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { JobTaskView } from '@/components/shared/tasks/JobTaskView';
import { useJobManagement } from '@/context/JobManagementContext';
import { useMessaging } from '@/context/MessagingContext';
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented (visual placeholder only)
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { USE_MOCK_DATA } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/components/ui/use-mobile';
import { ProjectStatus } from '@/types';

export default function JobTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [photographers] = useState(USE_MOCK_DATA ? initialPhotographers : []);
  const jobId = params?.jobId as string;

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
  const leftOffset = useIsMobile() ? '0' : (sidebarState === 'collapsed' ? '3rem' : '16rem');

  // Trigger resize when sidebar state changes
  useEffect(() => {
    // Small delay to ensure DOM has updated after sidebar transition
    const timeoutId = setTimeout(() => {
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    }, 250); // Match sidebar transition duration (200ms) + buffer

    return () => clearTimeout(timeoutId);
  }, [sidebarState]);

  // Load the job when the page loads
  useEffect(() => {
    if (jobId && jobManagement.jobs.length > 0) {
      const job = jobManagement.getJobById(jobId);
      if (job) {
        jobManagement.selectJob(job);
      } else {
        // Job not found, redirect back to jobs page
        router.push('/dispatcher/projects/all');
      }
    }
  }, [jobId, jobManagement, router]);

  // Fetch messages when job is loaded
  useEffect(() => {
    if (jobId) {
      messaging.fetchMessages(jobId);
    }
  }, [jobId, messaging]);

  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const job = jobManagement.getJobById(jobId);
  const photographer = job?.assignedPhotographerId
    ? photographers.find((p) => p.id === job.assignedPhotographerId)
    : undefined;

  if (!job) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Job not found</p>
          <button
            onClick={() => router.push('/dispatcher/projects')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed overflow-hidden transition-[left] duration-200 ease-linear"
      style={{
        top: 'var(--header-h)',
        left: leftOffset,
        right: 0,
        bottom: 0,
        height: 'calc(100vh - var(--header-h))'
      }}
    >
      <JobTaskView
        job={job}
        photographer={photographer}
        messages={messaging.getMessagesForJob(job.id)}
        currentUserId={user?.id || 'current-user-id'}
        currentUserName={user?.name || 'Current User'}
        isClient={false}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            router.push('/dispatcher/projects/all');
          }
        }}
        onSendMessage={(content, chatType, threadId) => messaging.sendMessage(job.id, content, chatType, threadId)}
        onEditMessage={(messageId, content) => messaging.editMessage(messageId, content)}
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={(status) => {
          const statusMap: Record<string, ProjectStatus> = {
            'pending': ProjectStatus.BOOKED,
            'assigned': ProjectStatus.SHOOTING,
            'in_progress': ProjectStatus.SHOOTING,
            'editing': ProjectStatus.EDITING,
            'delivered': ProjectStatus.DELIVERED,
            'cancelled': ProjectStatus.BOOKED, // Fallback
          };
          jobManagement.changeJobStatus(job.id, statusMap[status] || ProjectStatus.BOOKED);
        }}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="page"
      />
    </div>
  );
}

