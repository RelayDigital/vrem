"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { TeamLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";

export default function OrganizationMembersPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    "dispatcher",
    "DISPATCHER",
    "PROJECT_MANAGER",
  ]);
  const router = useRouter();

  useEffect(() => {
    // Redirect to the canonical organization settings page
    if (!isLoading && isAllowed && user?.organizationId) {
      router.replace(`/organization/${user.organizationId}/settings`);
    }
  }, [isLoading, isAllowed, router, user?.organizationId]);

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

  return null;
}
