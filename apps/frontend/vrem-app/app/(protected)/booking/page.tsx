'use client';

import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useEffect } from 'react';

export default function BookingPage() {
    const { user, isLoading } = useRequireRole(['AGENT', 'ADMIN', 'PROJECT_MANAGER']);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/agent/booking');
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
