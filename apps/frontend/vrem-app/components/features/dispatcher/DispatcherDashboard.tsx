"use client";

import { useState, useEffect } from "react";
import { RankingsDialog } from "./dialogs";
import {
  JobRequest,
  Photographer,
  AuditLogEntry,
  Metrics,
} from "../../../types";
import { ChatMessage } from "../../../types/chat";
import { JobTaskView } from "../../shared/tasks/JobTaskView";
import { DashboardView, JobsView, LiveJobMapView, TeamView, AuditView } from "./views";
import { CalendarView } from "../calendar";
import { SettingsView } from "../../shared/settings";
import { dispatcherSettingsConfig } from "../../shared/settings/settings-config";
import { dispatcherSettingsComponents } from "./settings";
import type { SettingsSubView } from "../../shared/settings";

interface DispatcherDashboardProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  auditLog: AuditLogEntry[];
  metrics: Metrics;
  onJobCreate: (job: Partial<JobRequest>) => void;
  onJobAssign: (jobId: string, photographerId: string, score: number) => void;
  onJobStatusChange?: (jobId: string, newStatus: JobRequest["status"]) => void;
  activeView?: "dashboard" | "jobs" | "team" | "audit" | "map" | "calendar" | "settings";
  onNavigateToJobsView?: () => void;
  onNavigateToMapView?: () => void;
  onNavigateToCalendarView?: () => void;
  onNewJobClick?: (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => void;
}

