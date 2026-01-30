"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function SecurityPasswordPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const { user: clerkUser } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null;
  }

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    setIsSaving(true);
    try {
      await clerkUser?.updatePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const message = error.errors?.[0]?.message || error.message || "Failed to update password";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsRightContentSection
      id="password"
      title="Password"
      description="Change your account password."
      onSave={handleSave}
      saveButtonText="Update Password"
    >
      <div className="space-y-4">
        <Label>Change Password</Label>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
