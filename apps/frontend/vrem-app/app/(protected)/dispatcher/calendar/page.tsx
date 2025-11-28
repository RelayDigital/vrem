'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { CalendarView } from '@/components/features/calendar/CalendarView';
import { Photographer } from '@/types';
import {
  photographers as initialPhotographers,
} from '@/lib/mock-data';
import { JobTaskView } from '@/components/shared/tasks/JobTaskView';
import { CalendarLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { useJobManagement } from '@/context/JobManagementContext';
import { useMessaging } from '@/context/MessagingContext';
import { useJobCreation } from '@/context/JobCreationContext';

export default function DispatcherCalendarPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const jobManagement = useJobManagement();
  const messaging = useMessaging();
  const jobCreation = useJobCreation();
  const [photographers] = useState(initialPhotographers);

  if (isLoading) {
    return <CalendarLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  // Use context handlers
  const handleJobClick = jobManagement.openTaskView;
  const handleViewRankings = jobManagement.openRankings;
  const handleJobAssign = jobManagement.assignJob;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/dispatcher/jobs/${jobManagement.selectedJob.id}`);
    }
  };
  const handleTaskViewClose = jobManagement.handleTaskViewClose;

  const handleCreateJob = (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => {
    jobCreation.openJobCreationDialog(initialValues);
  };

  // Fetch messages when selected job changes
  useEffect(() => {
    if (jobManagement.selectedJob) {
      messaging.fetchMessages(jobManagement.selectedJob.id);
    }
  }, [jobManagement.selectedJob, messaging]);

  return (
    <div className="w-full overflow-x-hidden h-full">
      <CalendarView
        jobs={jobManagement.jobs}
        photographers={photographers}
        onJobClick={handleJobClick}
        onCreateJob={handleCreateJob}
      />

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
        onStatusChange={() => { }}
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
        onStatusChange={() => { }}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="dialog"
      />
    </div>
  );
}

