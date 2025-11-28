'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { JobRequest } from '@/types';
import { toast } from 'sonner';

interface JobCreationContextType {
  openJobCreationDialog: (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => void;
  closeJobCreationDialog: () => void;
  setOnSubmit: (handler: ((job: Partial<JobRequest> | null) => void | Promise<void>) | null) => void;
  handleJobCreate: (job: Partial<JobRequest> | null) => Promise<void>;
  isOpen: boolean;
  initialValues: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  } | undefined;
  onSubmit: ((job: Partial<JobRequest> | null) => void | Promise<void>) | null;
}

const JobCreationContext = createContext<JobCreationContextType | undefined>(undefined);

export function JobCreationProvider({ 
  children,
  defaultUserId,
  defaultOrganizationId,
  createJobHandler,
}: { 
  children: ReactNode;
  defaultUserId?: string;
  defaultOrganizationId?: string;
  createJobHandler?: (job: Partial<JobRequest>) => JobRequest | Promise<JobRequest>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<{
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }>();
  const [onSubmit, setOnSubmit] = useState<((job: Partial<JobRequest> | null) => void | Promise<void>) | null>(null);

  const openJobCreationDialog = (values?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => {
    setInitialValues(values);
    setIsOpen(true);
  };

  const closeJobCreationDialog = useCallback(() => {
    setIsOpen(false);
    setInitialValues(undefined);
  }, []);

  // Default job creation handler - uses createJobHandler if provided, otherwise fallback
  const defaultJobHandler = useCallback(async (job: Partial<JobRequest> | null) => {
    if (!job) {
      toast.error('Invalid job data');
      return;
    }

    // Use provided createJobHandler if available (from JobManagementContext)
    if (createJobHandler) {
      await createJobHandler(job);
      toast.success('Job created successfully');
      closeJobCreationDialog();
      return;
    }

    // Fallback: create job manually (for backwards compatibility)
    const storedJobs = localStorage.getItem('dispatcherJobs');
    const currentJobs = storedJobs ? JSON.parse(storedJobs) : [];
    const currentCount = currentJobs.length;

    const newJob: JobRequest = {
      id: `job-${Date.now()}`,
      orderNumber: (currentCount + 1).toString().padStart(4, '0'),
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

    const updatedJobs = [newJob, ...currentJobs];
    localStorage.setItem('dispatcherJobs', JSON.stringify(updatedJobs));
    window.dispatchEvent(new CustomEvent('jobCreated', { detail: newJob }));

    toast.success('Job created successfully');
    closeJobCreationDialog();
  }, [defaultUserId, defaultOrganizationId, createJobHandler, closeJobCreationDialog]);

  // Unified handler that uses custom handler if set, otherwise uses default
  const handleJobCreate = useCallback(async (job: Partial<JobRequest> | null) => {
    const handler = (onSubmit && typeof onSubmit === 'function') ? onSubmit : defaultJobHandler;
    await handler(job);
  }, [onSubmit, defaultJobHandler]);

  return (
    <JobCreationContext.Provider
      value={{
        openJobCreationDialog,
        closeJobCreationDialog,
        setOnSubmit,
        handleJobCreate,
        isOpen,
        initialValues,
        onSubmit,
      }}
    >
      {children}
    </JobCreationContext.Provider>
  );
}

export function useJobCreation() {
  const context = useContext(JobCreationContext);
  if (context === undefined) {
    throw new Error('useJobCreation must be used within a JobCreationProvider');
  }
  return context;
}
