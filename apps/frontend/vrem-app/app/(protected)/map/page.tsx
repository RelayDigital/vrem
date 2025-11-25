'use client';

import { MapViewContainer } from '@/components/features/map/MapViewContainer';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function MapPage() {
    const { user, isLoading } = useRequireRole(['PROJECT_MANAGER', 'TECHNICIAN']);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return <MapViewContainer user={user} />;
}
