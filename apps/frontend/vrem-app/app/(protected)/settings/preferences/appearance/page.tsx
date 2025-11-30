"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { useTheme } from "next-themes";
import { Muted } from "@/components/ui/typography";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { Moon, Sun, Monitor } from "lucide-react";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function PreferencesAppearancePage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const { theme, setTheme } = useTheme();

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <SettingsRightContentSection
      id="appearance"
      title="Appearance"
      description="Customize the look and feel of your interface."
    >
      <div className="space-y-4">
        <Label>Theme</Label>
        <div className="space-y-3">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  System
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Muted className="text-xs">
            Choose how the interface looks to you
          </Muted>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
