"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Label } from "../../ui/label";
import { H2, H3, Small, Muted, Large } from "../../ui/typography";
import { ProviderProfile } from "../../../types";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

type ProviderUseCase =
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "DRONE_AERIAL"
  | "VIRTUAL_TOURS"
  | "FLOOR_PLANS"
  | "EDITING"
  | "STAGING"
  | "MEASUREMENTS";

const USE_CASE_CONFIG: Record<ProviderUseCase, { label: string; icon: string }> = {
  PHOTOGRAPHY: { label: "Photography", icon: "📷" },
  VIDEOGRAPHY: { label: "Videography", icon: "🎬" },
  DRONE_AERIAL: { label: "Drone/Aerial", icon: "🚁" },
  VIRTUAL_TOURS: { label: "Virtual Tours", icon: "🏠" },
  FLOOR_PLANS: { label: "Floor Plans", icon: "📐" },
  EDITING: { label: "Editing", icon: "🖼️" },
  STAGING: { label: "Virtual Staging", icon: "🛋️" },
  MEASUREMENTS: { label: "Measurements", icon: "📏" },
};

interface ProfileEditorProps {
  provider: ProviderProfile;
  onSave?: (updates: Partial<ProviderProfile>) => void | Promise<void>;
  organizationSettingsPath?: string;
}

export function ProfileEditor({
  provider,
  organizationSettingsPath,
}: ProfileEditorProps) {
  const [useCases, setUseCases] = useState<ProviderUseCase[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  useEffect(() => {
    const loadUseCases = async () => {
      try {
        const data = await api.users.getUseCases();
        setUseCases(data as ProviderUseCase[]);
      } catch (error) {
        console.error("Failed to load use cases:", error);
      } finally {
        setIsLoadingServices(false);
      }
    };

    loadUseCases();
  }, []);

  const addressDisplay = useMemo(() => {
    const { street, city, stateProvince, postalCode, country } =
      provider.homeLocation?.address || {};
    const parts = [street, city, stateProvince, postalCode, country].filter(
      Boolean
    );
    return parts.join(", ");
  }, [provider.homeLocation?.address]);

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          {/* Heading */}
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">Profile</H2>
          </div>

          {/* Profile View */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-start gap-6">
              <Avatar className="size-24">
                <AvatarImage src={provider.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {provider.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <H3 className="text-xl">{provider.name}</H3>
                <Small className="text-muted-foreground">{provider.email}</Small>
                {provider.isIndependent ? (
                  <Badge
                    variant="outline"
                    className="border-primary text-foreground/90"
                  >
                    Independent Provider
                  </Badge>
                ) : (
                  <Badge className="bg-primary text-primary-foreground">
                    {provider.companyName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Bio */}
            {provider.bio && (
              <div className="space-y-2">
                <Label>About</Label>
                <Small className="text-muted-foreground">{provider.bio}</Small>
              </div>
            )}

            {/* Location */}
            <div className="space-y-3 pt-6 border-t">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                {organizationSettingsPath && (
                  <Button
                    variant="flat"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    asChild
                  >
                    <Link href={organizationSettingsPath}>
                      Workspace Settings
                      <ExternalLink className="size-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {provider.phone && (
                  <div className="text-foreground">{provider.phone}</div>
                )}
                <div>{addressDisplay || "No address available"}</div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Large className="mb-1">{provider.reliability.totalJobs}</Large>
                <Small className="text-muted-foreground">Total Jobs</Small>
              </div>
              <div className="text-center">
                <Large className="mb-1">{provider.rating.overall}</Large>
                <Small className="text-muted-foreground">Rating</Small>
              </div>
              <div className="text-center">
                <Large className="mb-1">
                  {(provider.reliability.onTimeRate * 100).toFixed(0)}%
                </Large>
                <Small className="text-muted-foreground">On-Time</Small>
              </div>
            </div>

            {/* Services Offered */}
            <div className="space-y-3 pt-6 border-t">
              <Label>Services</Label>
              {isLoadingServices ? (
                <Muted className="text-sm">Loading services...</Muted>
              ) : useCases.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {useCases.map((useCase) => {
                    const config = USE_CASE_CONFIG[useCase];
                    if (!config) return null;
                    return (
                      <Badge
                        key={useCase}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1.5"
                      >
                        {config.icon}
                        <span>{config.label}</span>
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <Muted className="text-sm">No services listed</Muted>
              )}
            </div>

            {/* Notable Works / Portfolio */}
            {provider.portfolio && provider.portfolio.length > 0 && (
              <div className="space-y-3 pt-6 border-t">
                <Label>Notable Works</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {provider.portfolio.map((imageUrl, index) => (
                    <a
                      key={index}
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary transition-colors"
                    >
                      <img
                        src={imageUrl}
                        alt={`Portfolio item ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
