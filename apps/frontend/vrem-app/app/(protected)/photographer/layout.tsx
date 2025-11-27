'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { AppHeader } from '@/components/shared/layout/AppHeader';
import { Skeleton } from '@/components/ui/skeleton';

export default function PhotographerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useRequireRole(['TECHNICIAN', 'photographer', 'ADMIN', 'PROJECT_MANAGER']);

  if (isLoading) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-sm">
          <div className="w-full max-w-full py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return (
    <>
      {/* Header */}
      <AppHeader user={user} />
      
      {/* Main Content */}
      <main>
        {children}
      </main>
    </>
  );
}

