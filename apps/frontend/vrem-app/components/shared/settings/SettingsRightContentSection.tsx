"use client";

import { forwardRef, ReactNode } from "react";
import { H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SettingsRightContentSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  showBorder?: boolean;
  contentClassName?: string;
  noContentWrapper?: boolean;
  onSave?: () => void;
  saveButtonText?: string;
  isSaving?: boolean;
}

export const SettingsRightContentSection = forwardRef<
  HTMLDivElement,
  SettingsRightContentSectionProps
>(
  (
    {
      id,
      title,
      description,
      children,
      className,
      showBorder = true,
      contentClassName,
      noContentWrapper = false,
      onSave,
      saveButtonText = "Save Changes",
      isSaving = false,
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        id={id}
        className={cn("mb-md", showBorder && "border-b pb-md", className)}
      >
        {/* Heading */}
        <div className="mb-md flex flex-col sm:flex-row items-baseline justify-between">
          <H2 className="text-lg border-0">{title}</H2>
          {description && <Muted>{description}</Muted>}
        </div>

        {/* Content */}
        {noContentWrapper ? (
          children
        ) : (
          <div className={cn("grid grid-cols-1 gap-lg", contentClassName)}>
            {children}
            {/* Save Button */}
            {onSave && (
              <div className="flex justify-end">
                <Button onClick={onSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : saveButtonText || "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }
);

SettingsRightContentSection.displayName = "SettingsRightContentSection";
