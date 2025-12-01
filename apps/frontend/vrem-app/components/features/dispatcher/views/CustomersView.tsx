"use client";

import { H2 } from "@/components/ui/typography";
import { Customer } from "@/components/shared/tables/CustomersTable";
import { CustomerManagement } from "../../customer/CustomerManagement";

interface CustomersViewProps {
  customers: Customer[];
  isLoading?: boolean;
}

export function CustomersView({ customers, isLoading = false }: CustomersViewProps) {
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Customers</H2>
          <CustomerManagement customers={customers} isLoading={isLoading} />
        </div>
      </article>
    </main>
  );
}
