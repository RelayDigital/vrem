"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { H2, H3, Small, Muted } from "@/components/ui/typography";
import { User } from "@/types";
import { Mail, Phone, Building2 } from "lucide-react";

interface AgentProfileViewProps {
  user: User;
  onSave: (updates: { name?: string; phone?: string }) => void | Promise<void>;
}

export function AgentProfileView({ user, onSave }: AgentProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name || "",
    phone: "",
  });
  const [isSaving, setIsSaving] = useState(false);

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
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      name: user.name || "",
                      phone: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          {/* Profile Content */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-start gap-6">
              <Avatar className="size-24">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {(user.name || "A")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      placeholder="Your name"
                    />
                  </div>
                ) : (
                  <H3 className="text-xl">{user.name || "Agent"}</H3>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <Small>{user.email}</Small>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-6 border-t">
              <Label>Contact Information</Label>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profileData.phone || "No phone added"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="space-y-3 pt-6 border-t">
              <Label>Account</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Real Estate Agent</span>
                </div>
                <Muted className="text-xs">
                  Your account is set up as a real estate agent. You can create
                  photo shoot orders for your listings.
                </Muted>
              </div>
            </div>

            {/* Help Section */}
            <div className="space-y-3 pt-6 border-t">
              <Label>Need Help?</Label>
              <Muted className="text-sm">
                If you need to update your email or have questions about your
                account, please contact support.
              </Muted>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}

