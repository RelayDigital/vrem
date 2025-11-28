"use client";

import { H2 } from "@/components/ui/typography";
import { Customer } from "@/components/shared/tables/CustomersTable";
import { CustomerManagement } from "../../customer/CustomerManagement";
import { USE_MOCK_DATA } from "../../../../lib/utils";

interface CustomersViewProps {
  customers: Customer[];
}

export function CustomersView({ customers }: CustomersViewProps) {
  // Use empty array when mock data is disabled
  const displayCustomers = USE_MOCK_DATA ? customers : [];

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Customers</H2>
          <CustomerManagement customers={displayCustomers} />
        </div>
      </article>
    </main>
  );
}

