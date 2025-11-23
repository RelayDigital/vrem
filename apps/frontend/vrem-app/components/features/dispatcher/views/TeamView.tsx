"use client";

import { H2 } from "@/components/ui/typography";
import { Photographer } from "../../../../types";
import { PhotographerManagement } from "../../photographer";

interface TeamViewProps {
  photographers: Photographer[];
}

export function TeamView({ photographers }: TeamViewProps) {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md">
          <H2 className="text-4xl mb-xs">Team</H2>
          <PhotographerManagement photographers={photographers} />
        </div>
      </article>
    </main>
  );
}