export function DispatcherDashboard({
  jobs,
  photographers,
  auditLog,
  metrics,
  onJobCreate,
  onJobAssign,
  onJobStatusChange,
  activeView = "dashboard",
  onNavigateToJobsView,
  onNavigateToMapView,
  onNavigateToCalendarView,
  onNewJobClick,
}: DispatcherDashboardProps) {
  const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
  const [showRankings, setShowRankings] = useState(false);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [showTaskView, setShowTaskView] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newJobInitialValues, setNewJobInitialValues] = useState<{
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }>();
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>(null);

  // Reset settings sub-view when navigating away from settings
  useEffect(() => {
    if (activeView !== "settings") {
      setSettingsSubView(null);
    }
  }, [activeView]);

  // If onNewJobClick is provided, use it; otherwise use local state
  const handleNewJobClick = (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => {
    if (onNewJobClick) {
      onNewJobClick(initialValues);
    } else {
      setNewJobInitialValues(initialValues);
      setShowNewJobForm(true);
    }
  };

  const handleViewRankings = (job: JobRequest) => {
    setSelectedJob(job);
    setShowRankings(true);
  };

  const handleJobAssign = (
    jobId: string,
    photographerId: string,
    score: number
  ) => {
    onJobAssign(jobId, photographerId, score);
    setShowRankings(false);
    setSelectedJob(null);
  };

  const handleJobClick = (job: JobRequest) => {
    setSelectedJob(job);
    // Always open sheet when clicking a job (dialog is only for full screen)
    setShowTaskView(true);
    // Load messages for this job (in a real app, this would be an API call)
    // For now, we'll use empty array or mock data
  };

  const handleFullScreen = () => {
    // Close sheet and open dialog
    setShowTaskView(false);
    setShowTaskDialog(true);
  };

  const handleJobSelect = (job: JobRequest) => {
    // If clicking the same job, deselect it to reset the map view
    if (selectedJob?.id === job.id) {
      setSelectedJob(null);
    } else {
      // Just select the job for map highlighting, don't open sidebar
      setSelectedJob(job);
    }
  };

  const handleSendMessage = (
    content: string,
    chatType: "client" | "team",
    threadId?: string
  ) => {
    if (!selectedJob) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      jobId: selectedJob.id,
      userId: "current-user-id", // In real app, get from auth context
      userName: "Current User", // In real app, get from auth context
      content,
      createdAt: new Date(),
      threadId,
      chatType,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    // In a real app, this would send to the backend
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content } : msg))
    );
    // In a real app, this would update the message on the backend
  };

  const handleDeleteMessage = (messageId: string) => {
    setChatMessages((prev) => {
      // Only delete the message itself, not replies (messages with threadId === messageId)
      // Replies will remain but will be orphaned (they'll still have threadId pointing to deleted message)
      return prev.filter((msg) => msg.id !== messageId);
    });
    // In a real app, this would delete the message on the backend
  };

  const handleTaskViewClose = (open: boolean) => {
    setShowTaskView(open);
    if (!open) {
      setSelectedJob(null);
    }
  };

  const handleTaskDialogClose = (open: boolean) => {
    setShowTaskDialog(open);
    if (!open) {
      setSelectedJob(null);
    }
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      {/* Views */}
      {activeView === "dashboard" && (
        <DashboardView
          jobs={jobs}
          photographers={photographers}
          metrics={metrics}
          selectedJob={selectedJob}
          onViewRankings={handleViewRankings}
          onSelectJob={handleJobSelect}
          onNavigateToJobsView={onNavigateToJobsView}
          onNavigateToMapView={onNavigateToMapView}
          onNavigateToCalendarView={onNavigateToCalendarView}
          onNavigateToJobInProjectManagement={(job) => {
            setSelectedJob(job);
            if (onNavigateToJobsView) {
              onNavigateToJobsView();
            }
            // Small delay to ensure view switches before opening sidebar
            setTimeout(() => {
              setShowTaskView(true);
            }, 100);
          }}
          onJobAssign={handleJobAssign}
          onJobClick={handleJobClick}
        />
      )}

      {activeView === "jobs" && (
        <JobsView
          jobs={jobs}
          photographers={photographers}
          messages={chatMessages}
          onViewRankings={handleViewRankings}
          onChangePhotographer={handleViewRankings} // Reuse the same handler - it opens rankings dialog
          onJobStatusChange={onJobStatusChange}
          onJobClick={handleJobClick}
        />
      )}

      {activeView === "team" && (
        <TeamView photographers={photographers} />
      )}

      {activeView === "audit" && (
        <AuditView auditLog={auditLog} />
      )}

      {activeView === "map" && (
        <LiveJobMapView
          jobs={jobs}
          photographers={photographers}
          selectedJob={selectedJob}
          onSelectJob={handleJobSelect}
          onNavigateToJobInProjectManagement={(job) => {
            setSelectedJob(job);
            if (onNavigateToJobsView) {
              onNavigateToJobsView();
            }
            // Small delay to ensure view switches before opening sidebar
            setTimeout(() => {
              setShowTaskView(true);
            }, 100);
          }}
          onJobAssign={handleJobAssign}
        />
      )}

      {activeView === "calendar" && (
        <CalendarView
          jobs={jobs}
          photographers={photographers}
          onJobClick={handleJobClick}
          onCreateJob={handleNewJobClick}
        />
      )}

      {activeView === "settings" && (
        <SettingsView
          subView={settingsSubView}
          onNavigate={(subView) => setSettingsSubView(subView)}
          config={dispatcherSettingsConfig}
          accountType="dispatcher"
          componentRegistry={dispatcherSettingsComponents}
        />
      )}

      {/* Rankings Dialog */}
      <RankingsDialog
        open={showRankings}
        onOpenChange={setShowRankings}
        selectedJob={selectedJob}
        photographers={photographers}
        onJobAssign={handleJobAssign}
      />

      {/* Job Task View - Sheet (Dashboard) */}
      <JobTaskView
        job={selectedJob}
        photographer={
          selectedJob?.assignedPhotographerId
            ? photographers.find(
              (p) => p.id === selectedJob.assignedPhotographerId
            )
            : undefined
        }
        messages={chatMessages.filter((m) => m.jobId === selectedJob?.id)}
        currentUserId="current-user-id"
        currentUserName="Current User"
        isClient={false}
        open={showTaskView}
        onOpenChange={handleTaskViewClose}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onStatusChange={(status) => {
          if (selectedJob && onJobStatusChange) {
            onJobStatusChange(selectedJob.id, status);
          }
        }}
        onAssignPhotographer={() => {
          if (selectedJob) {
            handleViewRankings(selectedJob);
            setShowTaskView(false);
          }
        }}
        onChangePhotographer={() => {
          if (selectedJob) {
            handleViewRankings(selectedJob);
            setShowTaskView(false);
          }
        }}
        variant="sheet"
        onFullScreen={handleFullScreen}
      />

      {/* Job Task View - Dialog (Full Screen) */}
      <JobTaskView
        job={selectedJob}
        photographer={
          selectedJob?.assignedPhotographerId
            ? photographers.find(
              (p) => p.id === selectedJob.assignedPhotographerId
            )
            : undefined
        }
        messages={chatMessages.filter((m) => m.jobId === selectedJob?.id)}
        currentUserId="current-user-id"
        currentUserName="Current User"
        isClient={false}
        open={showTaskDialog}
        onOpenChange={handleTaskDialogClose}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onStatusChange={(status) => {
          if (selectedJob && onJobStatusChange) {
            onJobStatusChange(selectedJob.id, status);
          }
        }}
        onAssignPhotographer={() => {
          if (selectedJob) {
            handleViewRankings(selectedJob);
            setShowTaskDialog(false);
          }
        }}
        onChangePhotographer={() => {
          if (selectedJob) {
            handleViewRankings(selectedJob);
            setShowTaskDialog(false);
          }
        }}
        variant="dialog"
      />
    </div>
  );
}
