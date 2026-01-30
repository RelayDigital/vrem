"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { GalleryVerticalEnd, Check, ArrowRight, Camera, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

type AccountType = "AGENT" | "PROVIDER";
type ProviderUseCase =
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "DRONE_AERIAL"
  | "VIRTUAL_TOURS"
  | "FLOOR_PLANS"
  | "EDITING"
  | "STAGING"
  | "MEASUREMENTS";

const useCaseOptions: { value: ProviderUseCase; label: string; icon: string }[] = [
  { value: "PHOTOGRAPHY", label: "Photography", icon: "📷" },
  { value: "VIDEOGRAPHY", label: "Videography", icon: "🎬" },
  { value: "DRONE_AERIAL", label: "Drone/Aerial", icon: "🚁" },
  { value: "VIRTUAL_TOURS", label: "Virtual Tours", icon: "🏠" },
  { value: "FLOOR_PLANS", label: "Floor Plans", icon: "📐" },
  { value: "EDITING", label: "Editing", icon: "🖼️" },
  { value: "STAGING", label: "Virtual Staging", icon: "🛋️" },
  { value: "MEASUREMENTS", label: "Measurements", icon: "📏" },
];

export default function AccountTypeOnboardingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [useCases, setUseCases] = useState<ProviderUseCase[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"type" | "usecases">("type");

  // Redirect if not signed in
  if (isLoaded && !isSignedIn) {
    router.replace("/sign-up");
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const toggleUseCase = (useCase: ProviderUseCase) => {
    setUseCases((prev) =>
      prev.includes(useCase)
        ? prev.filter((u) => u !== useCase)
        : [...prev, useCase]
    );
  };

  const handleAccountTypeSelect = (type: AccountType) => {
    setAccountType(type);
    if (type === "PROVIDER") {
      setStep("usecases");
    } else {
      // AGENT - submit directly
      handleSubmit(type);
    }
  };

  const handleSubmit = async (type?: AccountType) => {
    const finalType = type || accountType;
    if (!finalType) return;

    setIsSubmitting(true);
    try {
      await api.auth.completeOnboarding({
        accountType: finalType,
        useCases: finalType === "PROVIDER" ? useCases : undefined,
      });
      toast.success("Welcome! Your account is ready.");
      // Force a full page reload to reinitialize auth context with updated user data
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete setup"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <div className="flex justify-center gap-2 p-6 md:p-10 md:justify-start">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          VX Media
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {step === "type" ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome! How will you use VREM?</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Select your role to get started
                </p>
              </div>

              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => handleAccountTypeSelect("AGENT")}
                  disabled={isSubmitting}
                  className={cn(
                    "relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    accountType === "AGENT"
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">I'm a Real Estate Agent</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Book photoshoots and media services for your property listings
                    </p>
                  </div>
                  {isSubmitting && accountType === "AGENT" && (
                    <Spinner className="w-5 h-5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleAccountTypeSelect("PROVIDER")}
                  disabled={isSubmitting}
                  className={cn(
                    "relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    accountType === "PROVIDER"
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">I'm a Media Provider</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Provide photography, videography, and other media services
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Use cases step for providers */
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">What services do you offer?</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Select all the services you provide
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {useCaseOptions.map((option) => {
                  const isSelected = useCases.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleUseCase(option.value)}
                      disabled={isSubmitting}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-center transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="text-sm font-medium">{option.label}</div>
                    </button>
                  );
                })}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {useCases.length} service{useCases.length !== 1 ? "s" : ""} selected
              </p>

              <Button
                className="w-full"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || useCases.length === 0}
              >
                {isSubmitting ? (
                  <Spinner className="w-4 h-4 mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Get Started
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("type");
                  setAccountType(null);
                }}
                disabled={isSubmitting}
                className="self-start"
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
