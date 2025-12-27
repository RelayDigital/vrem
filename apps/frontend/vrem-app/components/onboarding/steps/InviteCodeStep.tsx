"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "@/context/onboarding-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { api } from "@/lib/api";
import { ArrowLeft, Building2, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InviteCodeStep() {
  const { data, updateData, nextStep, prevStep, isLoading, setIsLoading } =
    useOnboarding();
  const [code, setCode] = useState(data.inviteCode);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    organization?: { id: string; name: string; logoUrl?: string };
  } | null>(null);
  const initializedRef = useRef(false);

  // Check if code was pre-filled (from URL or detected invitation)
  const wasPreFilled = data.pendingInvitations.length > 0 && data.inviteCode;

  // If code was pre-filled on mount, validate it immediately
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (data.inviteCode && data.inviteOrganization) {
      // Already validated from context
      setValidationResult({
        valid: true,
        organization: data.inviteOrganization,
      });
    }
  }, [data.inviteCode, data.inviteOrganization]);

  // Debounced validation for manual input
  useEffect(() => {
    // Skip if code matches pre-filled value and already validated
    if (code === data.inviteCode && validationResult?.valid) {
      return;
    }

    if (!code.trim()) {
      setValidationResult(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setValidating(true);
      try {
        const result = await api.organizations.validateInviteCode(code.trim());
        setValidationResult(result);
        if (result.valid && result.organization) {
          updateData({
            inviteCode: code.trim(),
            inviteOrganization: result.organization,
          });
        }
      } catch {
        setValidationResult({ valid: false });
      } finally {
        setValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [code, updateData, data.inviteCode, validationResult?.valid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const handleSkip = () => {
    updateData({ inviteCode: "", inviteOrganization: undefined });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <h1 className="text-2xl font-bold">Got an invite code?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            If someone invited you to join their organization, enter the code
            here
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="invite-code">Invite code (optional)</FieldLabel>
          <div className="relative">
            <Input
              id="invite-code"
              type="text"
              placeholder="Enter invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              className={cn(
                validationResult?.valid === true && "border-green-500",
                validationResult?.valid === false && code && "border-destructive"
              )}
            />
            {validating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!validating && validationResult?.valid && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
            )}
            {!validating && validationResult?.valid === false && code && (
              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
          <FieldDescription>
            Leave empty if you don&apos;t have one
          </FieldDescription>
        </Field>

        {/* Organization preview */}
        {validationResult?.valid && validationResult.organization && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              {validationResult.organization.logoUrl ? (
                <img
                  src={validationResult.organization.logoUrl}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">{validationResult.organization.name}</p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll join this organization
                </p>
              </div>
            </div>
            {wasPreFilled && (
              <div className="mt-3 pt-3 border-t flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  This invitation was detected from your email. You can change or remove it if needed.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Invalid code message */}
        {validationResult?.valid === false && code && (
          <p className="text-sm text-destructive text-center">
            This invite code is invalid or has expired
          </p>
        )}

        <Field>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || (code && !validationResult?.valid)}
          >
            {validationResult?.valid ? "Continue" : "Continue without code"}
          </Button>
        </Field>

        {code && !validationResult?.valid && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleSkip}
            disabled={isLoading}
          >
            Skip this step
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevStep}
          disabled={isLoading}
          className="self-start"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </FieldGroup>
    </form>
  );
}
