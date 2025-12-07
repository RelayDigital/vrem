"use client";

import { useState, useEffect } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { TeamView } from "@/components/features/company/views/TeamView";
import { TeamLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";
import { Skeleton } from "@/components/ui/skeleton";
import { Technician } from "@/types";
import { fetchOrganizationTechnicians } from "@/lib/technicians";

export default function TeamPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    "COMPANY",
    "PROJECT_MANAGER",
  ]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Load team members from backend
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const technicians = await fetchOrganizationTechnicians();
        setTechnicians(technicians);
      } catch (error) {
        console.error("Failed to load team:", error);
        setTechnicians([]);
      } finally {
        setLoadingTeam(false);
      }
    };

    if (user && isAllowed) {
      loadTeam();
    }
  }, [user, isAllowed]);

  if (isLoading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirect handled by parent layout
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view team members. Please contact your administrator."
      />
    );
  }

  const TeamGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`team-skeleton-${index}`}
          className="border rounded-md p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="size-full overflow-x-hidden space-y-6">
      {loadingTeam ? (
        <TeamGridSkeleton />
      ) : (
        <TeamView technicians={technicians} currentUserId={user?.id} />
      )}
    </div>
  );
}
