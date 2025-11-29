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

interface OrganizationSwitcherProps {
  variant?: "sidebar" | "header";
  includePersonal?: boolean;
  showManage?: boolean;
  showJoin?: boolean;
  onOrgHome?: () => void;
  accountType?: "dispatcher" | "photographer";
}

export function OrganizationSwitcher({
  variant = "sidebar",
  includePersonal = false,
  showManage = true,
  showJoin = true,
  onOrgHome,
  accountType = "dispatcher",
}: OrganizationSwitcherProps) {
  const { memberships, isLoading, setActiveOrganization } = useOrganizations();
  const { activeOrganizationId } = useCurrentOrganization();
  const router = useRouter();

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

  const selectOrg = (orgId: string | null) => {
    setActiveOrganization(orgId);
    // Navigate to dashboard after switching organization
    if (orgId !== null) {
      router.push("/dashboard");
    }
  };

  const goToManage = () => {
    // Canonical route for organization settings
    router.push("/organization/settings");
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
          <div
            className={`flex items-center gap-2 cursor-pointer w-full`}
          >
            <Avatar className="size-8">
              <AvatarImage src={activeOrg?.avatar} alt={activeOrg?.name} />
              <AvatarFallback>
                <Building2 className="size-3" />
              </AvatarFallback>
            </Avatar>
            {showText && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {includePersonal && !activeOrganizationId
                    ? "Personal dashboard"
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
          {!isLoading && memberships.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No organizations found
            </div>
          )}
          {includePersonal && (
            <DropdownMenuItem
              onClick={() => selectOrg(null)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Avatar className="size-8">
                <AvatarFallback>
                  <ChevronsUpDown className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  Personal dashboard
                </span>
                <span className="text-xs text-muted-foreground capitalize truncate">
                  Marketplace view
                </span>
              </div>
              {!activeOrganizationId && (
                <Check className="size-4 text-primary ml-auto shrink-0" />
              )}
            </DropdownMenuItem>
          )}
          {!isLoading &&
            memberships.map((m) => (
              <DropdownMenuItem
                key={m.orgId}
                onClick={() => selectOrg(m.orgId)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="size-8">
                  <AvatarImage src={m.organization?.avatar} />
                  <AvatarFallback>
                    <Building2 className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {m.organization?.name || m.orgId}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize truncate">
                    {m.organization?.type?.replace("_", " ") || "Member"}
                  </span>
                </div>
                {m.orgId === activeOrganizationId && (
                  <Check className="size-4 text-primary ml-auto shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {onOrgHome && (
            <DropdownMenuItem onClick={onOrgHome}>
              <Home className="size-4 mr-2" />
              Org home
            </DropdownMenuItem>
          )}
          {showJoin && (
            <DropdownMenuItem onClick={handleJoin}>
              <UserPlus className="size-4 mr-2" />
              Join organization
              <span className="ml-auto text-xs text-muted-foreground">Mock</span>
            </DropdownMenuItem>
          )}
          {showManage && (
            <DropdownMenuItem onClick={goToManage}>
              <Settings className="size-4 mr-2" />
              Manage organization
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
