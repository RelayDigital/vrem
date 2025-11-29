"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const [email, setEmail] = useState(user?.email || "");

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSave = () => {
    // TODO: Implement save logic with API
    toast.success("Account settings saved successfully");
  };

  return (
    <div className="w-full">
      <div className="mb-md">
        <H2 className="text-2xl mb-2">Account</H2>
        <Muted className="text-sm">
          Manage your account settings and preferences.
        </Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
              className="bg-muted"
            />
            <Muted className="text-xs">Email cannot be changed</Muted>
          </div>

          <div className="pt-2">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

