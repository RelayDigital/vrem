'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { photographerSettingsConfig } from '@/components/shared/settings/settings-config';
import { photographerSettingsComponents } from '@/components/features/photographer/settings';
import type { SettingsSubView } from '@/components/shared/settings';

export default function PhotographerSettingsPage() {
  const { user, isLoading } = useRequireRole(['TECHNICIAN', 'photographer', 'ADMIN', 'PROJECT_MANAGER']);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return (
    <div className="w-full overflow-x-hidden h-full p-6">
      <SettingsView
        subView={settingsSubView}
        onNavigate={(subView) => setSettingsSubView(subView)}
        config={photographerSettingsConfig}
        accountType="photographer"
        componentRegistry={photographerSettingsComponents}
      />
    </div>
  );
}

