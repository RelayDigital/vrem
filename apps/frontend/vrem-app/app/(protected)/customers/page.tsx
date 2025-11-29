'use client';

import { useState, useEffect } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { CustomersView } from '@/components/features/dispatcher/views/CustomersView';
import { Customer } from '@/components/shared/tables/CustomersTable';
import { TeamLoadingSkeleton } from '@/components/shared/loading/DispatcherLoadingSkeletons';
import { AccessDenied } from '@/components/common/AccessDenied';

export default function CustomersPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    'dispatcher',
    'ADMIN',
    'PROJECT_MANAGER',
  ]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Load customers from backend
  useEffect(() => {
    // If auth is done and user is not allowed, stop loading immediately
    if (!isLoading && user && !isAllowed) {
      setLoadingCustomers(false);
      return;
    }

    // If still loading auth or no user, wait
    if (isLoading || !user) {
      return;
    }

    // Only load customers if user is allowed
    if (!isAllowed) {
      setLoadingCustomers(false);
      return;
    }

    const loadCustomers = async () => {
      try {
        // TODO: Replace with actual API endpoint when available
        // const customersData = await api.customers.list();
        // setCustomers(customersData);
        
        // For now, use empty array (backend will provide when endpoint is ready)
        setCustomers([]);
      } catch (error) {
        console.error('Failed to load customers:', error);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [user, isAllowed, isLoading]);

  if (isLoading || loadingCustomers) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by parent layout
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view customers. Please contact your administrator."
      />
    );
  }

  return (
    <div className="size-full overflow-x-hidden">
      <CustomersView customers={customers} />
    </div>
  );
}
