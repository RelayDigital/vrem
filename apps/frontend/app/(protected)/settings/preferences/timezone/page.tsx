"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function PreferencesTimezonePage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const [timezone, setTimezone] = useState("America/Edmonton");

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null;
  }

  const handleSave = () => {
    // TODO: Implement save logic with API
    toast.success("Timezone preference saved successfully");
  };

  return (
    <SettingsRightContentSection id="timezone" title="Timezone" description="Set your timezone for accurate time displays." onSave={handleSave}>
      <div className="space-y-4">
        <Label>Timezone</Label>
        <div className="space-y-3">
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Edmonton">
                  America/Edmonton (MST)
                </SelectItem>
                <SelectItem value="America/Toronto">
                  America/Toronto (EST)
                </SelectItem>
                <SelectItem value="America/Vancouver">
                  America/Vancouver (PST)
                </SelectItem>
                <SelectItem value="America/New_York">
                  America/New_York (EST)
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  America/Los_Angeles (PST)
                </SelectItem>
                <SelectItem value="America/Chicago">
                  America/Chicago (CST)
                </SelectItem>
                <SelectItem value="America/Denver">
                  America/Denver (MST)
                </SelectItem>
              </SelectContent>
            </Select>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
