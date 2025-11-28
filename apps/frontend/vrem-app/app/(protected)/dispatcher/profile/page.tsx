"use client";

import { useState, useEffect } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { H2, Muted } from "@/components/ui/typography";
import { toast } from "sonner";
import { format } from "date-fns";
import { LogOut } from "lucide-react";

interface Session {
  id: string;
  device: string;
  location?: string;
  lastUsed: Date;
  current?: boolean;
}

export default function ProfilePage() {
  const { user, isLoading } = useRequireRole([
    "ADMIN",
    "PROJECT_MANAGER",
    "dispatcher" as any,
    "TECHNICIAN",
    "EDITOR",
    "AGENT",
  ]);
  const { logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions] = useState<Session[]>([
    {
      id: "1",
      device: "MacBook Pro",
      location: "Calgary, AB, Canada",
      lastUsed: new Date(),
      current: true,
    },
    {
      id: "2",
      device: "iPhone 14",
      location: "Calgary, AB, Canada",
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "3",
      device: "Unknown Device",
      location: "Edmonton, AB, Canada",
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ]);

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const handleSave = () => {
    // TODO: Implement save logic
    toast.success("Profile updated successfully");
  };

  const handleToggleMFA = () => {
    setMfaEnabled(!mfaEnabled);
    toast.success(
      `Multi-factor authentication ${!mfaEnabled ? "enabled" : "disabled"}`
    );
  };

  const handleLogoutAll = () => {
    // TODO: Implement logout all sessions
    toast.success("Logged out of all devices");
  };

  const handleLogoutSession = (sessionId: string) => {
    // TODO: Implement logout single session
    toast.success("Session logged out");
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md">
          {/* Page Title */}
          <H2 className="text-4xl mb-md">Profile</H2>

          {/* Tabs */}
          <Tabs defaultValue="user" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="user">User</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>

            {/* User Tab */}
            <TabsContent value="user" className="space-y-6 mt-0">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <Muted className="text-xs">Email cannot be changed</Muted>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="pt-2">
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-12 mt-0">
              {/* Multi-factor Authentication */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-1">
                    Multi-factor authentication (MFA)
                  </h3>
                  <Muted className="text-sm">
                    Add an extra layer of security to your account by requiring
                    a second form of verification.
                  </Muted>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={mfaEnabled ? "default" : "secondary"}>
                    {mfaEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button
                    variant={mfaEnabled ? "outline" : "default"}
                    onClick={handleToggleMFA}
                  >
                    {mfaEnabled ? "Disable" : "Enable"} MFA
                  </Button>
                </div>
              </div>

              {/* Device Logout */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-1">
                    Log out of all devices
                  </h3>
                  <Muted className="text-sm">
                    Log out of all active sessions across all devices.
                  </Muted>
                </div>
                <div>
                  <Button variant="outline" onClick={handleLogoutAll}>
                    Log out all
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-6 mt-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-medium mb-1">
                    Active sessions
                  </h3>
                  <Muted className="text-sm">
                    Manage your active sessions across different devices.
                  </Muted>
                </div>
                <Button variant="outline" onClick={handleLogoutAll}>
                  Log out all sessions
                </Button>
              </div>

              <div className="space-y-0">
                {sessions.map((session, index) => (
                  <div key={session.id}>
                    <div className="flex items-center justify-between py-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {session.device}
                          </span>
                          {session.current && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        {session.location && (
                          <Muted className="text-xs">{session.location}</Muted>
                        )}
                        <Muted className="text-xs">
                          Last used:{" "}
                          {format(session.lastUsed, "MMM d, yyyy h:mm a")}
                        </Muted>
                      </div>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLogoutSession(session.id)}
                          className="ml-4"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Log out
                        </Button>
                      )}
                    </div>
                    {index < sessions.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </article>
    </main>
  );
}
