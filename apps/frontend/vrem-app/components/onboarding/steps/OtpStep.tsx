"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "@/context/onboarding-context";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpStep() {
  const {
    data,
    updateData,
    nextStep,
    prevStep,
    setIsLoading,
    setError,
    isLoading,
  } = useOnboarding();
  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start cooldown immediately when entering OTP step (OTP was just sent)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await api.otp.verify(data.email, code);

      // Check for pending invitations for this email
      let pendingInvitations: any[] = [];
      try {
        const invitationsResult = await api.organizations.getPendingInvitationsByEmail(data.email);
        pendingInvitations = invitationsResult.invitations || [];
      } catch (invErr) {
        // Non-critical - continue even if invitation check fails
        console.error("Failed to check pending invitations:", invErr);
      }

      // If there's a pending invitation and no invite code set yet, use the first one
      const firstInvite = pendingInvitations[0];
      const updates: any = {
        otpToken: result.token,
        pendingInvitations,
      };

      if (firstInvite && !data.inviteCode) {
        updates.inviteCode = firstInvite.token;
        updates.inviteOrganization = {
          id: firstInvite.organization.id,
          name: firstInvite.organization.name,
          logoUrl: firstInvite.organization.logoUrl,
        };
      }

      updateData(updates);
      nextStep();
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;

    setError(null);
    setResendCountdown(RESEND_COOLDOWN_SECONDS);

    // Clear any existing interval and start a new one
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await api.otp.send(data.email);
    } catch (err: any) {
      // Don't reset cooldown on error - prevent spam
      setError(err.message || "Failed to resend code");
    }
  };

  return (
    <FieldGroup>
      <div className="flex flex-col items-center gap-2 text-center mb-6">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm text-balance">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{data.email}</span>
        </p>
      </div>

      <Field>
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <FieldDescription className="text-center mt-4">
          Enter the verification code from your email
        </FieldDescription>
      </Field>

      <Field>
        <Button
          type="button"
          className="w-full"
          onClick={handleVerify}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </Button>
      </Field>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevStep}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={handleResend}
          disabled={resendCountdown > 0 || isLoading}
        >
          {resendCountdown > 0
            ? `Resend in ${resendCountdown}s`
            : "Resend code"}
        </Button>
      </div>
    </FieldGroup>
  );
}
