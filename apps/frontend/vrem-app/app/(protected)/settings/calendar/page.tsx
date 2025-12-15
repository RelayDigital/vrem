"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted, Small } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { api } from "@/lib/api";
import {
  Calendar,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Info,
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

interface IcsFeed {
  id: string;
  feedUrl: string;
  feedToken: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessAt: Date | null;
}

export default function CalendarSettingsPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const [icsFeed, setIcsFeed] = useState<IcsFeed | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  useEffect(() => {
    const fetchIcsFeed = async () => {
      try {
        setIsLoadingFeed(true);
        const feed = await api.calendarIntegrations.getIcsFeed();
        setIcsFeed(feed);
      } catch (error) {
        console.error("Failed to fetch ICS feed:", error);
        toast.error("Failed to load calendar settings");
      } finally {
        setIsLoadingFeed(false);
      }
    };

    if (user) {
      fetchIcsFeed();
    }
  }, [user]);

  if (isLoading || isLoadingFeed) {
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

      {/* Future: Connected Calendars Section */}
      {/* This section will be enabled when OAuth integrations are implemented */}
      {/*
      <SettingsRightContentSection
        id="connected-calendars"
        title="Connected Calendars"
        description="Connect your calendars to automatically push job events."
      >
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Calendar integrations coming soon</p>
          <Muted>
            Connect Google Calendar or Outlook to automatically add jobs to your calendar.
          </Muted>
        </div>
      </SettingsRightContentSection>
      */}
    </div>
  );
}
