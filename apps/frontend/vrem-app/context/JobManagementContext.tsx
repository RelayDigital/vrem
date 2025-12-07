'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { JobRequest, Project, ProjectStatus } from '@/types';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { toEffectiveRole } from '@/lib/roles';

interface JobManagementContextType {
  // Job state
  projects: Project[];
  jobCards: JobRequest[]; // View Model derived from projects
  jobs: JobRequest[]; // Deprecated alias for jobCards
  isLoadingJobs: boolean;
  jobsError: Error | null;
  refreshJobs: () => Promise<void>;
  getJobById: (jobId: string) => JobRequest | undefined;
  getProjectById: (projectId: string) => Project | undefined;
  updateJob: (jobId: string, updates: Partial<Project>) => void;

  // Job handlers
  assignJob: (jobId: string, technicianId: string, score: number) => void;
  changeJobStatus: (jobId: string, newStatus: ProjectStatus) => void;
  createJob: (job: Partial<Project>) => Promise<Project>;
  deleteJob: (jobId: string) => Promise<void>;

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

  // Technician assignment handlers
  handleAssignTechnician: () => void;
  handleChangeTechnician: () => void;
}

const JobManagementContext = createContext<JobManagementContextType | undefined>(undefined);

export function JobManagementProvider({
  children,
  defaultUserId,
  defaultOrganizationId,
  initialProjects,
  userRole,
  memberRole,
}: {
  children: ReactNode;
  defaultUserId?: string;
  defaultOrganizationId?: string;
  initialProjects?: Project[];
  userRole?: string;
  memberRole?: string | null;
}) {
  const normalizeProjects = useCallback((items: Project[]) => {
    return items.map((p) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      scheduledTime: new Date(p.scheduledTime),
    }));
  }, []);

  const [projects, setProjects] = useState<Project[]>(() =>
    initialProjects ? normalizeProjects(initialProjects) : []
  );
  const [isLoadingJobs, setIsLoadingJobs] = useState(!initialProjects);
  const [jobsError, setJobsError] = useState<Error | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
  const [showRankings, setShowRankings] = useState(false);
  const [showTaskView, setShowTaskView] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  useEffect(() => {
    if (initialProjects) {
      setProjects(normalizeProjects(initialProjects));
    }
  }, [initialProjects, normalizeProjects]);

  // Set active org header when provided
  useEffect(() => {
    // Agents may not belong to an org; ensure we don't carry a stale org header
    if (userRole && userRole.toUpperCase() === 'AGENT') {
      api.organizations.setActiveOrganization(null);
    } else if (defaultOrganizationId) {
      api.organizations.setActiveOrganization(defaultOrganizationId);
    }
  }, [defaultOrganizationId, userRole]);

  // Load jobs from API when org/user context is ready
  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobsError(null);

    const activeOrgId = api.organizations.getActiveOrganization();
    if (!activeOrgId && defaultOrganizationId && userRole?.toUpperCase() !== 'AGENT') {
      api.organizations.setActiveOrganization(defaultOrganizationId);
    }

    try {
      const memberRoleUpper = (memberRole || '').toUpperCase();
      const userRoleUpper = (userRole || '').toUpperCase();
      const hasOrgRole = Boolean(memberRoleUpper || userRoleUpper);
      const isProjectManagerRole =
        memberRoleUpper === 'PROJECT_MANAGER' || userRoleUpper === 'PROJECT_MANAGER';
      const effectiveRole = toEffectiveRole(memberRoleUpper || userRoleUpper);
      const canViewOrgProjects =
        hasOrgRole &&
        userRoleUpper !== 'AGENT' &&
        !isProjectManagerRole &&
        effectiveRole === 'COMPANY';

      let fetchedProjects: Project[] = [];
      if (canViewOrgProjects) {
        try {
          fetchedProjects = await api.projects.listForOrg();
        } catch (err: any) {
          const message = err?.message || '';
          const isForbidden =
            message.includes('403') || message.toLowerCase().includes('forbidden');
          if (!isForbidden) {
            // If no org header or other issue, fallback for agents/others
            fetchedProjects = await api.projects.listForCurrentUser();
          } else {
            fetchedProjects = await api.projects.listForCurrentUser();
          }
        }
      } else {
        fetchedProjects = await api.projects.listForCurrentUser();
      }
      if (isProjectManagerRole) {
        try {
          const assigned = await api.projects.listForCurrentUser();
          const byId = new Map(fetchedProjects.map((p) => [p.id, p]));
          assigned.forEach((p) => {
            if (!byId.has(p.id)) {
              byId.set(p.id, p);
            }
          });
          fetchedProjects = Array.from(byId.values());
        } catch (err) {
          console.warn('Failed to fetch assigned projects for project manager', err);
        }
      }
      // Ensure dates are Date objects
      const projectsWithDates = normalizeProjects(fetchedProjects);
      setProjects(projectsWithDates);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobsError(error as Error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoadingJobs(false);
    }
  }, [defaultOrganizationId, memberRole, normalizeProjects, userRole]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Reload jobs when organization changes (event fired by auth context)
  useEffect(() => {
    const handleOrgChange = () => {
      fetchJobs();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('organizationChanged', handleOrgChange as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('organizationChanged', handleOrgChange as EventListener);
      }
    };
  }, [fetchJobs]);

  const upsertProject = useCallback((project: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      if (exists) {
        return prev.map((p) => (p.id === project.id ? project : p));
      }
      return [project, ...prev];
    });
  }, []);

  // Derive jobs view model
  const jobCards = useMemo(() => {
    return projects.map(p => api.mapProjectToJobCard(p));
  }, [projects]);

  // Dispatch event for real-time updates whenever jobs change
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('jobsUpdated', { detail: jobCards }));
  }, [jobCards]);

  // Listen for job creation events
  useEffect(() => {
    const handleJobCreated = (event: CustomEvent<Project>) => {
      const newProject = event.detail;
      upsertProject(newProject);
    };

    window.addEventListener('jobCreated', handleJobCreated as EventListener);
    return () => {
      window.removeEventListener('jobCreated', handleJobCreated as EventListener);
    };
  }, [upsertProject]);

  const getJobById = useCallback((jobId: string): JobRequest | undefined => {
    return jobCards.find((job) => job.id === jobId);
  }, [jobCards]);

  const getProjectById = useCallback((projectId: string): Project | undefined => {
    return projects.find((p) => p.id === projectId);
  }, [projects]);

  const updateJob = useCallback((jobId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === jobId ? { ...p, ...updates } : p))
    );
  }, []);

  const assignJob = useCallback((
    jobId: string,
    technicianId: string,
    score: number
  ) => {
    (async () => {
      try {
        const updatedProject = await api.projects.assignTechnician(jobId, technicianId);
        updateJob(jobId, updatedProject);
        setShowRankings(false);
        setSelectedJob(null);
        toast.success('Technician assigned successfully');
        window.dispatchEvent(new CustomEvent('jobAssigned', {
          detail: { jobId, technicianId, score }
        }));
      } catch (error) {
        console.error('Failed to assign technician', error);
        toast.error('Failed to assign technician');
      }
    })();
  }, [updateJob]);

  const changeJobStatus = useCallback((
    jobId: string,
    newStatus: ProjectStatus
  ) => {
    (async () => {
      try {
        const updatedProject = await api.projects.updateStatus(jobId, newStatus);
        updateJob(jobId, updatedProject);
        window.dispatchEvent(new CustomEvent('jobStatusChanged', {
          detail: { jobId, newStatus }
        }));
        toast.success('Status updated');
      } catch (error) {
        console.error('Failed to update status', error);
        toast.error('Failed to update status');
      }
    })();
  }, [updateJob]);

  const deleteJob = useCallback(
    async (jobId: string): Promise<void> => {
      try {
        await api.projects.delete(jobId);
        setProjects((prev) => prev.filter((p) => p.id !== jobId));
        setSelectedJob((prev) => (prev?.id === jobId ? null : prev));
        setShowTaskView(false);
        setShowTaskDialog(false);
        setShowRankings(false);
        toast.success("Job deleted");
        window.dispatchEvent(
          new CustomEvent("jobDeleted", { detail: { jobId } })
        );
      } catch (error) {
        console.error("Failed to delete project", error);
        toast.error("Failed to delete project");
        throw error;
      }
    },
    []
  );

  const createJob = useCallback(async (job: Partial<Project>): Promise<Project> => {
    const resolvedOrgId = job.orgId || defaultOrganizationId;
    if (!resolvedOrgId) {
      toast.error('No organization selected. Please select an organization before creating a project.');
      throw new Error('Missing organization');
    }
    try {
      const newProject = await api.projects.create({
        address:
          (job as any).address ||
          (job as any).propertyAddress ||
          '',
        scheduledTime: job.scheduledTime || new Date(),
        notes: job.notes,
        customerId: (job as any).customerId,
        projectManagerId: (job as any).projectManagerId,
        technicianId: job.technicianId,
        editorId: job.editorId,
        orgId: resolvedOrgId,
      });
      const normalizedProject = {
        ...newProject,
        createdAt: new Date(newProject.createdAt),
        updatedAt: new Date(newProject.updatedAt),
        scheduledTime: new Date(newProject.scheduledTime),
      };
      upsertProject(normalizedProject);
      window.dispatchEvent(new CustomEvent('jobCreated', { detail: normalizedProject }));
      return normalizedProject;
    } catch (error) {
      console.error('Failed to create project', error);
      toast.error('Failed to create project');
      throw error;
    }
  }, [defaultUserId, defaultOrganizationId, upsertProject]);

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

  const handleAssignTechnician = useCallback(() => {
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

  const handleChangeTechnician = useCallback(() => {
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
        projects,
        jobCards,
        jobs: jobCards,
        isLoadingJobs,
        jobsError,
        refreshJobs: fetchJobs,
        getJobById,
        getProjectById,
        updateJob,
        assignJob,
        changeJobStatus,
        createJob,
        deleteJob,
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
        handleAssignTechnician,
        handleChangeTechnician,
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
