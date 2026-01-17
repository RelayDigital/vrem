'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { JobRequest } from '@/types';

interface DispatcherNavigationContextType {
  navigateToJobsView: () => void;
  navigateToMapView: () => void;
  navigateToCalendarView: () => void;
  navigateToJobInProjectManagement: (job: JobRequest) => void;
}

const DispatcherNavigationContext = createContext<DispatcherNavigationContextType | undefined>(undefined);

export function DispatcherNavigationProvider({ 
  children,
}: { 
  children: ReactNode;
}) {
  const router = useRouter();

  const navigateToJobsView = useCallback(() => {
    router.push('/jobs/all-jobs');
  }, [router]);

  const navigateToMapView = useCallback(() => {
    router.push('/map');
  }, [router]);

  const navigateToCalendarView = useCallback(() => {
    router.push('/calendar');
  }, [router]);

  const navigateToJobInProjectManagement = useCallback((job: JobRequest) => {
    router.push(`/jobs/${job.id}`);
  }, [router]);

  return (
    <DispatcherNavigationContext.Provider
      value={{
        navigateToJobsView,
        navigateToMapView,
        navigateToCalendarView,
        navigateToJobInProjectManagement,
      }}
    >
      {children}
    </DispatcherNavigationContext.Provider>
  );
}

export function useDispatcherNavigation() {
  const context = useContext(DispatcherNavigationContext);
  if (context === undefined) {
    throw new Error('useDispatcherNavigation must be used within a DispatcherNavigationProvider');
  }
  return context;
}

