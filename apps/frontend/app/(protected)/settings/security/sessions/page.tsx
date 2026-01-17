"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Label } from "@/components/ui/label";
import { useClerk, useSession } from "@clerk/nextjs";
import { SessionResource } from "@clerk/types";
import { Spinner } from "@/components/ui/spinner";
import { Monitor, Smartphone, Tablet, Globe, AlertCircle } from "lucide-react";

// Parse user agent to get device/browser info
function parseUserAgent(ua?: string): { device: string; icon: React.ReactNode } {
  if (!ua) {
    return { device: "Unknown device", icon: <Globe className="h-5 w-5" /> };
  }

  // Detect browser
  let browser = "Unknown browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  // Detect OS
  let os = "";
  if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";

  const device = os ? `${browser} on ${os}` : browser;

  // Detect device type for icon
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);

  let icon = <Monitor className="h-5 w-5" />;
  if (isMobile && !isTablet) icon = <Smartphone className="h-5 w-5" />;
  else if (isTablet) icon = <Tablet className="h-5 w-5" />;

  return { device, icon };
}

export default function SecuritySessionsPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);

  const { client } = useClerk();
  const { session: currentSession } = useSession();
  const [sessions, setSessions] = useState<SessionResource[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    if (client) {
      // Get active sessions from Clerk client
      setSessions(client.activeSessions || []);
      setIsLoadingSessions(false);
    }
  }, [client]);

  if (isLoading || isLoadingSessions) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleRevokeSession = async (session: SessionResource) => {
    setRevokingSessionId(session.id);
    try {
      await session.end();
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success("Session revoked successfully");
    } catch (error) {
      console.error("Failed to revoke session:", error);
      toast.error("Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    const otherSessions = sessions.filter((s) => s.id !== currentSession?.id);
    if (otherSessions.length === 0) {
      toast.info("No other sessions to revoke");
      return;
    }

    setIsRevokingAll(true);
    try {
      await Promise.all(otherSessions.map((s) => s.end()));
      setSessions((prev) => prev.filter((s) => s.id === currentSession?.id));
      toast.success(`Revoked ${otherSessions.length} session(s)`);
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
      toast.error("Failed to revoke some sessions");
    } finally {
      setIsRevokingAll(false);
    }
  };

  // Get current user agent for the current session
  const currentUserAgent =
    typeof window !== "undefined" ? navigator.userAgent : undefined;

  return (
    <SettingsRightContentSection
      id="sessions"
      title="Sessions"
      description="Manage your active sessions and devices."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Active Sessions ({sessions.length})</Label>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAllOtherSessions}
              disabled={isRevokingAll}
            >
              {isRevokingAll ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Revoking...
                </>
              ) : (
                "Revoke all other sessions"
              )}
            </Button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="flex items-center gap-2 p-4 border rounded-lg text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>No active sessions found</span>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isCurrent = session.id === currentSession?.id;
              // Use actual user agent for current session, placeholder for others
              const { device, icon } = parseUserAgent(
                isCurrent ? currentUserAgent : undefined
              );

              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isCurrent ? "border-primary/50 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">{icon}</div>
                    <div>
                      <div className="font-medium">{device}</div>
                      <Muted className="text-xs">
                        Last active{" "}
                        {session.lastActiveAt
                          ? formatDistanceToNow(new Date(session.lastActiveAt), {
                              addSuffix: true,
                            })
                          : "recently"}
                        {" · "}
                        Created{" "}
                        {format(new Date(session.createdAt), "MMM d, yyyy")}
                      </Muted>
                      {isCurrent && (
                        <span className="text-xs text-primary mt-1 block font-medium">
                          Current session
                        </span>
                      )}
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session)}
                      disabled={revokingSessionId === session.id}
                    >
                      {revokingSessionId === session.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        "Revoke"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SettingsRightContentSection>
  );
}
