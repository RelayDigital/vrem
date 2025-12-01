"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Settings,
  Users,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { H2, Muted } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export default function OrganizationByIdPage() {
  const params = useParams();
  const orgId = params?.orgId as string | undefined;
  const { setActiveOrganization, activeOrganizationId } = useCurrentOrganization();
  const { organization, isLoading, error } = useOrganizationSettings(orgId);
  const router = useRouter();

  // keep active org in sync
  if (orgId && orgId !== activeOrganizationId) {
    setActiveOrganization(orgId);
  }

  const isLoadingOrg = isLoading || (!organization && !error);
  const orgType = useMemo(
    () => ((organization as any)?.type || "Organization") as string,
    [organization]
  );
  const city = (organization as any)?.city || "";
  const region = (organization as any)?.region || "";
  const postalCode = (organization as any)?.postalCode || "";
  const address =
    city || region || postalCode
      ? `${city}${city && region ? ", " : ""}${region} ${postalCode}`.trim()
      : null;

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Header Section */}
        <div className="@container w-full mt-md">
          <div className="flex items-start gap-6">
            {isLoadingOrg ? (
              <Skeleton className="size-20 rounded-full" />
            ) : (
              <Avatar className="size-20 border-2">
                <AvatarImage
                  src={
                    (organization as any)?.avatar ||
                    (organization as any)?.logoUrl
                  }
                  alt={organization?.name}
                />
                <AvatarFallback>
                  <Building2 className="size-10" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {isLoadingOrg ? (
                  <Skeleton className="h-8 w-40" />
                ) : (
                  <H2 className="mb-0">{organization?.name}</H2>
                )}
                {!isLoadingOrg && orgType && (
                  <Badge variant="secondary" className="capitalize">
                    {orgType.replace("_", " ")}
                  </Badge>
                )}
              </div>
              {isLoadingOrg ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-60" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                (organization as any)?.description && (
                  <Muted className="text-base mb-4">
                    {(organization as any).description}
                  </Muted>
                )
              )}
              {!isLoadingOrg && (
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      <span>{address}</span>
                    </div>
                  )}
                  {(organization as any)?.primaryEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4" />
                      <span>{(organization as any).primaryEmail}</span>
                    </div>
                  )}
                  {(organization as any)?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4" />
                      <span>{(organization as any).phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {error && (
            <Muted className="text-sm text-destructive mt-2">
              {error.message || "Unable to load organization information."}
            </Muted>
          )}
        </div>

        {/* Quick Actions */}
        <div className="@container w-full">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">Quick Actions</H2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingOrg ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={`org-quick-action-${index}`} className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))
            ) : (
              <>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <Link href={`/organization/${orgId}/settings`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Settings className="size-5 text-primary" />
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="text-lg">
                        Organization Settings
                      </CardTitle>
                      <CardDescription>
                        Manage your organization's details, branding, and preferences
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <Link href="/dashboard">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Briefcase className="size-5 text-primary" />
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="text-lg">Dashboard</CardTitle>
                      <CardDescription>
                        View jobs, metrics, and manage your workflow
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <Link href="/team">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Users className="size-5 text-primary" />
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="text-lg">Team Members</CardTitle>
                      <CardDescription>
                        View and manage your organization's team
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Organization Info Card */}
        <div className="@container w-full mb-md">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">Organization Information</H2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent>
                {isLoadingOrg ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`org-info-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Organization Name
                      </div>
                      <div className="text-base">{organization?.name}</div>
                    </div>
                    {orgType && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Type
                        </div>
                        <div className="text-base capitalize">
                          {orgType.replace("_", " ")}
                        </div>
                      </div>
                    )}
                    {(city || region || postalCode) && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Location
                        </div>
                        <div className="text-base">{address}</div>
                      </div>
                    )}
                    {(organization as any)?.timezone && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Timezone
                        </div>
                        <div className="text-base">
                          {(organization as any).timezone}
                        </div>
                      </div>
                    )}
                    {(organization as any)?.primaryEmail && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Primary Email
                        </div>
                        <div className="text-base">
                          {(organization as any).primaryEmail}
                        </div>
                      </div>
                    )}
                    {(organization as any)?.phone && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Phone
                        </div>
                        <div className="text-base">
                          {(organization as any).phone}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-6 pt-6 border-t">
                  <Button asChild variant="outline" disabled={isLoadingOrg}>
                    <Link href={`/organization/${orgId}/settings`}>
                      <Settings className="size-4 mr-2" />
                      Edit Organization Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>
    </main>
  );
}
