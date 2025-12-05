"use client";

import {
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Settings,
  User,
  UserPlus,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/components/ui/use-mobile";
import { toast } from "sonner";
import { OrganizationMember } from "@/types";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";

interface OrganizationSwitcherProps {
  variant?: "sidebar" | "header";
  onOrgHome?: () => void;
}

export function OrganizationSwitcher({
  variant = "sidebar",
  onOrgHome,
}: OrganizationSwitcherProps) {
  const { user } = useAuth();
  const { memberships, isLoading, setActiveOrganization } = useOrganizations();
  const { activeOrganizationId } = useCurrentOrganization();
  const router = useRouter();
  const isPersonalOrg = (membership: OrganizationMember) =>
    membership.organization?.type === "PERSONAL";
  const personalOrg = useMemo(
    () => memberships.find((membership) => isPersonalOrg(membership)),
    [memberships]
  );

  const orderedMemberships = useMemo(() => {
    const personalFirst = personalOrg ? [personalOrg] : [];
    const otherMemberships = memberships.filter(
      (membership) => !isPersonalOrg(membership)
    );

    return [...personalFirst, ...otherMemberships];
  }, [memberships, personalOrg]);

  // Use sidebar hook - must be called unconditionally (React rules)
  // The header is within SidebarProvider in dispatcher layout, so this is safe
  // In header mode, we always show text regardless of sidebar state
  let sidebarState: "expanded" | "collapsed" | undefined = "expanded";
  try {
    sidebarState = useSidebar()?.state;
  } catch {
    sidebarState = "expanded";
  }

  const activeOrg = useMemo(
    () =>
      memberships.find((m) => m.orgId === activeOrganizationId)?.organization,
    [memberships, activeOrganizationId]
  );

  const activeMembership = useMemo(
    () => memberships.find((m) => m.orgId === activeOrganizationId),
    [memberships, activeOrganizationId]
  );

  const selectOrg = (orgId: string | null) => {
    setActiveOrganization(orgId);
    // Navigate to dashboard after switching organization
    if (orgId !== null) {
      router.push("/dashboard");
    }
  };

  const goToManage = () => {
    // Canonical route for organization settings
    const targetOrgId = activeOrganizationId || personalOrg?.orgId;
    if (targetOrgId) {
      router.push(`/organization/${targetOrgId}/settings`);
    } else {
      router.push("/organization");
    }
  };

  const handleJoin = () => {
    toast.info("Join request sent (mock)");
  };

  const showText = variant === "header" || sidebarState !== "collapsed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto justify-between text-left pl-1.5! pr-2.5! py-0!"
        >
          <div className={`flex items-center gap-2 cursor-pointer w-full`}>
            <Avatar className="size-8">
              <AvatarImage src={activeOrg?.logoUrl} alt={activeOrg?.name} />
              <AvatarFallback>
                <Building2 className="size-3" />
              </AvatarFallback>
            </Avatar>
            {showText && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {!activeOrganizationId
                    ? "Personal workspace"
                    : activeOrg?.name || "Select organization"}
                </span>
              </div>
            )}

            {showText && (
              <ChevronsUpDown className="size-3 text-muted-foreground ml-auto" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 max-h-[400px]"
        align="start"
        side={useIsMobile() ? "bottom" : "right"}
      >
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isLoading && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Loading...
            </div>
          )}
          {/* No organizations found */}
          {!isLoading && memberships.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No organizations found
            </div>
          )}
          {/* Organizations */}
          {!isLoading &&
            orderedMemberships.map((m) => {
              const isPersonal = isPersonalOrg(m);

              return (
                <DropdownMenuItem
                  key={m.orgId}
                  onClick={() => selectOrg(m.orgId)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {/* Organization avatar */}
                  <Avatar className="size-8">
                    {!isPersonal && (
                      <AvatarImage src={m.organization?.logoUrl} />
                    )}
                    <AvatarFallback>
                      {isPersonal ? (
                        <ChevronsUpDown className="size-4" />
                      ) : (
                        <Building2 className="size-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {/* Organization name */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {isPersonal
                        ? "Personal workspace"
                        : m.organization?.name || m.orgId}
                    </span>
                    {!isPersonal && (
                      <Badge variant="muted" className="truncate">
                        {m.orgRole || (m as any).role || "Member"}
                      </Badge>
                    )}
                  </div>
                  {/* Check if the organization is active */}
                  {m.orgId === activeOrganizationId && (
                    <Check className="size-4 text-primary ml-auto shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Options */}
        <DropdownMenuGroup>
          {/* Org home */}
          {onOrgHome && (
            <DropdownMenuItem onClick={onOrgHome}>
              <Home className="size-4 mr-2" />
              {memberships.find((m) => m.orgId === activeOrganizationId)
                ?.organization?.type === "COMPANY"
                ? "Company home"
                : "Workspace home"}
            </DropdownMenuItem>
          )}

          {/* Manage organization */}
          {memberships.some(
            (m) =>
              m.organization?.type === "COMPANY" &&
              ["OWNER", "ADMIN"].includes(m.orgRole || (m as any).role || "")
          ) && (
            <DropdownMenuItem onClick={goToManage}>
              <Settings className="size-4 mr-2" />
              {memberships.find((m) => m.orgId === activeOrganizationId)
                ?.organization?.type === "COMPANY"
                ? "Company settings"
                : "Workspace settings"}
            </DropdownMenuItem>
          )}

          {/* Join organization (only when in personal workspace) */}
          {user?.accountType === "PROVIDER" &&
            activeMembership &&
            isPersonalOrg(activeMembership) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleJoin} disabled>
                  <UserPlus className="size-4 mr-2" />
                  Join company
                  <span className="ml-auto text-xs text-muted-foreground">
                    Coming soon
                  </span>
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
