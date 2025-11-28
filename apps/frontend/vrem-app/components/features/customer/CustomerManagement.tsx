import { Card } from "../../ui/card";
import { CustomersTable, Customer } from "../../shared/tables/CustomersTable";
import { Users, TrendingUp, Briefcase } from "lucide-react";
import { StatsCard } from "../../shared/dashboard";
import { H2 } from "@/components/ui/typography";

interface CustomerManagementProps {
  customers: Customer[];
}

export function CustomerManagement({
  customers,
}: CustomerManagementProps) {
  const activeCustomers = customers.filter(
    (c) => c.status === "Active"
  );
  const totalJobs = customers.reduce((sum, c) => sum + c.totalJobs, 0);
  const avgJobsPerCustomer = customers.length > 0 ? totalJobs / customers.length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stats */}
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

      {/* Table */}
      <div className="@container md:col-span-3 mt-md">
        <div className="mb-md flex items-baseline justify-between">
          <H2 className="text-lg border-0">Customers</H2>
        </div>
        <div className="">
          <CustomersTable customers={customers} />
        </div>
      </div>
    </div>
  );
}

