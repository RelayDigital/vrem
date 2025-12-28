"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { api } from "@/lib/api";
import { useTour } from "@/context/tour-context";
import { GraduationCap, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const {
    status: tourStatus,
    getOverallProgress,
    resetProgress: resetTourProgress,
    refetchStatus: refetchTourStatus,
  } = useTour();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingTour, setIsResettingTour] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  const tourProgress = getOverallProgress();
  const isTourComplete = tourStatus?.hasCompletedSetup ?? false;
  const isTourDismissed = tourStatus?.dismissedGuide ?? false;

  const handleRestartTour = async () => {
    setIsResettingTour(true);
    try {
      await resetTourProgress();
      await refetchTourStatus();
      toast.success("Setup guide has been reset");
      router.push('/dashboard');
    } catch (error) {
      toast.error("Failed to reset setup guide");
      console.error("Failed to reset tour:", error);
    } finally {
      setIsResettingTour(false);
    }
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.users.update(user.id, { name });
      toast.success("Account settings saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsRightContentSection
      id="account"
      title="Account"
      description="Manage your account settings and preferences."
      onSave={handleSave}
      isSaving={isSaving}
    >
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled
            className="bg-muted"
          />
          <Muted className="text-xs">Email cannot be changed</Muted>
        </div>

        {/* Setup Guide Section */}
        <div className="space-y-3 md:col-span-2 pt-4 border-t" data-tour="settings-tour-section">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <Label className="text-base">Setup Guide</Label>
            {isTourComplete && (
              <Badge variant="secondary" className="text-xs">
                Complete
              </Badge>
            )}
            {isTourDismissed && !isTourComplete && (
              <Badge variant="outline" className="text-xs">
                Dismissed
              </Badge>
            )}
          </div>

          {!isTourComplete && !isTourDismissed && (
            <div className="flex items-center gap-3">
              <Progress value={tourProgress.percentage} className="h-2 flex-1 max-w-xs" />
              <span className="text-sm text-muted-foreground">
                {tourProgress.completed}/{tourProgress.total} steps
              </span>
            </div>
          )}

          <Muted className="text-sm">
            {isTourComplete
              ? "You've completed the setup guide. You can restart it anytime to revisit the features."
              : isTourDismissed
              ? "You dismissed the setup guide. Restart it to learn about all the features."
              : "Complete the setup guide to learn about all the features of the platform."}
          </Muted>

          <Button
            variant={isTourComplete || isTourDismissed ? "default" : "outline"}
            size="sm"
            onClick={handleRestartTour}
            disabled={isResettingTour}
          >
            {isResettingTour ? (
              <Spinner className="h-4 w-4 mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            {isTourComplete || isTourDismissed ? "Restart Setup Guide" : "Reset Progress"}
          </Button>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
