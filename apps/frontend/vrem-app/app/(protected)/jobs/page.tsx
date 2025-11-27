'use client';

import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useEffect } from 'react';

export default function JobsPage() {
    const { user, isLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            // For agents, redirect to agent jobs route
            if (user.role === 'agent') {
                router.replace('/agent/jobs');
            } else {
                // For other roles, keep existing behavior (could be dispatcher jobs view)
                // For now, redirect to agent route as fallback
                router.replace('/agent/jobs');
            }
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return null;
}
