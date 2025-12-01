"use client";

import { H2 } from "@/components/ui/typography";
import { AuditLogEntry } from "../../../../types";
import { AuditLog } from "../AuditLog";
import { P } from "@/components/ui/typography";
import { USE_MOCK_DATA } from "../../../../lib/utils";

interface AuditViewProps {
  auditLog: AuditLogEntry[];
  isLoading?: boolean;
}

export function AuditView({ auditLog, isLoading = false }: AuditViewProps) {
  // Use empty array when mock data is disabled
  const displayAuditLog = USE_MOCK_DATA ? auditLog : [];

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Audit Log</H2>
          <AuditLog entries={displayAuditLog} isLoading={isLoading} />
        </div>
      </article>
    </main>
  );
}
