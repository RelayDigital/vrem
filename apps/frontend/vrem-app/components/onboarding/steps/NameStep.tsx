"use client";

import { useState } from "react";
import { useOnboarding } from "@/context/onboarding-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ArrowLeft } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";

export function NameStep() {
  const { data, updateData, nextStep, prevStep, isLoading } = useOnboarding();
  const [name, setName] = useState(data.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateData({ name: name.trim() });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <h1 className="text-2xl font-bold">What&apos;s your name?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            This is how you&apos;ll appear to others
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            disabled={isLoading}
          />
        </Field>

        {/* Avatar preview */}
        {name.trim() && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg">
              {name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{name.trim()}</p>
              <p className="text-xs text-muted-foreground">Profile preview</p>
            </div>
          </div>
        )}

        <Field>
          <div className="relative">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !name.trim()}
            >
              Continue
            </Button>
            {name.trim() && !isLoading && (
              <BorderBeam size={40} duration={3} borderWidth={1.5} />
            )}
          </div>
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
