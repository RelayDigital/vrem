'use client';

import { DashboardView } from '@/components/features/dashboard/DashboardView';
import { useRequireRole } from '@/hooks/useRequireRole';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { JobRequest, Technician, AuditLogEntry, Metrics } from '@/types';

export default function DashboardPage() {
    const { user, isLoading: isAuthLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);
    const [data, setData] = useState<{
        jobs: JobRequest[];
        photographers: Technician[];
        auditLog: AuditLogEntry[];
        metrics: Metrics;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading || !user) return;

        const fetchData = async () => {
            try {
                const dashboardData = await api.dashboard.get();
                setData(dashboardData);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, isAuthLoading]);

    if (isAuthLoading || isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user || !data) {
        return null; // Redirect handled by hook or error state
    }

    return (
        <DashboardView
            user={user}
            jobs={data.jobs}
            photographers={data.photographers}
            auditLog={data.auditLog}
            metrics={data.metrics}
        />
    );
}
