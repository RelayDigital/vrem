"use client";

import { useRouter } from "next/navigation";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
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
  Calendar,
  Briefcase,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { H2, Muted } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function OrganizationHomePage() {
  const router = useRouter();
  const { activeOrganizationId } = useCurrentOrganization();
  const { organization, isLoading, error } = useOrganizationSettings();

  if (!activeOrganizationId) {
    return (
      <main className="container relative mx-auto">
        <article className="flex flex-col gap-2xl md:gap-3xl px-md">
          <div className="@container w-full mt-md">
            {/* Heading and button */}
            <div className="mb-md flex items-baseline justify-between">
              <H2 className="text-lg border-0">No Organization Selected</H2>
              <Button
                variant="flat"
                className="px-0"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>

            <div className="overflow-hidden">
              <Muted className="text-sm">
                Please select an organization to view its home page.
              </Muted>
            </div>
          </div>
        </article>
      </main>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <main className="container relative mx-auto">
        <article className="flex flex-col gap-2xl md:gap-3xl px-md">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="size-12 text-muted-foreground mb-4" />
              <H2 className="mb-2">Failed to Load Organization</H2>
              <Muted className="mb-4">
                {error?.message || "Unable to load organization information."}
              </Muted>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </article>
      </main>
    );
  }

  const orgType = (organization as any).type || "Organization";
  const city = (organization as any).city || "";
  const region = (organization as any).region || "";
  const postalCode = (organization as any).postalCode || "";
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
            <Avatar className="size-20 border-2">
              <AvatarImage
                src={
                  (organization as any).avatar || (organization as any).logoUrl
                }
                alt={organization.name}
              />
              <AvatarFallback>
                <Building2 className="size-10" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <H2 className="mb-0">{organization.name}</H2>
                {orgType && (
                  <Badge variant="secondary" className="capitalize">
                    {orgType.replace("_", " ")}
                  </Badge>
                )}
              </div>
              {(organization as any).description && (
                <Muted className="text-base mb-4">
                  {(organization as any).description}
                </Muted>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    <span>{address}</span>
                  </div>
                )}
                {(organization as any).primaryEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4" />
                    <span>{(organization as any).primaryEmail}</span>
                  </div>
                )}
                {(organization as any).phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4" />
                    <span>{(organization as any).phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="@container w-full">
          {/* Heading and button */}
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">Quick Actions</H2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <Link href="/organization/settings">
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
                    Manage your organization's details, branding, and
                    preferences
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
              <Link href="/dashboard">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Organization Name
                    </div>
                    <div className="text-base">{organization.name}</div>
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
                  {(organization as any).timezone && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Timezone
                      </div>
                      <div className="text-base">
                        {(organization as any).timezone}
                      </div>
                    </div>
                  )}
                  {(organization as any).primaryEmail && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Primary Email
                      </div>
                      <div className="text-base">
                        {(organization as any).primaryEmail}
                      </div>
                    </div>
                  )}
                  {(organization as any).phone && (
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
                <div className="mt-6 pt-6 border-t">
                  <Button asChild variant="outline">
                    <Link href="/organization/settings">
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
