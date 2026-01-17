"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { OrganizationPublicInfo } from "@/types";

export default function OrganizationPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  
  const [org, setOrg] = useState<OrganizationPublicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrg() {
      try {
        setIsLoading(true);
        const data = await api.invitations.getOrganizationPublic(orgId);
        setOrg(data);
      } catch (err: any) {
        setError(err.message || "Failed to load organization");
      } finally {
        setIsLoading(false);
      }
    }

    if (orgId) {
      fetchOrg();
    }
  }, [orgId]);

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="h-9 w-20 bg-muted animate-pulse rounded mb-6" />
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-muted animate-pulse rounded-full" />
            </div>
            <div className="h-8 w-48 mx-auto bg-muted animate-pulse rounded" />
            <div className="h-6 w-24 mx-auto bg-muted animate-pulse rounded mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {error || "Organization not found"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const location = [org.city, org.region].filter(Boolean).join(", ");

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={org.logoUrl} alt={org.name} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {org.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">{org.name}</CardTitle>
          <CardDescription>
            <Badge variant="secondary" className="mt-2">
              {org.type === "COMPANY" ? "Company" : org.type === "TEAM" ? "Team" : "Personal"}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
          
          {org.websiteUrl && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={org.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {org.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              You have been invited to join this organization.
              <br />
              Check your notifications to accept or decline.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

