'use client';

import { AgentJobsView } from '@/components/features/agent/AgentJobsView';
import { useRequireRole } from '@/hooks/useRequireRole';
import { jobRequests, photographers } from '@/lib/mock-data';

export default function JobsPage() {
    const { user, isLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return <AgentJobsView jobs={jobRequests} photographers={photographers} organizationId={user.organizationId} onNewJobClick={() => { }} />;
}
