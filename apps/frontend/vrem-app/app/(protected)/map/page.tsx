'use client';

import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useEffect } from 'react';

export default function MapPage() {
    const { user, isLoading } = useRequireRole(['PROJECT_MANAGER', 'TECHNICIAN', 'AGENT', 'ADMIN']);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            // For agents, redirect to agent map route
            if (user.role === 'AGENT') {
                router.replace('/agent/map');
            } else {
                // For other roles, keep existing behavior
                // For now, redirect to agent route as fallback
                router.replace('/agent/map');
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
