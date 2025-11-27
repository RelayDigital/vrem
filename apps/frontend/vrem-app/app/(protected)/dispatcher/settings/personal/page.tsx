'use client';

import Link from 'next/link';
import { useRequireRole } from '@/hooks/useRequireRole';
import { SettingsView } from '@/components/shared/settings';
import { dispatcherSettingsConfig } from '@/components/shared/settings/settings-config';
import { dispatcherSettingsComponents } from '@/components/features/dispatcher/settings';
import { SettingsLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { useRouter } from 'next/navigation';
import type { SettingsSubView } from '@/components/shared/settings';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function DispatcherSettingsPersonalPage() {
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

  // Filter config to only show personal settings
  const personalConfig = {
    personal: dispatcherSettingsConfig.personal,
    account: [],
    product: [],
  };

  return (
    <div className="w-full overflow-x-hidden h-full">
      <div className="container relative mx-auto px-md pt-md">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dispatcher/settings">Settings</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Personal</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <SettingsView
        subView={null}
        onNavigate={handleNavigate}
        config={personalConfig}
        accountType="dispatcher"
        componentRegistry={dispatcherSettingsComponents}
      />
    </div>
  );
}

