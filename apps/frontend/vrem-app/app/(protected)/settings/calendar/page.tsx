"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useSearchParams, useRouter } from "next/navigation";
import { Muted } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { api } from "@/lib/api";
import { DayOfWeek } from "@/types";
import {
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Info,
  Clock,
  Loader2,
  Calendar,
  Link2,
  Unlink,
  AlertCircle,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface IcsFeed {
  id: string;
  feedUrl: string;
  feedToken: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessAt: Date | null;
}

interface WorkHour {
  dayOfWeek: DayOfWeek;
  isEnabled: boolean;
  startTime: string;
  endTime: string;
}

interface AvailabilityData {
  status: {
    isAvailable: boolean;
    availabilityNote: string | null;
    autoDeclineBookings: boolean;
  };
  workHours: WorkHour[];
}

interface CalendarIntegration {
  id: string;
  provider: string;
  providerAccountId: string;
  calendarName: string | null;
  status: string;
  isWriteTarget: boolean;
  createdAt: string;
  lastSyncAt: string | null;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: "Monday",
  [DayOfWeek.TUESDAY]: "Tuesday",
  [DayOfWeek.WEDNESDAY]: "Wednesday",
  [DayOfWeek.THURSDAY]: "Thursday",
  [DayOfWeek.FRIDAY]: "Friday",
  [DayOfWeek.SATURDAY]: "Saturday",
  [DayOfWeek.SUNDAY]: "Sunday",
};

const DAYS_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export default function CalendarSettingsPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "PROVIDER",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const searchParams = useSearchParams();
  const router = useRouter();

  // AGENT users can connect calendars but don't need availability/work hours settings
  const isAgentUser = user?.accountType === "AGENT";
  const [icsFeed, setIcsFeed] = useState<IcsFeed | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Availability state
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);

  // Nylas calendar integration state
  const [nylasConfigured, setNylasConfigured] = useState(false);
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [workHours, setWorkHours] = useState<WorkHour[]>([]);

  // Handle OAuth callback params
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      toast.success("Calendar connected successfully!");
      // Clear the URL params
      router.replace("/settings/calendar", { scroll: false });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: "Failed to connect calendar. Please try again.",
        missing_params: "Invalid OAuth response. Please try again.",
      };
      toast.error(errorMessages[error] || "An error occurred");
      router.replace("/settings/calendar", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingFeed(true);
        setIsLoadingAvailability(true);
        setIsLoadingIntegrations(true);

        const [feed, availabilityData, nylasConfig, connectionStatus] = await Promise.all([
          api.calendarIntegrations.getIcsFeed(),
          api.availability.get(),
          api.nylas.isConfigured().catch(() => ({ configured: false })),
          api.nylas.getConnectionStatus().catch(() => ({ connected: false, integrations: [] })),
        ]);

        setIcsFeed(feed);
        setAvailability(availabilityData);
        setAvailabilityNote(availabilityData.status.availabilityNote || "");
        setWorkHours(availabilityData.workHours);
        setNylasConfigured(nylasConfig.configured);
        setCalendarIntegrations(connectionStatus.integrations || []);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Failed to load calendar settings");
      } finally {
        setIsLoadingFeed(false);
        setIsLoadingAvailability(false);
        setIsLoadingIntegrations(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleAvailabilityToggle = async (isAvailable: boolean) => {
    if (!availability) return;

    try {
      setIsSavingAvailability(true);
      const updated = await api.availability.updateStatus({
        isAvailable,
        availabilityNote: availabilityNote || null,
        autoDeclineBookings: availability.status.autoDeclineBookings,
      });
      setAvailability(updated);
      toast.success(isAvailable ? "You are now available" : "You are now unavailable");
    } catch (error) {
      console.error("Failed to update availability:", error);
      toast.error("Failed to update availability");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleAutoDeclineToggle = async (autoDecline: boolean) => {
    if (!availability) return;

    try {
      setIsSavingAvailability(true);
      const updated = await api.availability.updateStatus({
        isAvailable: availability.status.isAvailable,
        availabilityNote: availabilityNote || null,
        autoDeclineBookings: autoDecline,
      });
      setAvailability(updated);
      toast.success(autoDecline ? "Auto-decline enabled" : "Auto-decline disabled");
    } catch (error) {
      console.error("Failed to update auto-decline:", error);
      toast.error("Failed to update setting");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleSaveNote = async () => {
    if (!availability) return;

    try {
      setIsSavingAvailability(true);
      const updated = await api.availability.updateStatus({
        isAvailable: availability.status.isAvailable,
        availabilityNote: availabilityNote || null,
        autoDeclineBookings: availability.status.autoDeclineBookings,
      });
      setAvailability(updated);
      toast.success("Availability note saved");
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleWorkHourChange = (day: DayOfWeek, field: keyof WorkHour, value: any) => {
    setWorkHours((prev) =>
      prev.map((wh) =>
        wh.dayOfWeek === day ? { ...wh, [field]: value } : wh
      )
    );
  };

  const handleSaveWorkHours = async () => {
    try {
      setIsSavingAvailability(true);
      const updated = await api.availability.updateWorkHours(workHours);
      setAvailability(updated);
      setWorkHours(updated.workHours);
      toast.success("Work hours saved");
    } catch (error) {
      console.error("Failed to save work hours:", error);
      toast.error("Failed to save work hours");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  // Nylas OAuth handlers
  const handleConnectCalendar = async (provider: 'google' | 'microsoft') => {
    try {
      setIsConnecting(true);
      setShowConnectDialog(false);
      const { url } = await api.nylas.startOAuth(provider);
      // Open OAuth in new window/tab
      window.location.href = url;
    } catch (error) {
      console.error("Failed to start OAuth:", error);
      toast.error("Failed to start calendar connection");
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async (integrationId: string) => {
    try {
      setIsDisconnecting(integrationId);
      await api.nylas.disconnect(integrationId);
      setCalendarIntegrations((prev) =>
        prev.filter((i) => i.id !== integrationId)
      );
      toast.success("Calendar disconnected");
    } catch (error) {
      console.error("Failed to disconnect calendar:", error);
      toast.error("Failed to disconnect calendar");
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleSyncAllProjects = async () => {
    try {
      setIsSyncingAll(true);
      const result = await api.nylas.syncAllProjects();
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} job${result.synced > 1 ? 's' : ''} to your calendar`);
      } else if (result.synced === 0 && result.failed === 0) {
        toast.info("No jobs to sync - you may not have any scheduled jobs assigned");
      }
      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} job${result.failed > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error("Failed to sync all projects:", error);
      toast.error("Failed to sync jobs to calendar");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'google':
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="h-4 w-4" viewBox="0 0 23 23">
            <path fill="#f25022" d="M0 0h11v11H0z"/>
            <path fill="#00a4ef" d="M0 12h11v11H0z"/>
            <path fill="#7fba00" d="M12 0h11v11H12z"/>
            <path fill="#ffb900" d="M12 12h11v11H12z"/>
          </svg>
        );
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'google':
        return 'Google Calendar';
      case 'microsoft':
        return 'Microsoft Outlook';
      default:
        return provider || 'Calendar';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  if (isLoading || isLoadingFeed || isLoadingAvailability || isLoadingIntegrations) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleCopyUrl = async () => {
    if (!icsFeed?.feedUrl) return;

    try {
      await navigator.clipboard.writeText(icsFeed.feedUrl);
      setCopied(true);
      toast.success("Calendar URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleRegenerateFeed = async () => {
    try {
      setIsRegenerating(true);
      const newFeed = await api.calendarIntegrations.regenerateIcsFeed();
      setIcsFeed(newFeed);
      setShowRegenerateDialog(false);
      toast.success("Calendar URL regenerated successfully");
    } catch (error) {
      console.error("Failed to regenerate feed:", error);
      toast.error("Failed to regenerate calendar URL");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Availability Status Section - Hidden for AGENT users */}
      {!isAgentUser && (
        <SettingsRightContentSection
          id="availability-status"
          title="Availability Status"
          description="Control your overall availability for job assignments."
        >
          <div className="space-y-6">
            {/* Main Availability Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Available for work</Label>
                <Muted className="text-xs">
                  When disabled, you won't receive new job assignments.
                </Muted>
              </div>
              <Switch
                checked={availability?.status.isAvailable ?? true}
                onCheckedChange={handleAvailabilityToggle}
                disabled={isSavingAvailability}
              />
            </div>

            {/* Auto-decline Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-decline new assignments</Label>
                <Muted className="text-xs">
                  Automatically decline new job assignments when you're unavailable.
                </Muted>
              </div>
              <Switch
                checked={availability?.status.autoDeclineBookings ?? false}
                onCheckedChange={handleAutoDeclineToggle}
                disabled={isSavingAvailability}
              />
            </div>

            {/* Availability Note */}
            <div className="space-y-3">
              <Label htmlFor="availability-note">Availability Note</Label>
              <Textarea
                id="availability-note"
                placeholder="e.g., On vacation until Jan 15"
                value={availabilityNote}
                onChange={(e) => setAvailabilityNote(e.target.value)}
                className="resize-none"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={isSavingAvailability || availabilityNote === (availability?.status.availabilityNote || "")}
                >
                  {isSavingAvailability ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Note"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SettingsRightContentSection>
      )}

      {/* Work Hours Section - Hidden for AGENT users */}
      {!isAgentUser && (
        <SettingsRightContentSection
          id="work-hours"
          title="Work Hours"
          description="Set your regular working hours for each day of the week."
        >
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Schedule your availability</AlertTitle>
              <AlertDescription>
                Jobs will only be assigned during your working hours. Disable days you don't work.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {DAYS_ORDER.map((day) => {
                const dayWorkHour = workHours.find((wh) => wh.dayOfWeek === day);
                if (!dayWorkHour) return null;

                return (
                  <div
                    key={day}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                  >
                    <div className="w-28 flex items-center gap-3">
                      <Switch
                        checked={dayWorkHour.isEnabled}
                        onCheckedChange={(checked) =>
                          handleWorkHourChange(day, "isEnabled", checked)
                        }
                      />
                      <span className={dayWorkHour.isEnabled ? "font-medium" : "text-muted-foreground"}>
                        {DAY_LABELS[day]}
                      </span>
                    </div>

                    {dayWorkHour.isEnabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={dayWorkHour.startTime}
                          onChange={(e) =>
                            handleWorkHourChange(day, "startTime", e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayWorkHour.endTime}
                          onChange={(e) =>
                            handleWorkHourChange(day, "endTime", e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 text-muted-foreground text-sm">
                        Not working
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveWorkHours}
                disabled={isSavingAvailability}
              >
                {isSavingAvailability ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Work Hours"
                )}
              </Button>
            </div>
          </div>
        </SettingsRightContentSection>
      )}

      {/* Connected Calendars Section */}
      {nylasConfigured && (
        <SettingsRightContentSection
          id="connected-calendars"
          title="Connected Calendars"
          description="Connect your calendars to automatically sync job events."
        >
          <div className="space-y-6">
            {/* Info Alert */}
            <Alert>
              <Link2 className="h-4 w-4" />
              <AlertTitle>Two-way calendar sync</AlertTitle>
              <AlertDescription>
                When you're assigned to a job, it will automatically appear on your connected calendar.
                If someone modifies the event externally, we'll notify you of the change.
              </AlertDescription>
            </Alert>

            {/* Connected Calendars List */}
            {calendarIntegrations.length > 0 ? (
              <div className="space-y-3">
                <Label>Your connected calendars</Label>
                {calendarIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {getProviderIcon(integration.provider)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {getProviderName(integration.provider)}
                          {getStatusBadge(integration.status)}
                        </div>
                        <Muted className="text-xs">
                          {integration.providerAccountId || integration.calendarName || 'Connected calendar'}
                        </Muted>
                        {integration.lastSyncAt && (
                          <Muted className="text-xs">
                            Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                          </Muted>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncAllProjects}
                        disabled={isSyncingAll}
                      >
                        {isSyncingAll ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Jobs
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectCalendar(integration.id)}
                        disabled={isDisconnecting === integration.id}
                      >
                        {isDisconnecting === integration.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Unlink className="h-4 w-4 mr-2" />
                            Disconnect
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No calendars connected</p>
                <Muted className="text-sm">
                  Connect a calendar to automatically sync job events.
                </Muted>
              </div>
            )}

            {/* Connect Calendar Buttons */}
            <div className="space-y-3">
              <Label>Connect a calendar</Label>
              <div className="flex flex-wrap gap-2">
                <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={isConnecting}>
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 mr-2" />
                          Connect Calendar
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect Your Calendar</DialogTitle>
                      <DialogDescription>
                        Choose a calendar provider to connect. Your job assignments will automatically
                        sync to the connected calendar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-4"
                        onClick={() => handleConnectCalendar('google')}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="h-6 w-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <div className="text-left">
                            <div className="font-medium">Google Calendar</div>
                            <div className="text-sm text-muted-foreground">
                              Connect your Google account
                            </div>
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-4"
                        onClick={() => handleConnectCalendar('microsoft')}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="h-6 w-6" viewBox="0 0 23 23">
                            <path fill="#f25022" d="M0 0h11v11H0z"/>
                            <path fill="#00a4ef" d="M0 12h11v11H0z"/>
                            <path fill="#7fba00" d="M12 0h11v11H12z"/>
                            <path fill="#ffb900" d="M12 12h11v11H12z"/>
                          </svg>
                          <div className="text-left">
                            <div className="font-medium">Microsoft Outlook</div>
                            <div className="text-sm text-muted-foreground">
                              Connect your Microsoft account
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </SettingsRightContentSection>
      )}

      {/* Calendar Subscribe Section */}
      <SettingsRightContentSection
        id="calendar-subscribe"
        title="Calendar Subscribe URL"
        description="Subscribe to your job schedule using any calendar app that supports ICS feeds."
      >
        <div className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              Add this URL to your calendar app (Google Calendar, Apple Calendar, Outlook, etc.)
              to automatically see all your assigned jobs. The calendar will update automatically
              when jobs are added, changed, or removed.
            </AlertDescription>
          </Alert>

          {/* ICS Feed URL */}
          <div className="space-y-3">
            <Label htmlFor="ics-url">Your Calendar URL</Label>
            <div className="flex gap-2">
              <Input
                id="ics-url"
                type="text"
                value={icsFeed?.feedUrl || ""}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Muted className="text-xs">
              This URL is private and unique to you. Do not share it publicly.
            </Muted>
          </div>

          {/* Quick Add Buttons */}
          <div className="space-y-3">
            <Label>Add to Calendar</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (icsFeed?.feedUrl) {
                    // Google Calendar webcal subscription
                    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsFeed.feedUrl.replace('http://', 'webcal://').replace('https://', 'webcal://'))}`;
                    window.open(googleUrl, '_blank');
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (icsFeed?.feedUrl) {
                    // Open webcal:// URL for Apple Calendar and other apps
                    const webcalUrl = icsFeed.feedUrl.replace('http://', 'webcal://').replace('https://', 'webcal://');
                    window.location.href = webcalUrl;
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apple Calendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (icsFeed?.feedUrl) {
                    // Outlook web subscription
                    const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icsFeed.feedUrl)}&name=VREM%20Jobs`;
                    window.open(outlookUrl, '_blank');
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Outlook
              </Button>
            </div>
          </div>

          {/* Last Synced */}
          {icsFeed?.lastAccessAt && (
            <div className="text-sm text-muted-foreground">
              Last synced: {new Date(icsFeed.lastAccessAt).toLocaleString()}
            </div>
          )}

          {/* Regenerate URL */}
          <div className="pt-4 border-t">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label>Regenerate URL</Label>
                <Muted className="text-xs">
                  If you accidentally shared your calendar URL, regenerate it to create a new private link.
                  Your old URL will stop working immediately.
                </Muted>
              </div>
              <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Regenerate Calendar URL?</DialogTitle>
                    <DialogDescription>
                      This will create a new calendar URL. Your current URL will stop working immediately,
                      and you'll need to re-add the calendar in all your apps.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRegenerateFeed}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        "Regenerate URL"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </SettingsRightContentSection>

      
    </div>
  );
}
