"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDenied } from "@/components/common/AccessDenied";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Label } from "@/components/ui/label";
export default function ProductUsagePage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const { isAllowed } = useRoleGuard([
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view product settings. Please contact your administrator."
      />
    );
  }

  return (
    <SettingsRightContentSection
      id="usage"
      title="Usage"
      description="View and manage your usage statistics."
    >
      <div className="space-y-4">
        <Label>Usage Statistics</Label>
        <div className="space-y-3">
          <Muted className="text-sm">
            Usage statistics will be available here.
          </Muted>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
