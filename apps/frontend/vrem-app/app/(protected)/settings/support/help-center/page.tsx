"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Label } from "@/components/ui/label";

export default function SupportHelpCenterPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <SettingsRightContentSection
      id="help-center"
      title="Help Center"
      description="Access our comprehensive help center for guides, tutorials, and FAQs."
    >
      {/* Heading */}
      <div className="space-y-4">
        <Label>Documentation & Resources</Label>
        <div className="space-y-3">
          <Button variant="outline" className="w-full sm:w-auto">
            <BookOpen className="h-4 w-4 mr-2" />
            Open Help Center
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </SettingsRightContentSection>
  );
}
