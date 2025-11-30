"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { toast } from "sonner";
import { format } from "date-fns";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Label } from "@/components/ui/label";

export default function SecuritySessionsPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Mock session data
  const sessions = [
    {
      id: "1",
      device: "Chrome on macOS",
      location: "Calgary, Canada",
      lastActive: new Date(),
      current: true,
    },
    {
      id: "2",
      device: "Safari on iPhone",
      location: "Calgary, Canada",
      lastActive: new Date(Date.now() - 86400000),
      current: false,
    },
  ];

  const handleRevokeSession = (sessionId: string) => {
    // TODO: Implement revoke logic with API
    toast.success("Session revoked successfully");
  };

  return (
    <SettingsRightContentSection id="sessions" title="Sessions" description="Manage your active sessions and devices.">
      {/* Heading */}
      <div className="space-y-4">
        <Label>Active Sessions</Label>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="font-medium">{session.device}</div>
                <Muted className="text-xs">
                  {session.location} · Last active{" "}
                  {format(session.lastActive, "MMM d, yyyy 'at' h:mm a")}
                </Muted>
                {session.current && (
                  <span className="text-xs text-primary mt-1 block">
                    Current session
                  </span>
                )}
              </div>
              {!session.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </SettingsRightContentSection>
  );
}

