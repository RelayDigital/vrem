"use client";

import { useState } from "react";
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
import { ArrowLeft, Check, X, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export function PasswordStep() {
  const router = useRouter();
  const { data, prevStep, setIsLoading, setError, isLoading } = useOnboarding();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    {
      label: "Contains uppercase & lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
  ];

  const allRequirementsMet = passwordRequirements.every((r) => r.met);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const accountType = data.accountType || "AGENT"; // Default to AGENT if not set
      const result = await api.auth.registerOnboarding({
        otpToken: data.otpToken,
        email: data.email,
        name: data.name,
        password,
        accountType,
        inviteCode: data.inviteCode || undefined,
        useCases: accountType === "PROVIDER" ? data.useCases : undefined,
      });

      // Store token
      localStorage.setItem("token", result.token);

      // Set organization if available
      if (result.user.organizationId) {
        localStorage.setItem("organizationId", result.user.organizationId);
      }

      // Clear onboarding data from session storage
      sessionStorage.removeItem("onboarding_data");
      sessionStorage.removeItem("onboarding_return");

      // If user chose to connect calendar, start OAuth flow
      if (data.calendarConnected) {
        try {
          const { url } = await api.nylas.startOAuth("google", "dashboard");
          window.location.href = url;
          return; // Don't redirect to dashboard, OAuth will handle it
        } catch (oauthErr) {
          // If OAuth fails, just go to dashboard - they can connect later
          console.error("Failed to start calendar OAuth:", oauthErr);
        }
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <h1 className="text-2xl font-bold">Create your password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Choose a strong password to secure your account
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </Field>

        {/* Password requirements */}
        <div className="space-y-2">
          {passwordRequirements.map((req) => (
            <div
              key={req.label}
              className={`flex items-center gap-2 text-sm ${
                req.met ? "text-green-600" : "text-muted-foreground"
              }`}
            >
              {req.met ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {req.label}
            </div>
          ))}
        </div>

        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <FieldDescription className="text-destructive">
              Passwords do not match
            </FieldDescription>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !allRequirementsMet || !passwordsMatch}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </Field>

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
