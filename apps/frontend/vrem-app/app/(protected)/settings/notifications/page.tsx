"use client";

import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";

export default function NotificationsPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [jobAssignmentAlerts, setJobAssignmentAlerts] = useState(true);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSave = () => {
    // TODO: Implement save logic with API
    toast.success("Notification preferences saved successfully");
  };

  return (
    <SettingsRightContentSection
      id="notifications"
      title="Notifications"
      description="Manage your notification preferences and alerts."
      onSave={handleSave}
    >
      <div className="space-y-4">
        <Label>Notification Preferences</Label>
        <div className="space-y-3">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Muted className="text-xs block">Receive updates via email</Muted>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <Muted className="text-xs block">
                Receive urgent updates via SMS
              </Muted>
            </div>
            <Switch
              id="sms-notifications"
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
            />
          </div>

          {/* Job Assignment Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="job-alerts">Job Assignment Alerts</Label>
              <Muted className="text-xs block">
                Notify when jobs are assigned
              </Muted>
            </div>
            <Switch
              id="job-alerts"
              checked={jobAssignmentAlerts}
              onCheckedChange={setJobAssignmentAlerts}
            />
          </div>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
