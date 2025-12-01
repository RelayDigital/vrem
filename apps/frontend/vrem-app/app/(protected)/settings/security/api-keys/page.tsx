"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDenied } from "@/components/common/AccessDenied";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Label } from "@/components/ui/label";

export default function SecurityApiKeysPage() {
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
        description="You do not have permission to view API keys. Please contact your administrator."
      />
    );
  }

  const handleCreateApiKey = () => {
    // TODO: Implement API key creation
    toast.info("API key creation dialog will open here");
  };

  return (
    <SettingsRightContentSection id="api-keys" title="API Keys" description="Manage your API keys for programmatic access.">
      {/* Heading */}
      <div className="space-y-4">
        <Label>API Keys</Label>
        <div className="space-y-3">
          <Muted className="text-sm">
            No API keys created yet. Create one to get started.
          </Muted>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}

