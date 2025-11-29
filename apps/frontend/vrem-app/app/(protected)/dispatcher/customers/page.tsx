'use client';

import { useState } from 'react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { CustomersView } from '@/components/features/dispatcher/views/CustomersView';
import { Customer } from '@/components/shared/tables/CustomersTable';
import { TeamLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { USE_MOCK_DATA } from '@/lib/utils';

// Mock data - in a real app, this would come from an API
const mockCustomers: Customer[] = [
  { 
    id: 'cust-1', 
    name: 'Luxury Realty Group', 
    brokerage: 'Luxury Realty', 
    email: 'ops@luxuryrealty.com', 
    totalJobs: 18, 
    lastJob: '2025-11-10', 
    status: 'Active' 
  },
  { 
    id: 'cust-2', 
    name: 'Metro Properties', 
    brokerage: 'Metro', 
    email: 'hello@metro.com', 
    totalJobs: 11, 
    lastJob: '2025-11-08', 
    status: 'Active' 
  },
  { 
    id: 'cust-3', 
    name: 'Evergreen Estates', 
    brokerage: 'Evergreen', 
    email: 'info@evergreen.com', 
    totalJobs: 4, 
    lastJob: '2025-10-28', 
    status: 'Inactive' 
  },
  { 
    id: 'cust-4', 
    name: 'Summit Realty', 
    brokerage: 'Summit', 
    email: 'contact@summit.com', 
    totalJobs: 25, 
    lastJob: '2025-11-12', 
    status: 'Active' 
  },
  { 
    id: 'cust-5', 
    name: 'Coastal Properties', 
    brokerage: 'Coastal', 
    email: 'info@coastal.com', 
    totalJobs: 7, 
    lastJob: '2025-10-15', 
    status: 'Active' 
  },
];

export default function DispatcherCustomersPage() {
  const { user, isLoading } = useRequireRole(['dispatcher', 'ADMIN' as any, 'PROJECT_MANAGER' as any, 'EDITOR' as any]);
  const [customers] = useState(USE_MOCK_DATA ? mockCustomers : []);

  if (isLoading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return (
    <div className="w-full overflow-x-hidden h-full">
      <CustomersView customers={customers} />
    </div>
  );
}

