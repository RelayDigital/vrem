'use client';

import { ReactNode } from 'react';
import { useJobManagement } from '@/context/JobManagementContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface JobDataBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function JobsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`job-skeleton-${index}`}
          className="border rounded-lg p-4 space-y-3 bg-card"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function JobDataBoundary({ children, fallback }: JobDataBoundaryProps) {
  const { isLoadingJobs, jobsError, refreshJobs, jobs } = useJobManagement();
  const hasJobs = jobs.length > 0;

  if (isLoadingJobs && !hasJobs) {
    return <>{fallback ?? <JobsGridSkeleton />}</>;
  }

  if (jobsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load jobs</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{jobsError.message}</span>
          <Button variant="secondary" size="sm" onClick={refreshJobs}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}


