"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import { ProfileEditor } from "@/components/common/forms/ProfileEditor";
import { ProviderProfile } from "@/types";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, memberships, organizationId, isLoading } = useRequireRole([
    "PROVIDER",
    "TECHNICIAN",
    "COMPANY",
  ]);

  const personalOrgMembership = useMemo(
    () =>
      memberships.find(
        (m) =>
          m.organization?.type === "PERSONAL" ||
          (m as any)?.organizationType === "PERSONAL" ||
          (m as any)?.personalOrg?.type === "PERSONAL"
      ),
    [memberships]
  );
  const personalOrg =
    personalOrgMembership?.organization ||
    (personalOrgMembership as any)?.personalOrg ||
    null;
  const personalOrgId =
    personalOrgMembership?.orgId || (personalOrg as any)?.id || null;

  const baseProvider: ProviderProfile | null = useMemo(() => {
    if (!user) return null;
    const membership =
      memberships.find((m) => m.orgId === organizationId) || memberships[0];

    const org = membership?.organization;
    const locationOrg = personalOrg || org;
    return {
      id: user.id,
      userId: user.id,
      orgMemberId: membership?.id || "",
      orgId: membership?.orgId || organizationId || personalOrgId || "",
      role: (membership?.orgRole ||
        (membership as any)?.role ||
        "TECHNICIAN") as any,
      name: user.name || "Provider",
      email: user.email || "",
      phone: (locationOrg as any)?.phone || "",
      isIndependent: !org || org.type === "PERSONAL",
      companyId: org?.type === "COMPANY" ? org.id : undefined,
      companyName: org?.type === "COMPANY" ? org.name : undefined,
      homeLocation: {
        lat: 51.0447,
        lng: -114.0719,
        address: {
          street: (locationOrg as any)?.addressLine1 || "",
          city: (locationOrg as any)?.city || "",
          stateProvince: (locationOrg as any)?.region || "",
          country: (locationOrg as any)?.countryCode || "",
          postalCode: (locationOrg as any)?.postalCode || "",
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
  }, [user, memberships, organizationId, personalOrg, personalOrgId]);

  const [provider, setProvider] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    if (baseProvider) {
      setProvider((prev) => {
        if (!prev) return baseProvider;
        if (prev.userId !== baseProvider.userId || prev.orgId !== baseProvider.orgId) {
          return baseProvider;
        }
        return prev;
      });
    }
  }, [baseProvider]);

  const organizationSettingsPath = personalOrgId
    ? `/organization/${personalOrgId}/settings`
    : organizationId
    ? `/organization/${organizationId}/settings`
    : undefined;

  const handleSaveProfile = async (updates: Partial<ProviderProfile>) => {
    if (!provider) return;

    const previous = provider;
    const nextProvider: ProviderProfile = {
      ...provider,
      ...updates,
      services: updates.services
        ? { ...provider.services, ...updates.services }
        : provider.services,
      homeLocation: updates.homeLocation
        ? {
            ...provider.homeLocation,
            ...updates.homeLocation,
            address: {
              ...provider.homeLocation.address,
              ...(updates.homeLocation.address || {}),
            },
          }
        : provider.homeLocation,
      phone: updates.phone ?? provider.phone,
      bio: updates.bio ?? provider.bio,
    };

    setProvider(nextProvider);

    if (personalOrgId) {
      try {
        await api.organizations.updateSettings(personalOrgId, {
          phone: nextProvider.phone || undefined,
          addressLine1: nextProvider.homeLocation.address.street || undefined,
          city: nextProvider.homeLocation.address.city || undefined,
          region: nextProvider.homeLocation.address.stateProvince || undefined,
          postalCode: nextProvider.homeLocation.address.postalCode || undefined,
          countryCode: nextProvider.homeLocation.address.country || undefined,
        } as any);
        toast.success("Profile and location updated");
      } catch (error) {
        setProvider(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update organization settings"
        );
      }
    } else {
      toast.success(
        "Profile updated. Update your address in organization settings."
      );
    }
  };

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
        organizationSettingsPath={organizationSettingsPath}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
