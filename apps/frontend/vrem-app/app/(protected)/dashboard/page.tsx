'use client';

import { DashboardView } from '@/components/features/dashboard/DashboardView';
import { useRequireRole } from '@/hooks/useRequireRole';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { JobRequest, Technician, AuditLogEntry, Metrics, Project } from '@/types';

export default function DashboardPage() {
    const { user, isLoading: isAuthLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);
    const [data, setData] = useState<{
        projects: Project[];
        jobCards: JobRequest[];
        photographers: Technician[];
        auditLog: AuditLogEntry[];
        metrics: Metrics;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading || !user) return;

        const fetchData = async () => {
            try {
                const projects = await api.projects.listForCurrentUser();
                setData({
                    projects,
                    jobCards: projects.map((p) => api.mapProjectToJobCard(p)),
                    photographers: [],
                    auditLog: [],
                    metrics: getEmptyMetrics(user.organizationId),
                });
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
            projects={data.projects}
            jobCards={data.jobCards}
            photographers={data.photographers}
            auditLog={data.auditLog}
            metrics={data.metrics}
        />
    );
}

function getEmptyMetrics(organizationId?: string): Metrics {
    return {
        organizationId: organizationId || '',
        period: 'week',
        jobs: { total: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 },
        photographers: { active: 0, available: 0, utilization: 0 },
        technicians: { active: 0, available: 0, utilization: 0 },
        performance: { averageAssignmentTime: 0, averageDeliveryTime: 0, onTimeRate: 0, clientSatisfaction: 0 },
        revenue: { total: 0, perJob: 0 },
    };
}
