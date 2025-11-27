'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { JobTaskView } from '@/components/shared/tasks/JobTaskView';
import { useJobManagement } from '@/context/JobManagementContext';
import { useMessaging } from '@/context/MessagingContext';
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/components/ui/use-mobile';

export default function JobTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const [photographers] = useState(initialPhotographers);
  const [headerHeight, setHeaderHeight] = useState(73); // Default fallback
  const isMobile = useIsMobile();
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
  const leftOffset = isMobile ? '0' : (sidebarState === 'collapsed' ? '3rem' : '16rem');

  // Measure header height
  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    // Measure on mount
    measureHeader();

    // Measure on resize
    window.addEventListener('resize', measureHeader);

    // Also use ResizeObserver for more accurate measurements
    const header = document.querySelector('header');
    let resizeObserver: ResizeObserver | null = null;

    if (header) {
      resizeObserver = new ResizeObserver(() => {
        measureHeader();
      });
      resizeObserver.observe(header);
    }

    return () => {
      window.removeEventListener('resize', measureHeader);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

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
        router.push('/dispatcher/jobs/all');
      }
    }
  }, [jobId, jobManagement, router]);

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
            onClick={() => router.push('/dispatcher/jobs')}
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
        top: `${headerHeight}px`,
        left: leftOffset,
        right: 0,
        bottom: 0,
        height: `calc(100vh - ${headerHeight}px)`
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
            router.push('/dispatcher/jobs/all');
          }
        }}
        onSendMessage={(content, chatType, threadId) => messaging.sendMessage(job.id, content, chatType, threadId)}
        onEditMessage={(messageId, content) => messaging.editMessage(messageId, content)}
        onDeleteMessage={(messageId) => messaging.deleteMessage(messageId)}
        onStatusChange={(status) => {
          jobManagement.changeJobStatus(job.id, status);
        }}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="page"
      />
    </div>
  );
}

