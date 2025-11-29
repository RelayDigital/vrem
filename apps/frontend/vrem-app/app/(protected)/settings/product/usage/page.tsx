"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDenied } from "@/components/common/AccessDenied";

export default function ProductUsagePage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const { isAllowed } = useRoleGuard([
    "dispatcher",
    "ADMIN",
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
    <div className="w-full">
      <div className="mb-md">
        <H2 className="text-2xl mb-2">Usage</H2>
        <Muted className="text-sm">
          View your product usage statistics and limits.
        </Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Muted className="text-sm">
            Usage statistics will be available here.
          </Muted>
        </CardContent>
      </Card>
    </div>
  );
}

