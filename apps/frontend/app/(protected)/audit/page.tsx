"use client";

import { useState, useEffect } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { AuditView } from "@/components/features/company/views/AuditView";
import { AuditLogEntry } from "@/types";
import { api } from "@/lib/api";
import { TeamLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";

export default function AuditPage() {
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "COMPANY",
  ]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loadingAuditLog, setLoadingAuditLog] = useState(true);

  // Fetch audit log from dashboard API
  useEffect(() => {
    const loadAuditLog = async () => {
      try {
        const dashboardData = await api.dashboard.get();
        setAuditLog(dashboardData.auditLog || []);
      } catch (error) {
        console.error("Failed to load audit log:", error);
        setAuditLog([]);
      } finally {
        setLoadingAuditLog(false);
      }
    };

    if (user) {
      loadAuditLog();
    }
  }, [user]);

  // Layout already handles auth loading - if we reach here, user exists
  if (!user) {
    return null; // Redirect handled by hook
  }

  return <AuditView auditLog={auditLog} isLoading={loadingAuditLog} />;
}
