"use client";

import { useRequireRole } from "@/hooks/useRequireRole";
import { H2, Muted } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";

export default function PhotographerOrganizationHome() {
  const { user, isLoading } = useRequireRole([
    "TECHNICIAN",
    "PHOTOGRAPHER" as any,
  ]);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) return null;

  return (
    <main className="w-full overflow-x-hidden h-full">
      <article className="p-6 space-y-4">
        <header className="flex flex-col gap-1">
          <Muted className="uppercase tracking-wide text-[11px]">
            Organization
          </Muted>
          <H2 className="text-2xl">Organization Home</H2>
          <Muted>View-only organization hub (coming soon).</Muted>
        </header>
        <Card className="p-6">
          <Muted>Photographers can view org context here. Management is disabled.</Muted>
        </Card>
      </article>
    </main>
  );
}
