"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { TeamLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";

export default function OrganizationMembersPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    "COMPANY",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();

  useEffect(() => {
    // Redirect to the Team page which has full member management
    if (!isLoading && isAllowed) {
      router.replace("/team");
    }
  }, [isLoading, isAllowed, router]);

  if (isLoading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view organization settings. Please contact your administrator."
      />
    );
  }

  return <TeamLoadingSkeleton />;
}
