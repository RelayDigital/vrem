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
import Link from "next/link";
import { BorderBeam } from "@/components/ui/border-beam";

export function EmailStep() {
  const { data, updateData, nextStep, setIsLoading, setError, isLoading } =
    useOnboarding();
  const [email, setEmail] = useState(data.email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First check if email is already registered
      const checkResult = await api.otp.checkEmail(email);
      if (checkResult.registered) {
        setError("This email is already registered. Please sign in instead.");
        setIsLoading(false);
        return;
      }

      // Send OTP
      await api.otp.send(email);
      updateData({ email });
      nextStep();
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <h1 className="text-2xl font-bold">Welcome to VREM</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email to get started
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            disabled={isLoading}
          />
          <FieldDescription>
            We&apos;ll send you a verification code
          </FieldDescription>
        </Field>

        <Field>
          <div className="relative">
            <Button type="submit" className="w-full" disabled={isLoading || !email}>
              {isLoading ? "Sending code..." : "Continue"}
            </Button>
            {email && !isLoading && (
              <BorderBeam size={40} duration={3} borderWidth={1.5} />
            )}
          </div>
        </Field>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
