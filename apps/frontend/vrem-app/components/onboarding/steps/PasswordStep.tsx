"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useOnboarding } from "@/context/onboarding-context";
import { useAuth } from "@/context/auth-context";
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
  const { signUp, setActive } = useSignUp();
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

    if (!signUp || !setActive) {
      setError("Authentication not initialized. Please refresh the page.");
      return;
    }

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
      const accountType = data.accountType || "AGENT";

      // Split name into first and last name for Clerk
      const nameParts = data.name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Step 1: Create Clerk account
      const signUpResult = await signUp.create({
        emailAddress: data.email,
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          accountType,
          inviteCode: data.inviteCode || undefined,
          useCases: accountType === "PROVIDER" ? data.useCases : undefined,
        },
      });

      if (signUpResult.status === "complete") {
        // Set the active session
        await setActive({ session: signUpResult.createdSessionId });

        // Clear onboarding data from session storage
        sessionStorage.removeItem("onboarding_data");
        sessionStorage.removeItem("onboarding_return");

        // If user chose to connect calendar, start OAuth flow
        if (data.calendarConnected) {
          try {
            const { url } = await api.nylas.startOAuth("google", "dashboard");
            window.location.href = url;
            return;
          } catch (oauthErr) {
            console.error("Failed to start calendar OAuth:", oauthErr);
          }
        }

        // Redirect to dashboard
        router.push("/dashboard");
      } else if (signUpResult.status === "missing_requirements") {
        // Log what's missing for debugging
        console.log("Sign-up missing requirements:", {
          status: signUpResult.status,
          missingFields: signUpResult.missingFields,
          unverifiedFields: signUpResult.unverifiedFields,
          verifications: signUpResult.verifications,
        });

        // Handle different missing requirements
        if (signUpResult.unverifiedFields?.includes("email_address")) {
          setError("Email verification required. Please disable 'Verify at sign-up' for Email in Clerk dashboard.");
        } else if (signUpResult.missingFields?.length) {
          setError(`Missing required fields: ${signUpResult.missingFields.join(", ")}`);
        } else {
          setError(`Registration incomplete. Check Clerk dashboard settings. Missing: ${JSON.stringify(signUpResult.unverifiedFields || signUpResult.missingFields || "unknown")}`);
        }
      } else {
        console.log("Sign-up status:", signUpResult.status, signUpResult);
        setError(`Registration incomplete: ${signUpResult.status}`);
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      // Handle Clerk-specific errors
      if (err.errors) {
        const clerkError = err.errors[0];
        if (clerkError?.code === "form_identifier_exists") {
          setError("An account with this email already exists. Please log in instead.");
        } else {
          setError(clerkError?.message || "Registration failed. Please try again.");
        }
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Hidden CAPTCHA element for Clerk bot protection */}
      <div id="clerk-captcha" />

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
