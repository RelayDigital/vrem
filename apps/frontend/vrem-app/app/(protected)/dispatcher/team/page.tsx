'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { TeamView } from '@/components/features/dispatcher/views/TeamView';
import { Photographer } from '@/types';
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { TeamLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';

export default function DispatcherTeamPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);
  const [photographers] = useState(initialPhotographers);

  if (isLoading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return (
    <div className="w-full overflow-x-hidden h-full">
      <TeamView photographers={photographers} />
    </div>
  );
}

