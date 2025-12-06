"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Checkbox } from "../../ui/checkbox";
import { H2, H3, Small, Muted, Large } from "../../ui/typography";
import { ProviderProfile } from "../../../types";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";

interface ProfileEditorProps {
  provider: ProviderProfile;
  onSave: (updates: Partial<ProviderProfile>) => void | Promise<void>;
  organizationSettingsPath?: string;
}

export function ProfileEditor({
  provider,
  onSave,
  organizationSettingsPath,
}: ProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: provider.bio || "",
    services: provider.services,
    phone: provider.phone || "",
    homeLocation: {
      lat: provider.homeLocation?.lat ?? 51.0447,
      lng: provider.homeLocation?.lng ?? -114.0719,
      address: {
        street: provider.homeLocation?.address.street || "",
        city: provider.homeLocation?.address.city || "",
        stateProvince: provider.homeLocation?.address.stateProvince || "",
        country: provider.homeLocation?.address.country || "",
        postalCode: provider.homeLocation?.address.postalCode || "",
      },
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfileData({
      bio: provider.bio || "",
      services: provider.services,
      phone: provider.phone || "",
      homeLocation: {
        lat: provider.homeLocation?.lat ?? 51.0447,
        lng: provider.homeLocation?.lng ?? -114.0719,
        address: {
          street: provider.homeLocation?.address.street || "",
          city: provider.homeLocation?.address.city || "",
          stateProvince: provider.homeLocation?.address.stateProvince || "",
          country: provider.homeLocation?.address.country || "",
          postalCode: provider.homeLocation?.address.postalCode || "",
        },
      },
    });
  }, [provider]);

  const addressDisplay = useMemo(() => {
    const { street, city, stateProvince, postalCode, country } =
      profileData.homeLocation.address;
    const parts = [street, city, stateProvince, postalCode, country].filter(
      Boolean
    );
    return parts.join(", ");
  }, [
    profileData.homeLocation.address.street,
    profileData.homeLocation.address.city,
    profileData.homeLocation.address.stateProvince,
    profileData.homeLocation.address.postalCode,
    profileData.homeLocation.address.country,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(profileData);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          {/* Heading and button */}
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">My Profile</H2>
            {!isEditing ? (
              <Button
                variant="flat"
                className="px-0"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className=""
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      bio: provider.bio || "",
                      services: provider.services,
                      phone: provider.phone || "",
                      homeLocation: {
                        lat: provider.homeLocation?.lat ?? 51.0447,
                        lng: provider.homeLocation?.lng ?? -114.0719,
                        address: {
                          street:
                            provider.homeLocation?.address.street || "",
                          city: provider.homeLocation?.address.city || "",
                          stateProvince:
                            provider.homeLocation?.address.stateProvince || "",
                          country: provider.homeLocation?.address.country || "",
                          postalCode:
                            provider.homeLocation?.address.postalCode || "",
                        },
                      },
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className=""
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          {/* Profile Editor */}
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
            <div className="space-y-2">
              <Label>Bio</Label>
              {isEditing ? (
                <Textarea
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                  placeholder="Tell clients about your experience and specialties..."
                  rows={4}
                />
              ) : (
                <Small className="text-muted-foreground">
                  {provider.bio || "No bio added yet"}
                </Small>
              )}
            </div>

            {/* Location */}
            <div className="space-y-3 pt-6 border-t">
              <div className="flex items-center justify-between">
                <Label>Location &amp; Address</Label>
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

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={profileData.homeLocation.address.street}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          homeLocation: {
                            ...profileData.homeLocation,
                            address: {
                              ...profileData.homeLocation.address,
                              street: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileData.homeLocation.address.city}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          homeLocation: {
                            ...profileData.homeLocation,
                            address: {
                              ...profileData.homeLocation.address,
                              city: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stateProvince">State / Province</Label>
                    <Input
                      id="stateProvince"
                      value={profileData.homeLocation.address.stateProvince}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          homeLocation: {
                            ...profileData.homeLocation,
                            address: {
                              ...profileData.homeLocation.address,
                              stateProvince: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="State / Province"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={profileData.homeLocation.address.postalCode}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          homeLocation: {
                            ...profileData.homeLocation,
                            address: {
                              ...profileData.homeLocation.address,
                              postalCode: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Postal Code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profileData.homeLocation.address.country}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          homeLocation: {
                            ...profileData.homeLocation,
                            address: {
                              ...profileData.homeLocation.address,
                              country: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Country"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="text-foreground">
                    {profileData.phone || "No phone provided"}
                  </div>
                  <div>{addressDisplay || "No address saved yet"}</div>
                  <Muted className="text-xs">
                    Location is pulled from your personal organization settings.
                  </Muted>
                </div>
              )}
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

            {/* Services */}
            <div className="space-y-3 pt-6 border-t">
              <Label>Services Offered</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(profileData.services).map(
                  ([service, enabled]) => (
                    <div
                      key={service}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        enabled
                          ? "border-primary bg-accent"
                          : "border-border bg-card"
                      } ${isEditing ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (isEditing) {
                          setProfileData({
                            ...profileData,
                            services: {
                              ...profileData.services,
                              [service]: !enabled,
                            },
                          });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {service.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        {isEditing ? (
                          <Checkbox checked={enabled} />
                        ) : enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
