"use client";

import { useState, useEffect } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { TeamView } from "@/components/features/dispatcher/views/TeamView";
import { TeamLoadingSkeleton } from "@/components/shared/loading/DispatcherLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";
import { PageHeader } from "@/components/shared/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Technician } from "@/types";

export default function TeamPage() {
  const { user, isLoading, isAllowed } = useRoleGuard([
    "dispatcher",
    "ADMIN",
    "PROJECT_MANAGER",
  ]);
  const [photographers, setPhotographers] = useState<Technician[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Load team members from backend
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const members = await api.organizations.listMembers();
        const technicians = (members || [])
          .filter((m) => m.role === "TECHNICIAN" && m.user)
          .map((m) => {
            const memberUser = m.user!;
            const personalOrg = m.personalOrg;
            return {
              id: memberUser.id,
              name: memberUser.name || "Unnamed",
              email: memberUser.email || "",
              phone: personalOrg?.phone || "",
              organizationId: memberUser.organizationId,
              isIndependent: true,
              status: "active",
              homeLocation: {
                lat: 0,
                lng: 0,
                address: {
                  city: personalOrg?.city || "",
                  stateProvince: personalOrg?.region || "",
                  country: personalOrg?.countryCode || "",
                  postalCode: personalOrg?.postalCode || "",
                  street: personalOrg?.addressLine1 || "",
                },
              },
              availability: [],
              reliability: {
                totalJobs: 0,
                noShows: 0,
                lateDeliveries: 0,
                onTimeRate: 0,
                averageDeliveryTime: 0,
              },
              skills: {
                residential: 0,
                commercial: 0,
                aerial: 0,
                twilight: 0,
                video: 0,
              },
              rating: {
                overall: 0,
                count: 0,
                recent: [],
              },
              preferredClients: [],
              createdAt: new Date(),
              avatar: undefined,
              bio: "",
              services: {
                photography: true,
                video: false,
                aerial: false,
                twilight: false,
                editing: false,
                virtualStaging: false,
              },
              portfolio: [],
              certifications: [],
            } as Technician;
          });
        setPhotographers(technicians);
      } catch (error) {
        console.error("Failed to load team:", error);
        setPhotographers([]);
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
        <TeamView photographers={photographers} />
      )}
    </div>
  );
}
