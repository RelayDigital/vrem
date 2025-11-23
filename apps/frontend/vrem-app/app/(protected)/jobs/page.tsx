'use client';

import { JobsViewContainer } from '@/components/features/jobs/JobsViewContainer';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function JobsPage() {
    const { user, isLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return <JobsViewContainer user={user} />;
}
