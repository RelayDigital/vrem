"use client";

import { useState, useEffect } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { AuditView } from "@/components/features/dispatcher/views/AuditView";
import { AuditLogEntry } from "@/types";
import { api } from "@/lib/api";
import { TeamLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";

export default function AuditPage() {
  const { user, isLoading } = useRequireRole([
    "dispatcher",
    "ADMIN",
    "PROJECT_MANAGER",
    "EDITOR",
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

  if (isLoading || loadingAuditLog) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return <AuditView auditLog={auditLog} />;
}

