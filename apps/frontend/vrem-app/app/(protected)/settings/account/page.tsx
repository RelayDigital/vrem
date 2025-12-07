"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { api } from "@/lib/api";

export default function AccountPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.users.update(user.id, { name });
      toast.success("Account settings saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsRightContentSection
      id="account"
      title="Account"
      description="Manage your account settings and preferences."
      onSave={handleSave}
      isSaving={isSaving}
    >
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
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
