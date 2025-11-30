"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function Security2FAPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleToggle2FA = (enabled: boolean) => {
    // TODO: Implement 2FA setup/disable logic
    if (enabled) {
      toast.info("2FA setup wizard will open here");
    } else {
      toast.success("2FA disabled successfully");
    }
    setTwoFactorEnabled(enabled);
  };

  return (
    <SettingsRightContentSection id="2fa" title="Two-Factor Authentication" description="Add an extra layer of security to your account.">
      <div className="space-y-4">
        <Label>2FA Settings</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="2fa">Enable Two-Factor Authentication</Label>
              <Muted className="text-xs block">
                Require a verification code in addition to your password
              </Muted>
            </div>
            <Switch
              id="2fa"
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
            />
          </div>

          {twoFactorEnabled && (
            <div className="pt-4 border-t">
              <Muted className="text-sm">
                2FA is enabled. Use your authenticator app to generate codes.
              </Muted>
            </div>
          )}
        </div>
      </div>
    </SettingsRightContentSection>
  );
}

