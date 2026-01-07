"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ProviderUseCase =
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "DRONE_AERIAL"
  | "VIRTUAL_TOURS"
  | "FLOOR_PLANS"
  | "EDITING"
  | "STAGING"
  | "MEASUREMENTS";

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

interface ServicesEditorProps {
  className?: string;
}

export function ServicesEditor({ className }: ServicesEditorProps) {
  const [useCases, setUseCases] = useState<ProviderUseCase[]>([]);
  const [originalUseCases, setOriginalUseCases] = useState<ProviderUseCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial use cases
  useEffect(() => {
    const loadUseCases = async () => {
      try {
        const data = await api.users.getUseCases();
        setUseCases(data as ProviderUseCase[]);
        setOriginalUseCases(data as ProviderUseCase[]);
      } catch (error) {
        console.error("Failed to load use cases:", error);
        toast.error("Failed to load services");
      } finally {
        setIsLoading(false);
      }
    };

    loadUseCases();
  }, []);

  const toggleUseCase = (useCase: ProviderUseCase) => {
    setUseCases((current) =>
      current.includes(useCase)
        ? current.filter((u) => u !== useCase)
        : [...current, useCase]
    );
  };

  const hasChanges =
    JSON.stringify([...useCases].sort()) !==
    JSON.stringify([...originalUseCases].sort());

  const handleSave = async () => {
    if (useCases.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    setIsSaving(true);

    // Optimistically update - hide the save button
    const previousOriginal = [...originalUseCases];
    setOriginalUseCases([...useCases]);

    try {
      await api.users.updateUseCases(useCases);
      toast.success("Services updated successfully");
    } catch (error) {
      console.error("Failed to update use cases:", error);
      // Restore on error - show the save button again
      setOriginalUseCases(previousOriginal);
      toast.error(
        error instanceof Error ? error.message : "Failed to update services"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setUseCases(originalUseCases);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base">Services You Offer</Label>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-muted-foreground" />
        <Label className="text-base">Services You Offer</Label>
      </div>

      <Muted className="text-sm">
        Select all the services you provide. This helps clients find you for the
        right jobs.
      </Muted>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {useCaseOptions.map((option) => {
          const isSelected = useCases.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleUseCase(option.value)}
              disabled={isSaving}
              className={cn(
                "relative p-3 rounded-lg border-2 text-center transition-all",
                "hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
              <div className="text-xl mb-1">{option.icon}</div>
              <div className="text-xs font-medium">{option.label}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Muted className="text-sm">
          {useCases.length} service{useCases.length !== 1 ? "s" : ""} selected
        </Muted>

        {hasChanges && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || useCases.length === 0}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Services
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
