'use client';

import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { dispatcherSettingsConfig } from '@/components/shared/settings/settings-config';
import { dispatcherSettingsComponents } from '@/components/features/dispatcher/settings';
import type { SettingsSubView } from '@/components/shared/settings';
import { SettingsLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';

export default function DispatcherSettingsPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);
  const router = useRouter();

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  const handleNavigate = (subView: SettingsSubView) => {
    if (subView === null) {
      router.push('/dispatcher/settings');
    } else {
      router.push(`/dispatcher/settings/${subView}`);
    }
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <SettingsView
        subView={null}
        onNavigate={handleNavigate}
        config={dispatcherSettingsConfig}
        accountType="dispatcher"
        componentRegistry={dispatcherSettingsComponents}
      />
    </div>
  );
}

