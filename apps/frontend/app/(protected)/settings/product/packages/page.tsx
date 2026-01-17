"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDenied } from "@/components/common/AccessDenied";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { PackagesManager } from "@/components/features/settings/PackagesManager";

export default function ProductPackagesPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "PROJECT_MANAGER",
  ]);
  const { isAllowed } = useRoleGuard([
    "COMPANY",
    "PROJECT_MANAGER",
  ]);

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null;
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to manage packages. Please contact your administrator."
      />
    );
  }

  return (
    <SettingsRightContentSection
      id="packages"
      title="Service Packages"
      description="Create and manage the service packages that agents can choose from when booking."
    >
      <PackagesManager />
    </SettingsRightContentSection>
  );
}
