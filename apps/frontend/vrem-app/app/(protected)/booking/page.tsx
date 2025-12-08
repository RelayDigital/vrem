"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { AgentBookingFlow, AgentJobData } from "@/components/features/agent/AgentBookingFlow";
import { Technician, Organization } from "@/types";
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

  // Determine if user is an agent
  const isAgent = user?.accountType?.toUpperCase() === "AGENT";

  // Fetch technicians and companies for the booking flow
  // Agents don't need technicians - they select a provider org instead
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user) return;

      setLoadingData(true);
      try {
        // Only fetch technicians for COMPANY users, not agents
        // Agents select a provider org via ProviderStep, not individual technicians
        if (!isAgent) {
          const techs = await fetchOrganizationTechnicians();
          if (!cancelled) {
            setTechnicians(techs);
          }
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
  }, [user, isAgent]);

  // Get preferred vendors (could be from user preferences or org settings)
  const preferredVendors = useMemo(() => {
    // For now, return empty array - can be populated from user/org settings
    return [];
  }, []);

  const handleJobCreate = async (job: AgentJobData) => {
    if (!user) {
      toast.error("Unable to create order. Please try again.");
      return;
    }

    // Agent flow requires a provider org
    if (!job.providerOrgId) {
      toast.error("Please select a service provider.");
      return;
    }

    try {
      // Build scheduled time ISO string from date and time
      const scheduledTime = job.scheduledDate && job.scheduledTime
        ? new Date(`${job.scheduledDate}T${job.scheduledTime}`).toISOString()
        : new Date().toISOString();

      // Create the order via API with providerOrgId for agent flow
      const result = await api.orders.create({
        // Agent flow: specify the provider org
        providerOrgId: job.providerOrgId,
        // Address - use parsed components from Mapbox, fallback to full address string
        addressLine1: job.addressLine1 || job.propertyAddress || "",
        city: job.city,
        region: job.region,
        postalCode: job.postalCode,
        countryCode: job.countryCode,
        lat: job.location?.lat,
        lng: job.location?.lng,
        // Scheduling
        scheduledTime,
        estimatedDuration: job.estimatedDuration || 120,
        // Service details
        mediaTypes: job.mediaType || [],
        priority: job.priority || "standard",
        notes: job.requirements || "",
      });

      const providerName = job.providerName || "the provider";
      toast.success(`Order created for ${providerName}. The job is now pending assignment.`);
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
