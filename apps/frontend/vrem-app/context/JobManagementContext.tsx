'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { JobRequest } from '@/types';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface JobManagementContextType {
  // Job state
  jobs: JobRequest[];
  getJobById: (jobId: string) => JobRequest | undefined;
  updateJob: (jobId: string, updates: Partial<JobRequest>) => void;

  // Job handlers
  assignJob: (jobId: string, photographerId: string, score: number) => void;
  changeJobStatus: (jobId: string, newStatus: JobRequest['status']) => void;
  createJob: (job: Partial<JobRequest>) => JobRequest;

  // Job selection
  selectedJob: JobRequest | null;
  selectJob: (job: JobRequest | null) => void;
  toggleJobSelection: (job: JobRequest) => void;

  // Rankings
  showRankings: boolean;
  openRankings: (job: JobRequest) => void;
  closeRankings: () => void;

  // Task view
  showTaskView: boolean;
  showTaskDialog: boolean;
  openTaskView: (job: JobRequest) => void;
  closeTaskView: () => void;
  openTaskDialog: () => void;
  closeTaskDialog: () => void;
  handleTaskViewClose: (open: boolean) => void;
  handleTaskDialogClose: (open: boolean) => void;

  // Photographer assignment handlers
  handleAssignPhotographer: () => void;
  handleChangePhotographer: () => void;
}

const JobManagementContext = createContext<JobManagementContextType | undefined>(undefined);

