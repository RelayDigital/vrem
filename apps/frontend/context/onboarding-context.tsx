"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

export type OnboardingStep =
  | "email"
  | "otp"
  | "name"
  | "marketplace"
  | "calendar"
  | "invite"
  | "usecases"
  | "password";

export type AccountType = "AGENT" | "PROVIDER";

export type ProviderUseCase =
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "DRONE_AERIAL"
  | "VIRTUAL_TOURS"
  | "FLOOR_PLANS"
  | "EDITING"
  | "STAGING"
  | "MEASUREMENTS";

export interface PendingInvitation {
  id: string;
  token: string;
  organization: {
    id: string;
    name: string;
    logoUrl?: string;
    type: string;
  };
  role: string;
  inviteType: string;
}

export interface OnboardingData {
  email: string;
  otpToken: string;
  name: string;
  accountType: AccountType | null;
  calendarConnected: boolean;
  inviteCode: string;
  inviteOrganization?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  useCases: ProviderUseCase[];
  password: string;
  pendingInvitations: PendingInvitation[];
}

interface OnboardingContextType {
  currentStep: OnboardingStep;
  data: OnboardingData;
  setStep: (step: OnboardingStep) => void;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

const STEP_ORDER: OnboardingStep[] = [
  "email",
  "otp",
  "name",
  "marketplace",
  "calendar",
  "invite",
  "usecases",
  "password",
];

const initialData: OnboardingData = {
  email: "",
  otpToken: "",
  name: "",
  accountType: null,
  calendarConnected: false,
  inviteCode: "",
  inviteOrganization: undefined,
  useCases: [],
  password: "",
  pendingInvitations: [],
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("email");
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for invite code in URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const inviteCode = url.searchParams.get("invite") || url.searchParams.get("code");

    if (inviteCode && !data.inviteCode) {
      // Validate the invite code and pre-fill data
      api.organizations.validateInviteCode(inviteCode).then((result) => {
        if (result.valid && result.organization) {
          setData((prev) => ({
            ...prev,
            inviteCode,
            inviteOrganization: {
              id: result.organization!.id,
              name: result.organization!.name,
              logoUrl: result.organization!.logoUrl,
            },
            // Add to pending invitations for the banner
            pendingInvitations: [{
              id: "url-invite",
              token: inviteCode,
              organization: {
                id: result.organization!.id,
                name: result.organization!.name,
                logoUrl: result.organization!.logoUrl,
                type: result.organization!.type || "COMPANY",
              },
              role: result.role || "TECHNICIAN",
              inviteType: result.inviteType || "MEMBER",
            }],
          }));
        }
      }).catch((err) => {
        console.error("Failed to validate invite code from URL:", err);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    // Also persist to sessionStorage for OAuth return
    if (typeof window !== "undefined") {
      const newData = { ...data, ...updates };
      sessionStorage.setItem("onboarding_data", JSON.stringify(newData));
    }
  }, [data]);

  const setStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
    setError(null);
    // Update URL
    if (typeof window !== "undefined") {
      const stepIndex = STEP_ORDER.indexOf(step) + 1;
      const url = new URL(window.location.href);
      url.searchParams.set("step", stepIndex.toString());
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    let nextIndex = currentIndex + 1;

    // Skip usecases step for AGENT account type (or if not selected)
    if (STEP_ORDER[nextIndex] === "usecases" && data.accountType !== "PROVIDER") {
      nextIndex++;
    }

    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex]);
    }
  }, [currentStep, data.accountType, setStep]);

  const prevStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    let prevIndex = currentIndex - 1;

    // Skip usecases step when going back for AGENT account type (or if not selected)
    if (STEP_ORDER[prevIndex] === "usecases" && data.accountType !== "PROVIDER") {
      prevIndex--;
    }

    if (prevIndex >= 0) {
      setStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStep, data.accountType, setStep]);

  const canGoBack = STEP_ORDER.indexOf(currentStep) > 0;

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        data,
        setStep,
        updateData,
        nextStep,
        prevStep,
        canGoBack,
        isLoading,
        setIsLoading,
        error,
        setError,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
