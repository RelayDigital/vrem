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

export default function SecurityApiKeysPage() {
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
        description="You do not have permission to view API keys. Please contact your administrator."
      />
    );
  }

  const handleCreateApiKey = () => {
    // TODO: Implement API key creation
    toast.info("API key creation dialog will open here");
  };

  return (
    <div className="w-full">
      <div className="mb-md flex items-center justify-between">
        <div>
          <H2 className="text-2xl mb-2">API Keys</H2>
          <Muted className="text-sm">
            Manage your API keys for programmatic access.
          </Muted>
        </div>
        <Button onClick={handleCreateApiKey}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <Muted className="text-sm">
            No API keys created yet. Create one to get started.
          </Muted>
        </CardContent>
      </Card>
    </div>
  );
}

