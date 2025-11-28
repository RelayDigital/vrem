'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { JobsLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';

export default function DispatcherJobsPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);

  useEffect(() => {
    // Redirect to /dispatcher/jobs/all by default
    router.replace('/dispatcher/projects/all');
  }, [router]);

  if (isLoading) {
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return null; // Will redirect
}

