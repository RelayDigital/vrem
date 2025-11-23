'use client';

import { CalendarView } from '@/components/features/calendar/CalendarView';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function CalendarPage() {
    const { user, isLoading } = useRequireRole(['PROJECT_MANAGER', 'ADMIN']);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return <CalendarView />;
}
