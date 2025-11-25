'use client';

import { DashboardView } from '@/components/features/dashboard/DashboardView';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function DashboardPage() {
    const { user, isLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null; // Redirect handled by hook
    }

    return <DashboardView user={user} />;
}
