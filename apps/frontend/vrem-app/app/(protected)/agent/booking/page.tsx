"use client";

import { useState } from "react";
import { AgentBookingFlow } from "@/components/features/agent";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useRouter } from "next/navigation";
import {
  technicians as initialTechnicians,
  organizations as initialOrganizations,
  preferredVendors as initialPreferredVendors,
  jobRequests as initialJobRequests,
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
  const [jobs, setJobs] = useState(initialJobRequests);

  const createJobRequest = (job: Partial<JobRequest>) => {
    // In a real app, this would call an API
    const newJob: JobRequest = {
      id: `job-${Date.now()}`,
      orderNumber: (jobs.length + 1).toString().padStart(4, "0"),
      organizationId: user?.organizationId || "org-client-001",
      clientName: job.clientName!,
      propertyAddress: job.propertyAddress!,
      location: job.location || { lat: 51.0447, lng: -114.0719 },
      scheduledDate: job.scheduledDate!,
      scheduledTime: job.scheduledTime!,
      mediaType: job.mediaType!,
      priority: job.priority || "standard",
      status: "pending",
      estimatedDuration: job.estimatedDuration || 120,
      requirements: job.requirements || "",
      createdBy: user?.id || "user-agent",
      createdAt: new Date(),
      propertyImage:
        job.propertyImage ||
        "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?w=800",
    };
    setJobs([newJob, ...jobs]);
    console.log("Job created:", newJob);
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
        createJobRequest(job);
        router.push("/agent/jobs");
      }}
      isAuthenticated={true}
      onLoginRequired={() => {}}
    />
  );
}
