'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { DashboardView } from '@/components/features/dispatcher/views/DashboardView';
import { JobTaskView } from '@/components/shared/tasks/JobTaskView';
import { JobRequest, Metrics } from '@/types';
import { api } from '@/lib/api';
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented (visual placeholder only)
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { USE_MOCK_DATA } from '@/lib/utils';
import { DashboardLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobRequestForm } from '@/components/shared/jobs';
import { useJobCreation } from '@/context/JobCreationContext';
import { useMessaging } from '@/context/MessagingContext';
import { useJobManagement } from '@/context/JobManagementContext';
import { useDispatcherNavigation } from '@/context/DispatcherNavigationContext';

export default function DispatcherDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const jobCreation = useJobCreation();
  const messaging = useMessaging();
  const jobManagement = useJobManagement();
  const navigation = useDispatcherNavigation();
  const [photographers] = useState(USE_MOCK_DATA ? initialPhotographers : []);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch metrics from backend
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const dashboardData = await api.dashboard.get();
        setMetrics(dashboardData.metrics);
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
        // Fallback to empty metrics on error
        setMetrics({
          organizationId: "",
          period: "week" as const,
          jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
          photographers: { active: 0, available: 0, utilization: 0 },
          technicians: { active: 0, available: 0, utilization: 0 },
          performance: { averageAssignmentTime: 0, averageDeliveryTime: 0, onTimeRate: 0, clientSatisfaction: 0 },
          revenue: { total: 0, perJob: 0 },
        });
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (isLoading || metricsLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user || !metrics) {
    return null; // Redirect handled by hook or metrics not loaded
  }

  // Use context handlers
  const handleViewRankings = jobManagement.openRankings;
  const handleJobAssign = jobManagement.assignJob;
  const handleJobSelect = jobManagement.toggleJobSelection;
  const handleJobClick = jobManagement.openTaskView;
  const handleFullScreen = jobManagement.openTaskDialog;
  const handleTaskDialogClose = jobManagement.handleTaskDialogClose;
  const handleOpenInNewPage = () => {
    if (jobManagement.selectedJob) {
      router.push(`/dispatcher/jobs/${jobManagement.selectedJob.id}`);
    }
  };
  const handleTaskViewClose = jobManagement.handleTaskViewClose;
  const handleNavigateToJobsView = navigation.navigateToJobsView;
  const handleNavigateToMapView = navigation.navigateToMapView;
  const handleNavigateToCalendarView = navigation.navigateToCalendarView;
  const handleNavigateToJobInProjectManagement = (job: JobRequest) => {
    jobManagement.selectJob(job);
    navigation.navigateToJobInProjectManagement(job);
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <DashboardView
        jobs={jobManagement.jobs}
        photographers={photographers}
        metrics={metrics}
        selectedJob={jobManagement.selectedJob}
        onViewRankings={handleViewRankings}
        onSelectJob={handleJobSelect}
        onNavigateToJobsView={handleNavigateToJobsView}
        onNavigateToMapView={handleNavigateToMapView}
        onNavigateToCalendarView={handleNavigateToCalendarView}
        onNavigateToJobInProjectManagement={handleNavigateToJobInProjectManagement}
        onJobAssign={handleJobAssign}
        onJobClick={handleJobClick}
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
        onStatusChange={() => {}}
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
        onStatusChange={() => {}}
        onAssignPhotographer={jobManagement.handleAssignPhotographer}
        onChangePhotographer={jobManagement.handleChangePhotographer}
        variant="dialog"
      />
    </div>
  );
}

