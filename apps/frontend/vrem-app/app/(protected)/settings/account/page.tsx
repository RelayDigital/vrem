"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function AccountPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "DISPATCHER",
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
    <SettingsRightContentSection
      id="account"
      title="Account"
      description="Manage your account settings and preferences."
      onSave={handleSave}
    >
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="space-y-2 md:col-span-2">
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
      </div>
    </SettingsRightContentSection>
  );
}
