"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { toast } from "sonner";

export default function PreferencesTimezonePage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const [timezone, setTimezone] = useState("America/Edmonton");

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSave = () => {
    // TODO: Implement save logic with API
    toast.success("Timezone preference saved successfully");
  };

  return (
    <div className="w-full">
      <div className="mb-md">
        <H2 className="text-2xl mb-2">Timezone</H2>
        <Muted className="text-sm">
          Set your timezone for accurate time displays.
        </Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timezone Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
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

          <div className="pt-2">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

