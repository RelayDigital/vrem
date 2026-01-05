"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
import { useAuth } from "@/context/auth-context";
import { GraduationCap, RotateCcw, AlertTriangle, UserX, Trash2, User2 } from "lucide-react";
import { AvatarUploader } from "@/components/shared/AvatarUploader";
import { ServicesEditor } from "@/components/shared/settings/ServicesEditor";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { user: clerkUser } = useUser();
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

  // Danger zone state
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDeactivateAccount = async () => {
    if (!deactivatePassword) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setIsDeactivating(true);
    try {
      await api.users.deactivateAccount(deactivatePassword);
      toast.success("Your account has been deactivated");
      setShowDeactivateDialog(false);
      setDeactivatePassword("");
      logout();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate account"
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      await api.users.deleteAccount(deletePassword);
      toast.success("Your account has been permanently deleted");
      setShowDeleteDialog(false);
      setDeletePassword("");
      logout();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Update backend database
      await api.users.update(user.id, { name });

      // Also sync name to Clerk
      if (clerkUser && name !== user.name) {
        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        await clerkUser.update({
          firstName,
          lastName,
        });
      }

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
        {/* Profile Picture */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <User2 className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base">Profile Picture</Label>
          </div>
          <AvatarUploader
            currentUrl={user.avatarUrl}
            fallback={user.name?.charAt(0).toUpperCase() || "U"}
            onUpload={async (url) => {
              // Update backend database
              await api.users.update(user.id, { avatarUrl: url });

              // Also sync to Clerk profile
              if (clerkUser) {
                try {
                  // Fetch the image and upload to Clerk
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const file = new File([blob], "avatar.jpg", { type: blob.type });
                  await clerkUser.setProfileImage({ file });
                } catch (error) {
                  console.warn("Failed to sync avatar to Clerk:", error);
                }
              }

              toast.success("Profile picture updated");
              window.location.reload();
            }}
            onRemove={async () => {
              // Update backend database
              await api.users.update(user.id, { avatarUrl: "" });

              // Also remove from Clerk profile
              if (clerkUser) {
                try {
                  await clerkUser.setProfileImage({ file: null });
                } catch (error) {
                  console.warn("Failed to remove avatar from Clerk:", error);
                }
              }

              toast.success("Profile picture removed");
              window.location.reload();
            }}
            size="lg"
          />
        </div>

        <div className="space-y-2 md:col-span-2 pt-4 border-t">
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

        {/* Services Section - Only for Provider accounts */}
        {user.accountType === "PROVIDER" && (
          <div className="md:col-span-2 pt-4 border-t">
            <ServicesEditor />
          </div>
        )}

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

        {/* Danger Zone Section */}
        <div className="space-y-4 md:col-span-2 pt-6 border-t border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <Label className="text-base text-destructive">Danger Zone</Label>
          </div>

          <Muted className="text-sm">
            These actions are irreversible. Please proceed with caution.
          </Muted>

          <div className="flex flex-col gap-3">
            {/* Deactivate Account */}
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Deactivate account</span>
                </div>
                <Muted className="text-xs mt-1">
                  Temporarily disable your account. You can reactivate it later.
                </Muted>
              </div>
              <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Deactivate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your account will be temporarily disabled. You won&apos;t be able to
                      log in until you reactivate it. Your data will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="deactivate-password" className="text-sm font-medium">
                      Enter your password to confirm
                    </Label>
                    <Input
                      id="deactivate-password"
                      type="password"
                      placeholder="Your password"
                      value={deactivatePassword}
                      onChange={(e) => setDeactivatePassword(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeactivatePassword("")}>
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDeactivateAccount}
                      disabled={isDeactivating || !deactivatePassword}
                    >
                      {isDeactivating ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : null}
                      Deactivate Account
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-sm text-destructive">Delete account</span>
                </div>
                <Muted className="text-xs mt-1">
                  Permanently delete your account and all associated data. This cannot be undone.
                </Muted>
              </div>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      Delete your account permanently?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account, personal workspace, and all
                      associated data will be permanently deleted. You will be removed from
                      all organizations you are a member of.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4 space-y-3">
                    <div className="p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm text-destructive font-medium">
                        Before proceeding, please note:
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li>All your projects in your personal workspace will be deleted</li>
                        <li>Your membership in organizations will be removed</li>
                        <li>You cannot be the sole owner of an organization</li>
                        <li>This action is immediate and irreversible</li>
                      </ul>
                    </div>
                    <div>
                      <Label htmlFor="delete-password" className="text-sm font-medium">
                        Enter your password to confirm
                      </Label>
                      <Input
                        id="delete-password"
                        type="password"
                        placeholder="Your password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletePassword("")}>
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || !deletePassword}
                    >
                      {isDeleting ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : null}
                      Delete Account Forever
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
