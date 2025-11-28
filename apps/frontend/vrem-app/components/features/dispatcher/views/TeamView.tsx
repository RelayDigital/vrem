"use client";

import { H2 } from "@/components/ui/typography";
import { Photographer } from "../../../../types";
import { PhotographerManagement } from "../../photographer";
import { USE_MOCK_DATA } from "../../../../lib/utils";

interface TeamViewProps {
  photographers: Photographer[];
}

export function TeamView({ photographers }: TeamViewProps) {
  // Use empty array when mock data is disabled
  const displayPhotographers = USE_MOCK_DATA ? photographers : [];

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Team</H2>
          <PhotographerManagement photographers={displayPhotographers} />
        </div>
      </article>
    </main>
  );
}
