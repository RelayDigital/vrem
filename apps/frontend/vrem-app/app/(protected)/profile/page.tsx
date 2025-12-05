"use client";

import { useMemo } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { ProfileEditor } from "@/components/common/forms/ProfileEditor";
import { ProviderProfile } from "@/types";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user, memberships, organizationId, isLoading } = useRequireRole([
    "PROVIDER",
    "TECHNICIAN",
    "COMPANY",
  ]);

  const provider: ProviderProfile | null = useMemo(() => {
    if (!user) return null;
    const membership =
      memberships.find((m) => m.orgId === organizationId) || memberships[0];

    const org = membership?.organization;
    return {
      id: user.id,
      userId: user.id,
      orgMemberId: membership?.id || "",
      orgId: membership?.orgId || organizationId || "",
      role: (membership?.orgRole || (membership as any)?.role || "TECHNICIAN") as any,
      name: user.name || "Provider",
      email: user.email || "",
      phone: org?.phone || "",
      isIndependent: !org || org.type === "PERSONAL",
      companyId: org?.type === "COMPANY" ? org.id : undefined,
      companyName: org?.type === "COMPANY" ? org.name : undefined,
      homeLocation: {
        lat: 51.0447,
        lng: -114.0719,
        address: {
          street: org?.addressLine1 || "",
          city: org?.city || "",
          stateProvince: org?.region || "",
          country: org?.countryCode || "",
          postalCode: org?.postalCode || "",
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
      status: "active",
      createdAt: new Date(),
      avatar: user.avatarUrl,
      bio: "",
      services: {
        photography: true,
        video: false,
        aerial: false,
        floorplan: false,
        measurement: false,
        twilight: false,
        editing: false,
        virtualStaging: false,
      },
      portfolio: [],
      certifications: [],
    };
  }, [user, memberships, organizationId]);

  if (isLoading || !provider) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="size-full overflow-x-hidden space-y-6">
      <ProfileEditor
        provider={provider}
        onSave={() => {
          toast.success("Profile updated");
        }}
      />
    </div>
  );
}
