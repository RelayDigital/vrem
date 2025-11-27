'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { agentSettingsConfig } from '@/components/shared/settings/settings-config';
import { agentSettingsComponents } from '@/components/features/agent/settings';
import type { SettingsSubView } from '@/components/shared/settings';

export default function AgentSettingsPage() {
  const { user, isLoading } = useRequireRole(['AGENT', 'ADMIN', 'PROJECT_MANAGER']);
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
        config={agentSettingsConfig}
        accountType="agent"
        componentRegistry={agentSettingsComponents}
      />
    </div>
  );
}

