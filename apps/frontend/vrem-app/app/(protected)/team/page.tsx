'use client';

import { useState, useEffect } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { TeamView } from '@/components/features/dispatcher/views/TeamView';
import { TeamLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { AccessDenied } from '@/components/common/AccessDenied';

export default function TeamPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    'dispatcher',
    'ADMIN',
    'PROJECT_MANAGER',
  ]);
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Load team members from backend
  useEffect(() => {
    const loadTeam = async () => {
      try {
        // TODO: Replace with actual API endpoint when available
        // const teamData = await api.team.list();
        // setPhotographers(teamData);
        
        // For now, use empty array (backend will provide when endpoint is ready)
        setPhotographers([]);
      } catch (error) {
        console.error('Failed to load team:', error);
        setPhotographers([]);
      } finally {
        setLoadingTeam(false);
      }
    };

    if (user && isAllowed) {
      loadTeam();
    }
  }, [user, isAllowed]);

  if (isLoading || loadingTeam) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by parent layout
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view team members. Please contact your administrator."
      />
    );
  }

  return (
    <div className="size-full overflow-x-hidden">
      <TeamView photographers={photographers} />
    </div>
  );
}
