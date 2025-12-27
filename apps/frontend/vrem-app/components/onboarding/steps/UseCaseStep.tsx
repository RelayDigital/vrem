"use client";

import { useOnboarding, ProviderUseCase } from "@/context/onboarding-context";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UseCaseOption {
  value: ProviderUseCase;
  label: string;
  icon: string;
}

const useCaseOptions: UseCaseOption[] = [
  { value: "PHOTOGRAPHY", label: "Photography", icon: "📷" },
  { value: "VIDEOGRAPHY", label: "Videography", icon: "🎬" },
  { value: "DRONE_AERIAL", label: "Drone/Aerial", icon: "🚁" },
  { value: "VIRTUAL_TOURS", label: "Virtual Tours", icon: "🏠" },
  { value: "FLOOR_PLANS", label: "Floor Plans", icon: "📐" },
  { value: "EDITING", label: "Editing", icon: "🖼️" },
  { value: "STAGING", label: "Virtual Staging", icon: "🛋️" },
  { value: "MEASUREMENTS", label: "Measurements", icon: "📏" },
];

export function UseCaseStep() {
  const { data, updateData, nextStep, prevStep, isLoading, setError } =
    useOnboarding();

  const toggleUseCase = (useCase: ProviderUseCase) => {
    const current = data.useCases;
    const newUseCases = current.includes(useCase)
      ? current.filter((u) => u !== useCase)
      : [...current, useCase];
    updateData({ useCases: newUseCases });
  };

  const handleContinue = () => {
    if (data.useCases.length === 0) {
      setError("Please select at least one service you provide");
      return;
    }
    nextStep();
  };

  return (
    <FieldGroup>
      <div className="flex flex-col items-center gap-2 text-center mb-6">
        <h1 className="text-2xl font-bold">What services do you offer?</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Select all the services you provide
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {useCaseOptions.map((option) => {
          const isSelected = data.useCases.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleUseCase(option.value)}
              disabled={isLoading}
              className={cn(
                "relative p-4 rounded-xl border-2 text-center transition-all",
                "hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
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
        {data.useCases.length} service{data.useCases.length !== 1 ? "s" : ""}{" "}
        selected
      </p>

      <Button
        type="button"
        className="w-full"
        onClick={handleContinue}
        disabled={isLoading || data.useCases.length === 0}
      >
        Continue
      </Button>

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
  );
}
