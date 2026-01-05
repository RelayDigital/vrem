'use client';

import { useState, useEffect } from 'react';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { CustomersView } from '@/components/features/company/views/CustomersView';
import { Customer } from '@/components/shared/tables/CustomersTable';
import { TeamLoadingSkeleton } from '@/components/shared/loading/CompanyLoadingSkeletons';
import { AccessDenied } from '@/components/common/AccessDenied';
import { api } from '@/lib/api';

export default function CustomersPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    'COMPANY',
    'ADMIN',
    'PROJECT_MANAGER',
  ]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        const customersData = await api.customers.list();
        setCustomers(customersData);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to load customers:', error);
        setCustomers([]);
        setLoadError('Unable to load customers');
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [user, isAllowed, isLoading]);

  // Layout already handles auth loading - if we reach here, user exists
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
      <CustomersView customers={customers} isLoading={loadingCustomers} />
      {loadError && (
        <div className="container relative mx-auto px-md pb-md text-sm text-destructive">
          {loadError}
        </div>
      )}
    </div>
  );
}
