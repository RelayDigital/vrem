"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { AgentBookingFlow } from "@/components/features/agent/AgentBookingFlow";
import { JobRequest, Technician, Organization } from "@/types";
import { toast } from "sonner";
import { DashboardLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { api } from "@/lib/api";

export default function BookingPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "AGENT",
    "COMPANY",
  ]);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [companies, setCompanies] = useState<Organization[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch technicians and companies for the booking flow
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user) return;

      setLoadingData(true);
      try {
        // Fetch available technicians
        const techs = await fetchOrganizationTechnicians();
        if (!cancelled) {
          setTechnicians(techs);
        }

        // Fetch companies (organizations that can fulfill orders)
        // For now, use empty array - this can be expanded later
        if (!cancelled) {
          setCompanies([]);
        }
      } catch (error) {
        console.error("Failed to load booking data:", error);
        if (!cancelled) {
          setTechnicians([]);
          setCompanies([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Get preferred vendors (could be from user preferences or org settings)
  const preferredVendors = useMemo(() => {
    // For now, return empty array - can be populated from user/org settings
    return [];
  }, []);

  const handleJobCreate = async (job: Partial<JobRequest>) => {
    if (!user || !organizationId) {
      toast.error("Unable to create order. Please try again.");
      return;
    }

    try {
      // Build scheduled time ISO string from date and time
      const scheduledTime = job.scheduledDate && job.scheduledTime
        ? new Date(`${job.scheduledDate}T${job.scheduledTime}`).toISOString()
        : new Date().toISOString();

      // Create the order via API - use address as addressLine1
      const result = await api.orders.create({
        addressLine1: job.propertyAddress || "",
        lat: job.location?.lat,
        lng: job.location?.lng,
        scheduledTime,
        mediaTypes: job.mediaType || [],
        priority: job.priority || "standard",
        estimatedDuration: job.estimatedDuration || 120,
        notes: job.requirements || "",
        // Create a new customer with the client name
        newCustomer: {
          name: job.clientName || user.name || "Agent Booking",
        },
        projectManagerId: user.id,
      });

      toast.success("Order created successfully!");
      router.push(`/jobs/${result.project.id}`);
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create order"
      );
    }
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  if (isLoading || loadingData) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="size-full overflow-x-hidden">
      <AgentBookingFlow
        technicians={technicians}
        companies={companies}
        preferredVendors={preferredVendors}
        onJobCreate={handleJobCreate}
        isAuthenticated={true}
        onCancel={handleCancel}
      />
    </div>
  );
}
