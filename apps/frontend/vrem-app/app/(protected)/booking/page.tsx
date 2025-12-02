"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AgentBookingFlow } from "@/components/features/agent";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useRouter } from "next/navigation";
import { JobRequest, Organization, Technician } from "@/types";
import { fetchOrganizationTechnicians } from "@/lib/technicians";

export default function BookingPage() {
  const { user, isLoading } = useRequireRole([
    "AGENT",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [preferredVendors, setPreferredVendors] = useState<string[]>([]);
  const [, setLoadingData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        api.organizations.setActiveOrganization(user.organizationId || null);
        const [techs, memberships] = await Promise.all([
          fetchOrganizationTechnicians(),
          api.organizations.listMine(),
        ]);

        if (!cancelled) {
          setTechnicians(techs);
          const orgs = memberships
            .map((membership) => membership.organization)
            .filter((org): org is Organization => Boolean(org));
          setOrganizations(orgs);
          setPreferredVendors([]); // Placeholder until preferred vendors API exists
        }
      } catch (error) {
        console.error("Failed to load booking data:", error);
        if (!cancelled) {
          setTechnicians([]);
          setOrganizations([]);
          setPreferredVendors([]);
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
  const createJobRequest = async (job: Partial<JobRequest>) => {
    try {
      const project = await api.projects.create({
        address: job.propertyAddress || "",
        notes: job.requirements,
        scheduledTime:
            job.scheduledDate && job.scheduledTime
            ? new Date(`${job.scheduledDate}T${job.scheduledTime}`)
            : new Date(),
        projectManagerId: user?.id,
        orgId: user?.organizationId,
      });
      toast.success("Booking created");
      return api.mapProjectToJobCard(project);
    } catch (error) {
      console.error("Failed to create booking", error);
      toast.error("Failed to create booking");
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full overflow-x-hidden min-h-[calc(100vh-var(--header-h))]">
      <AgentBookingFlow
        technicians={technicians}
        companies={organizations}
        preferredVendors={preferredVendors}
        onJobCreate={(job) => {
          createJobRequest(job)
            .then(() => router.push("/jobs"))
            .catch(() => {});
        }}
        isAuthenticated={true}
        onLoginRequired={() => {}}
      />
    </div>
  );
}