export function JobManagementProvider({
  children,
  defaultUserId,
  defaultOrganizationId,
}: {
  children: ReactNode;
  defaultUserId?: string;
  defaultOrganizationId?: string;
}) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
  const [showRankings, setShowRankings] = useState(false);
  const [showTaskView, setShowTaskView] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // Load jobs from API on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await api.jobs.getAll();
        // Ensure dates are Date objects
        const jobsWithDates = fetchedJobs.map((job) => ({
          ...job,
          createdAt: new Date(job.createdAt),
          scheduledDate: job.scheduledDate,
          scheduledTime: job.scheduledTime,
          assignedAt: job.assignedAt ? new Date(job.assignedAt) : undefined,
          completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        }));
        setJobs(jobsWithDates);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast.error('Failed to load jobs');
      }
    };

    fetchJobs();
  }, []);

  // Dispatch event for real-time updates whenever jobs change
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('jobsUpdated', { detail: jobs }));
  }, [jobs]);

  // Listen for job creation events
  useEffect(() => {
    const handleJobCreated = (event: CustomEvent<JobRequest>) => {
      const newJob = event.detail;
      setJobs((prev) => [newJob, ...prev]);
    };

    window.addEventListener('jobCreated', handleJobCreated as EventListener);
    return () => {
      window.removeEventListener('jobCreated', handleJobCreated as EventListener);
    };
  }, []);

  const getJobById = useCallback((jobId: string): JobRequest | undefined => {
    return jobs.find((job) => job.id === jobId);
  }, [jobs]);

  const updateJob = useCallback((jobId: string, updates: Partial<JobRequest>) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  }, []);

  const assignJob = useCallback((
    jobId: string,
    photographerId: string,
    score: number
  ) => {
    updateJob(jobId, {
      status: 'assigned',
      assignedPhotographerId: photographerId,
      assignedAt: new Date(),
    });
    setShowRankings(false);
    setSelectedJob(null);
    toast.success('Photographer assigned successfully');

    // Dispatch event
    window.dispatchEvent(new CustomEvent('jobAssigned', {
      detail: { jobId, photographerId, score }
    }));
  }, [updateJob]);

  const changeJobStatus = useCallback((
    jobId: string,
    newStatus: JobRequest['status']
  ) => {
    updateJob(jobId, { status: newStatus });

    // Dispatch event
    window.dispatchEvent(new CustomEvent('jobStatusChanged', {
      detail: { jobId, newStatus }
    }));
  }, [updateJob]);

  const createJob = useCallback((job: Partial<JobRequest>): JobRequest => {
    const newJob: JobRequest = {
      id: `job-${Date.now()}`,
      orderNumber: (jobs.length + 1).toString().padStart(4, '0'),
      organizationId: defaultOrganizationId || 'org-vx-001',
      clientName: job.clientName!,
      propertyAddress: job.propertyAddress!,
      location: job.location || { lat: 51.0447, lng: -114.0719 },
      scheduledDate: job.scheduledDate!,
      scheduledTime: job.scheduledTime!,
      mediaType: job.mediaType!,
      priority: job.priority || 'standard',
      status: 'pending',
      estimatedDuration: job.estimatedDuration || 120,
      requirements: job.requirements || '',
      createdBy: defaultUserId || 'user-001',
      createdAt: new Date(),
      propertyImage: job.propertyImage || 'https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800',
    };

    setJobs((prev) => [newJob, ...prev]);
    return newJob;
  }, [jobs.length, defaultUserId, defaultOrganizationId]);

  const selectJob = useCallback((job: JobRequest | null) => {
    setSelectedJob(job);
  }, []);

  const toggleJobSelection = useCallback((job: JobRequest) => {
    setSelectedJob((prev) => (prev?.id === job.id ? null : job));
  }, []);

  const openRankings = useCallback((job: JobRequest) => {
    setSelectedJob(job);
    setShowRankings(true);
  }, []);

  const closeRankings = useCallback(() => {
    setShowRankings(false);
    setSelectedJob(null);
  }, []);

  const openTaskView = useCallback((job: JobRequest) => {
    setSelectedJob(job);
    setShowTaskView(true);
  }, []);

  const closeTaskView = useCallback(() => {
    setShowTaskView(false);
    setSelectedJob(null);
  }, []);

  const openTaskDialog = useCallback(() => {
    setShowTaskView(false);
    setShowTaskDialog(true);
  }, []);

  const closeTaskDialog = useCallback(() => {
    setShowTaskDialog(false);
    setSelectedJob(null);
  }, []);

  const handleTaskViewClose = useCallback((open: boolean) => {
    if (!open) {
      closeTaskView();
    }
  }, [closeTaskView]);

  const handleTaskDialogClose = useCallback((open: boolean) => {
    if (!open) {
      closeTaskDialog();
    }
  }, [closeTaskDialog]);

  const handleAssignPhotographer = useCallback(() => {
    if (selectedJob) {
      // Store the job before closing task view
      const jobToRank = selectedJob;
      // Close task view without clearing selectedJob
      setShowTaskView(false);
      // Open rankings with the preserved job
      setSelectedJob(jobToRank);
      setShowRankings(true);
    }
  }, [selectedJob]);

  const handleChangePhotographer = useCallback(() => {
    if (selectedJob) {
      // Store the job before closing task views
      const jobToRank = selectedJob;
      // Close task views without clearing selectedJob
      if (showTaskView) {
        setShowTaskView(false);
      }
      if (showTaskDialog) {
        setShowTaskDialog(false);
      }
      // Open rankings with the preserved job
      setSelectedJob(jobToRank);
      setShowRankings(true);
    }
  }, [selectedJob, showTaskView, showTaskDialog]);

  return (
    <JobManagementContext.Provider
      value={{
        jobs,
        getJobById,
        updateJob,
        assignJob,
        changeJobStatus,
        createJob,
        selectedJob,
        selectJob,
        toggleJobSelection,
        showRankings,
        openRankings,
        closeRankings,
        showTaskView,
        showTaskDialog,
        openTaskView,
        closeTaskView,
        openTaskDialog,
        closeTaskDialog,
        handleTaskViewClose,
        handleTaskDialogClose,
        handleAssignPhotographer,
        handleChangePhotographer,
      }}
    >
      {children}
    </JobManagementContext.Provider>
  );
}

export function useJobManagement() {
  const context = useContext(JobManagementContext);
  if (context === undefined) {
    throw new Error('useJobManagement must be used within a JobManagementProvider');
  }
  return context;
}



