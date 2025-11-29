'use client';

import { AgentJobsView } from '@/components/features/agent/AgentJobsView';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useJobManagement } from '@/context/JobManagementContext';
import { useRouter } from 'next/navigation';

export default function AgentDashboardPage() {
  const { user, isLoading } = useRequireRole(['AGENT', 'ADMIN', 'PROJECT_MANAGER']);
  const router = useRouter();
  const jobManagement = useJobManagement();

  // TODO: wire to backend once we have a users/technicians endpoint
  const technicians: any[] = [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full overflow-x-hidden h-full">
      <AgentJobsView 
        jobs={jobManagement.jobCards} 
        technicians={technicians} 
        organizationId={user.organizationId} 
        onNewJobClick={() => router.push('/agent/booking')} 
      />
    </div>
  );
}

