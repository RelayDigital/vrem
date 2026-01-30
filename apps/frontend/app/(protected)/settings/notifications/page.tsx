"use client";

import { useState, useEffect } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { toast } from "sonner";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { useUser } from "@clerk/nextjs";
import { AlertTriangle, Phone, CheckCircle2, Loader2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [jobAssignmentAlerts, setJobAssignmentAlerts] = useState(true);
  const [emailStatusChange, setEmailStatusChange] = useState(true);
  const [emailInvoice, setEmailInvoice] = useState(true);
  const [emailNewMessage, setEmailNewMessage] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Load notification preferences from API
  useEffect(() => {
    if (user) {
      api.notificationPreferences.get().then((prefs) => {
        setEmailNotifications(prefs.emailNewOrder);
        setJobAssignmentAlerts(prefs.emailProjectAssigned);
        setEmailStatusChange(prefs.emailStatusChange);
        setEmailInvoice(prefs.emailInvoice);
        setEmailNewMessage(prefs.emailNewMessage);
      }).catch(() => {});
    }
  }, [user]);

  // Phone number management
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneResource, setPhoneResource] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Get user's primary phone number from Clerk
  const primaryPhone = clerkUser?.primaryPhoneNumber;
  const hasPhoneNumber = !!primaryPhone;

  if (isLoading || !isClerkLoaded) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const handleSmsToggle = (enabled: boolean) => {
    if (enabled && !hasPhoneNumber) {
      // Show phone number input instead of enabling
      setIsAddingPhone(true);
      toast.info("Please add a phone number to enable SMS notifications");
      return;
    }
    setSmsNotifications(enabled);
  };

  const handleAddPhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    if (!clerkUser) {
      toast.error("User not loaded");
      return;
    }

    setIsSendingCode(true);
    try {
      // Create phone number in Clerk (this sends a verification code)
      const phone = await clerkUser.createPhoneNumber({ phoneNumber });
      setPhoneResource(phone);

      // Prepare verification
      await phone.prepareVerification();
      toast.success("Verification code sent to your phone");
    } catch (error: any) {
      console.error("Failed to add phone number:", error);
      const message =
        error.errors?.[0]?.message || error.message || "Failed to add phone number";
      toast.error(message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    if (!phoneResource) {
      toast.error("Phone number not found. Please try again.");
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the phone number
      await phoneResource.attemptVerification({ code: verificationCode });

      // Set as primary phone number
      await clerkUser?.update({
        primaryPhoneNumberId: phoneResource.id,
      });

      toast.success("Phone number verified and added successfully");
      setSmsNotifications(true);
      setIsAddingPhone(false);
      setPhoneNumber("");
      setVerificationCode("");
      setPhoneResource(null);
    } catch (error: any) {
      console.error("Failed to verify phone:", error);
      const message =
        error.errors?.[0]?.message || error.message || "Invalid verification code";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelAddPhone = () => {
    setIsAddingPhone(false);
    setPhoneNumber("");
    setVerificationCode("");
    setPhoneResource(null);
  };

  const handleSave = async () => {
    setIsSavingPrefs(true);
    try {
      await api.notificationPreferences.update({
        emailNewOrder: emailNotifications,
        emailOrderConfirmed: emailNotifications,
        emailProjectAssigned: jobAssignmentAlerts,
        emailStatusChange,
        emailDeliveryReady: emailNotifications,
        emailApprovalChange: emailNotifications,
        emailNewMessage,
        emailInvoice,
      });
      toast.success("Notification preferences saved successfully");
    } catch (error) {
      toast.error("Failed to save notification preferences");
    } finally {
      setIsSavingPrefs(false);
    }
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Muted className="text-xs block">
                Receive updates via email ({user.email})
              </Muted>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          {/* SMS Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <Muted className="text-xs block">
                  {hasPhoneNumber
                    ? `Receive urgent updates via SMS (${primaryPhone.phoneNumber})`
                    : "Receive urgent updates via SMS"}
                </Muted>
              </div>
              <Switch
                id="sms-notifications"
                checked={smsNotifications}
                onCheckedChange={handleSmsToggle}
                disabled={!hasPhoneNumber && !isAddingPhone}
              />
            </div>

            {/* Phone number required warning */}
            {!hasPhoneNumber && !isAddingPhone && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Phone number required
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Add a phone number to enable SMS notifications for urgent updates.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsAddingPhone(true)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Add Phone Number
                  </Button>
                </div>
              </div>
            )}

            {/* Add phone number form */}
            {isAddingPhone && (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <Label className="text-base">Add Phone Number</Label>
                </div>

                {!phoneResource ? (
                  // Step 1: Enter phone number
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone-input">Phone Number</Label>
                      <Input
                        id="phone-input"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <Muted className="text-xs">
                        Include country code (e.g., +1 for US/Canada)
                      </Muted>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddPhoneNumber}
                        disabled={isSendingCode || !phoneNumber.trim()}
                      >
                        {isSendingCode ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            Sending...
                          </>
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelAddPhone}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Step 2: Verify code
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Code sent to {phoneNumber}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleVerifyPhone}
                        disabled={isVerifying || !verificationCode.trim()}
                      >
                        {isVerifying ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            Verifying...
                          </>
                        ) : (
                          "Verify & Enable SMS"
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelAddPhone}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Phone number verified indicator */}
            {hasPhoneNumber && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                Phone number verified: {primaryPhone.phoneNumber}
              </div>
            )}
          </div>

          {/* Job Assignment Alerts */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="job-alerts">Job Assignment Alerts</Label>
              <Muted className="text-xs block">
                Notify when jobs are assigned to you
              </Muted>
            </div>
            <Switch
              id="job-alerts"
              checked={jobAssignmentAlerts}
              onCheckedChange={setJobAssignmentAlerts}
            />
          </div>

          {/* Status Change Notifications */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="status-change">Project Status Updates</Label>
              <Muted className="text-xs block">
                Notify when project status changes
              </Muted>
            </div>
            <Switch
              id="status-change"
              checked={emailStatusChange}
              onCheckedChange={setEmailStatusChange}
            />
          </div>

          {/* Invoice Notifications */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="invoice-notif">Invoice Notifications</Label>
              <Muted className="text-xs block">
                Notify about invoice activity
              </Muted>
            </div>
            <Switch
              id="invoice-notif"
              checked={emailInvoice}
              onCheckedChange={setEmailInvoice}
            />
          </div>

          {/* Message Notifications */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="message-notif">Message Notifications</Label>
              <Muted className="text-xs block">
                Notify when you receive new messages
              </Muted>
            </div>
            <Switch
              id="message-notif"
              checked={emailNewMessage}
              onCheckedChange={setEmailNewMessage}
            />
          </div>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
