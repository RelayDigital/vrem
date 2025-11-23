'use client';

import { AgentBookingFlow } from '@/components/features/agent';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useMockData } from '@/context/MockDataContext';
import { useRouter } from 'next/navigation';

export default function BookingPage() {
    const { user, isLoading } = useRequireRole(['AGENT']);
    const { photographers, organizations, preferredVendors, createJobRequest } = useMockData();
    const router = useRouter();

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <AgentBookingFlow
            photographers={photographers}
            companies={organizations}
            preferredVendors={preferredVendors.map((v) => v.vendorId)}
            onJobCreate={(job) => {
                createJobRequest(job);
                router.push('/jobs');
            }}
            isAuthenticated={true}
            onLoginRequired={() => { }}
        />
    );
}
