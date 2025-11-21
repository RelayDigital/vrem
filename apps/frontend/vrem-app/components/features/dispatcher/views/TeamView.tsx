"use client";

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
          <PhotographerManagement photographers={photographers} />
        </div>
      </article>
    </main>
  );
}
