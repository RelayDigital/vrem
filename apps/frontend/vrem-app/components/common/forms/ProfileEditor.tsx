"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";
import { H2, H3, Small, Muted, Large } from "../../ui/typography";
import { ProviderProfile } from "../../../types";
import { CheckCircle2, XCircle, Settings } from "lucide-react";

interface ProfileEditorProps {
  provider: ProviderProfile;
  onSave: (updates: Partial<ProviderProfile>) => void;
}

export function ProfileEditor({ provider, onSave }: ProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: provider.bio || "",
    services: provider.services,
  });

  const handleSave = () => {
    onSave(profileData);
    setIsEditing(false);
  };

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md">
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
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className=""
                  onClick={() => setIsEditing(false)}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          {/* Profile Editor */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-start gap-6">
              <Avatar className="size-24 border-4 border-card shadow-lg">
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
