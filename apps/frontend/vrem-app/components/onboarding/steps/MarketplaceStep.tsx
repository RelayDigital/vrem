"use client";

import { useState } from "react";
import { useOnboarding, AccountType } from "@/context/onboarding-context";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleOption {
  value: AccountType;
  label: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    value: "AGENT",
    label: "I'm an Agent",
    description: "Book photoshoots for your property listings",
  },
  {
    value: "PROVIDER",
    label: "I'm a Provider",
    description: "Provide photography and media services",
  },
];

// Map org member roles to display names
const roleDisplayNames: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  TECHNICIAN: "Technician",
  EDITOR: "Editor",
};

export function MarketplaceStep() {
  const { data, updateData, nextStep, prevStep, isLoading } = useOnboarding();
  const [hoveredOption, setHoveredOption] = useState<AccountType | null>(null);

  // Get the first pending invitation if any
  const pendingInvite = data.pendingInvitations?.[0];

  const handleSelect = (accountType: AccountType) => {
    updateData({ accountType });
    nextStep();
  };

  // Show description for hovered option, or fall back to selected option
  const activeOption = hoveredOption || data.accountType;
  const activeDescription = activeOption
    ? roleOptions.find((opt) => opt.value === activeOption)?.description
    : "Hover over an option to learn more";

  return (
    <FieldGroup>
      {/* Pending invitation banner */}
      {pendingInvite && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                You've been invited to join{" "}
                <span className="text-primary">{pendingInvite.organization.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                as {roleDisplayNames[pendingInvite.role] || pendingInvite.role}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center mb-6">
        <h1 className="text-2xl font-bold">How will you use VREM?</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Select your role to customize your experience
        </p>
      </div>

      {/* Upwork-style horizontal toggle */}
      <div className="flex w-full rounded-lg border border-border overflow-hidden">
        {roleOptions.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            onMouseEnter={() => setHoveredOption(option.value)}
            onMouseLeave={() => setHoveredOption(null)}
            disabled={isLoading}
            className={cn(
              "flex-1 py-3.5 px-4 text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              index > 0 && "border-l border-border",
              data.accountType === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Dynamic description based on hover/selection */}
      <p className="text-xs text-muted-foreground text-center mt-3 h-4">
        {activeDescription}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={prevStep}
        disabled={isLoading}
        className="self-start mt-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </FieldGroup>
  );
}
