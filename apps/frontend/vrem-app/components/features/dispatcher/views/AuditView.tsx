"use client";

import { H2 } from "@/components/ui/typography";
import { AuditLogEntry } from "../../../../types";
import { AuditLog } from "../AuditLog";

interface AuditViewProps {
  auditLog: AuditLogEntry[];
}

export function AuditView({ auditLog }: AuditViewProps) {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md">
          <div className="flex justify-between w-full gap-2 mb-md">
            <H2 className="text-lg border-0">System Activity Audit Log</H2>
            <p className="text-sm text-muted-foreground">
              All system actions are timestamped and traceable to a user
              identity
            </p>
          </div>

          <AuditLog entries={auditLog} />
        </div>
      </article>
    </main>
  );
}
