"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("code");
      setSuccess("Check your email for a verification code.");
    } catch (err: any) {
      console.error("Error sending reset code:", err);
      if (err.errors?.[0]?.message) {
        setError(err.errors[0].message);
      } else {
        setError("Failed to send reset code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "complete") {
        // Set the active session - this signs the user in
        await setActive({ session: result.createdSessionId });
        setSuccess("Password reset successful! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        console.log("Reset result:", result);
        setError("Password reset incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error("Error resetting password:", err);
      if (err.errors?.[0]?.message) {
        setError(err.errors[0].message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSuccess("A new code has been sent to your email.");
    } catch (err: any) {
      console.error("Error resending code:", err);
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          {step === "email" ? (
            <form onSubmit={handleSendCode}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Forgot your password?</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    Enter your email and we&apos;ll send you a code to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="text-red-500 text-sm font-medium text-center">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-600 text-sm font-medium text-center">
                    {success}
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>

                <Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Sending..." : "Send Reset Code"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Reset your password</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    Enter the code sent to {email} and your new password.
                  </p>
                </div>

                {error && (
                  <div className="text-red-500 text-sm font-medium text-center">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-600 text-sm font-medium text-center">
                    {success}
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Didn&apos;t receive a code?{" "}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="underline underline-offset-4 hover:text-foreground"
                      disabled={isLoading}
                    >
                      Resend
                    </button>
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>

                <Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </Field>

                <Field>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 w-full text-center"
                  >
                    Use a different email
                  </button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
