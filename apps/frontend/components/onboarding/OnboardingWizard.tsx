"use client";

import { useOnboarding } from "@/context/onboarding-context";
import { EmailStep } from "./steps/EmailStep";
import { OtpStep } from "./steps/OtpStep";
import { NameStep } from "./steps/NameStep";
import { MarketplaceStep } from "./steps/MarketplaceStep";
import { CalendarStep } from "./steps/CalendarStep";
import { InviteCodeStep } from "./steps/InviteCodeStep";
import { UseCaseStep } from "./steps/UseCaseStep";
import { PasswordStep } from "./steps/PasswordStep";
import { motion, AnimatePresence } from "framer-motion";

export function OnboardingWizard() {
  const { currentStep, error } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case "email":
        return <EmailStep />;
      case "otp":
        return <OtpStep />;
      case "name":
        return <NameStep />;
      case "marketplace":
        return <MarketplaceStep />;
      case "calendar":
        return <CalendarStep />;
      case "invite":
        return <InviteCodeStep />;
      case "usecases":
        return <UseCaseStep />;
      case "password":
        return <PasswordStep />;
      default:
        return <EmailStep />;
    }
  };

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Progress indicator */}
        <StepProgress />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Step content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepProgress() {
  const { currentStep, data } = useOnboarding();

  const steps = [
    "email",
    "otp",
    "name",
    "marketplace",
    "calendar",
    "invite",
    ...(data.accountType === "PROVIDER" ? ["usecases"] : []),
    "password",
  ];

  const currentIndex = steps.findIndex((s) => s === currentStep);
  const totalSteps = steps.length;

  return (
    <div className="mb-6 text-center">
      <span className="text-sm text-muted-foreground">
        {currentIndex + 1}/{totalSteps}
      </span>
    </div>
  );
}
