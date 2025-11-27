'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { AuditView } from '@/components/features/dispatcher/views/AuditView';
import { AuditLogEntry } from '@/types';
import { auditLog as initialAuditLog } from '@/lib/mock-data';
import { AuditLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';

export default function DispatcherAuditPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'admin', 'project_manager']);
  const [auditLog] = useState(initialAuditLog);

  if (isLoading) {
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

