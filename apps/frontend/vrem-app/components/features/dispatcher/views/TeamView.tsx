"use client";

import { H2 } from "@/components/ui/typography";
import { Technician } from "../../../../types";
import { TechnicianManagement } from "../../technician";

interface TeamViewProps {
  technicians: Technician[];
}

export function TeamView({ technicians }: TeamViewProps) {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Team</H2>
          <TechnicianManagement technicians={technicians} />
        </div>
      </article>
    </main>
  );
}
