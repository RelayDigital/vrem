'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { TeamView } from '@/components/features/dispatcher/views/TeamView';
import { Photographer } from '@/types';
// TODO: replace with real photographer list from backend once users/technicians endpoint is implemented
import { photographers as initialPhotographers } from '@/lib/mock-data';
import { USE_MOCK_DATA } from '@/lib/utils';
import { TeamLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';

export default function DispatcherTeamPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const [photographers] = useState(USE_MOCK_DATA ? initialPhotographers : []);

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

