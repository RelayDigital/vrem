"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { Muted } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Label } from "@/components/ui/label";

export default function SupportChangelogPage() {
  const { user, isLoading } = useRequireRole([
    "COMPANY",
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
  ]);

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null;
  }

  // Mock changelog data
  const changelog = [
    {
      version: "2.0.0",
      date: new Date(),
      type: "major",
      changes: [
        "New unified settings interface",
        "Improved navigation structure",
        "Enhanced role-based access control",
      ],
    },
    {
      version: "1.9.0",
      date: new Date(Date.now() - 7 * 86400000),
      type: "minor",
      changes: [
        "Added kanban board for job management",
        "Improved mobile responsiveness",
      ],
    },
  ];

  return (
    <SettingsRightContentSection
      id="changelog"
      title="Changelog"
      description="View recent updates and improvements to the platform."
    >
      {/* Heading */}
      <div className="space-y-4">
        <Label>Changelog</Label>
        {changelog.map((entry, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Version {entry.version}
                  <Badge
                    variant={entry.type === "major" ? "default" : "secondary"}
                  >
                    {entry.type}
                  </Badge>
                </CardTitle>
                <Muted className="text-xs">
                  {format(entry.date, "MMM d, yyyy")}
                </Muted>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {entry.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="text-sm">
                    {change}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsRightContentSection>
  );
}
