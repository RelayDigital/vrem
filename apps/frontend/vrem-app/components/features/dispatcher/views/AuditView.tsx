"use client";

import { H2 } from "@/components/ui/typography";
import { AuditLogEntry } from "../../../../types";
import { AuditLog } from "../AuditLog";
import { P } from "@/components/ui/typography";

interface AuditViewProps {
  auditLog: AuditLogEntry[];
}

export function AuditView({ auditLog }: AuditViewProps) {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Audit Log</H2>
          <AuditLog entries={auditLog} />
        </div>
      </article>
    </main>
  );
}
