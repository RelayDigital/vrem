"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";

export default function SupportHelpCenterPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-md">
        <H2 className="text-2xl mb-2">Help Center</H2>
        <Muted className="text-sm">
          Find answers to common questions and learn how to use the platform.
        </Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentation & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Muted className="text-sm">
              Access our comprehensive help center for guides, tutorials, and
              FAQs.
            </Muted>
            <Button variant="outline" className="w-full sm:w-auto">
              <BookOpen className="h-4 w-4 mr-2" />
              Open Help Center
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

