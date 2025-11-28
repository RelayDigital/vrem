"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AgentBookingFlow } from "@/components/features/agent";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useRouter } from "next/navigation";
import {
  technicians as initialTechnicians,
  organizations as initialOrganizations,
  preferredVendors as initialPreferredVendors,
} from "@/lib/mock-data";
import { JobRequest } from "@/types";

export default function AgentBookingPage() {
  const { user, isLoading } = useRequireRole([
    "AGENT",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();
  const [technicians] = useState(initialTechnicians);
  const [organizations] = useState(initialOrganizations);
  const [preferredVendors] = useState(initialPreferredVendors);
  const createJobRequest = async (job: Partial<JobRequest>) => {
    try {
      const project = await api.projects.create({
        address: job.propertyAddress || "",
        notes: job.requirements,
        scheduledTime:
          job.scheduledDate && job.scheduledTime
            ? new Date(`${job.scheduledDate}T${job.scheduledTime}`)
            : new Date(),
        agentId: user?.id,
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
    <AgentBookingFlow
      technicians={technicians}
      companies={organizations}
      preferredVendors={preferredVendors.map((v) => v.vendorId)}
      onJobCreate={(job) => {
        createJobRequest(job)
          .then(() => router.push("/agent/jobs"))
          .catch(() => {});
      }}
      isAuthenticated={true}
      onLoginRequired={() => {}}
    />
  );
}
