import { Card } from "../../ui/card";
import { CustomersTable, Customer } from "../../shared/tables/CustomersTable";
import { Users, TrendingUp, Briefcase } from "lucide-react";
import { StatsCard } from "../../shared/dashboard";
import { H2 } from "@/components/ui/typography";

interface CustomerManagementProps {
  customers: Customer[];
  isLoading?: boolean;
}

export function CustomerManagement({
  customers,
  isLoading = false,
}: CustomerManagementProps) {
  const activeCustomers = customers.filter(
    () => true
  );
  const totalJobs = customers.reduce((sum, c) => sum + (c.totalJobs || 0), 0);
  const avgJobsPerCustomer = customers.length > 0 ? totalJobs / customers.length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stats */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`customer-stats-skeleton-${index}`}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-16 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))
      ) : (
        <>
          <StatsCard
            icon={Users}
            value={activeCustomers.length}
            label="Active Customers"
            iconBgColor="bg-accent"
            iconColor="text-primary"
          />
          <StatsCard
            icon={Briefcase}
            value={totalJobs}
            label="Total Jobs"
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            icon={TrendingUp}
            value={avgJobsPerCustomer.toFixed(1)}
            label="Avg Jobs per Customer"
            iconBgColor="bg-emerald-100"
            iconColor="text-emerald-600"
          />
        </>
      )}

      {/* Table */}
      <div className="@container md:col-span-3 mt-md">
        <div className="mb-md flex items-baseline justify-between">
          <H2 className="text-lg border-0">Customers</H2>
        </div>
        <div className="">
          <CustomersTable customers={customers} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
