'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { dispatcherSettingsConfig } from '@/components/shared/settings/settings-config';
import { dispatcherSettingsComponents } from '@/components/features/dispatcher/settings';
import type { SettingsSubView } from '@/components/shared/settings';
import { SettingsLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';

export default function DispatcherSettingsSubViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  
  const subView = params?.subView as SettingsSubView;

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const handleNavigate = (view: SettingsSubView) => {
    if (view === null) {
      router.push('/dispatcher/settings');
    } else {
      router.push(`/dispatcher/settings/${view}`);
    }
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <SettingsView
        subView={subView}
        onNavigate={handleNavigate}
        config={dispatcherSettingsConfig}
        accountType="dispatcher"
        componentRegistry={dispatcherSettingsComponents}
      />
    </div>
  );
}

