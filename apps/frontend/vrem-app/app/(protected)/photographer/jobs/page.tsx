"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { JobsLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";

export default function PhotographerJobsPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireRole([
    "TECHNICIAN",
    "photographer",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);

  useEffect(() => {
    // Redirect to /photographer/jobs/all by default
    router.replace("/photographer/jobs/all");
  }, [router]);

  if (isLoading) {
    return <JobsLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by hook
  }

  return null; // Will redirect
}
