'use client';

import { useEffect, useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { AuditView } from '@/components/features/dispatcher/views/AuditView';
import { AuditLogEntry } from '@/types';
import { AuditLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { api } from '@/lib/api';

export default function DispatcherAuditPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLog = async () => {
      try {
        const dashboardData = await api.dashboard.get();
        setAuditLog(dashboardData.auditLog || []);
      } catch (error) {
        console.error('Failed to fetch audit log:', error);
        setAuditLog([]);
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAuditLog();
  }, []);

  if (isLoading || auditLoading) {
    return <AuditLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return (
    <div className="w-full overflow-x-hidden h-full">
      <AuditView auditLog={auditLog} />
    </div>
  );
}
