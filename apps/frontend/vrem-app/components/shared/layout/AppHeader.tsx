"use client";

import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { H2 } from "@/components/ui/typography";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useIsMobile } from "@/components/ui/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  User as UserIcon,
  Settings,
  LogOut,
  Plus,
  Moon,
  Sun,
  Monitor,
  Briefcase,
  Building2,
} from "lucide-react";
import { User } from "@/types";
import { useJobCreation } from "@/context/JobCreationContext";
import { useAuth } from "@/context/auth-context";
import { OrganizationSwitcher } from "@/components/features/company/OrganizationSwitcher";

function SafeSidebarTrigger() {
  try {
    useSidebar();
  } catch {
    return null;
  }
  return <SidebarTrigger />;
}

interface AppHeaderProps {
  user: User;
  showNewJobButton?: boolean;
  onNewJobClick?: () => void;
  forceShowNavigation?: boolean;
}

export function AppHeader({
  user,
  showNewJobButton = false,
  onNewJobClick,
  forceShowNavigation = false,
}: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { logout, activeOrganizationId } = useAuth();
  const jobCreation = useJobCreation();
  const router = useRouter();
  const pathname = usePathname();

  // Determine agent view based on pathname (using canonical routes)
  const isAgentJobsView =
    pathname === "/dashboard" ||
    pathname === "/jobs" ||
    pathname === "/jobs/all-jobs";
  const isAgentBookingView = pathname === "/booking";
  const isAgentCalendarView = pathname === "/calendar";
  const isAgentMapView = pathname === "/map";

  // Determine technician view based on pathname (using canonical routes)
  const isProviderDashboardView = pathname === "/dashboard";
  const isTechnicianJobsView = pathname.startsWith("/jobs/all-jobs");
  const isTechnicianCalendarView = pathname === "/calendar";
  const isTechnicianMapView = pathname === "/map";

  const handleNewJobClick = () => {
    // For agents, navigate to booking page
    if (
      user?.organizationMemberships?.some((m) => ["AGENT"].includes(m.orgRole))
    ) {
      router.push("/booking");
      return;
    }

    if (onNewJobClick) {
      onNewJobClick();
    } else {
      jobCreation.openJobCreationDialog();
    }
  };

  const handleSettingsClick = () => {
    // All roles use canonical settings route
    router.push("/settings");
  };

  const handleLogout = () => {
    // Clear any additional localStorage items
    localStorage.removeItem("accountType");
    // Use the auth context logout function which handles token removal and navigation
    logout();
  };

  const handleOrganizationHome = () => {
    const activeOrgId = activeOrganizationId;
    router.push(activeOrgId ? `/organization/${activeOrgId}` : "/organization");
  };

  const { memberships } = useCurrentOrganization();
  const hasOrgRole = (...roles: string[]) =>
    memberships.some((m) => roles.includes((m as any).orgRole || m.role));
  const canManage = hasOrgRole("OWNER", "ADMIN");
  const isProviderOnly = !canManage && hasOrgRole("TECHNICIAN");
  const activeMembership = memberships.find(
    (m) => m.orgId === activeOrganizationId
  );
  const activeRole = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const orgType =
    activeMembership?.organization?.type ||
    (activeMembership as any)?.organizationType ||
    "";
  const isProjectManager =
    activeRole === "PROJECT_MANAGER" && orgType !== "PERSONAL";
  const isEditor =
    activeRole === "EDITOR" && orgType !== "PERSONAL";
  const isLimitedRole = isProjectManager || isEditor;

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center border-b bg-card/80 backdrop-blur-xl shadow-sm w-full pl-2 pr-4 h-header-h">
        <div className="w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            {/* Organization Switcher */}
            <div className="flex items-center gap-3">
              {(canManage || isProviderOnly) && (
                <OrganizationSwitcher
                  variant="header"
                  onOrgHome={handleOrganizationHome}
                />
              )}
              {!canManage && !isProviderOnly && (
                <H2 className="p-0 border-0">VX Media</H2>
              )}
              {!useIsMobile() && canManage && <SafeSidebarTrigger />}
            </div>

            <div className="flex items-center gap-4">
              {/* Agent View Switcher */}
              {(forceShowNavigation || !useIsMobile()) &&
                user?.organizationMemberships?.some((m) =>
                  ["AGENT"].includes(m.orgRole)
                ) && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isAgentJobsView ? "activeFlat" : "mutedFlat"}
                      size="sm"
                      onClick={() => router.push("/jobs")}
                    >
                      My Jobs
                    </Button>
                    <Button
                      variant={isAgentCalendarView ? "activeFlat" : "mutedFlat"}
                      size="sm"
                      onClick={() => router.push("/calendar")}
                    >
                      Calendar
                    </Button>
                    <Button
                      variant={isAgentMapView ? "activeFlat" : "mutedFlat"}
                      size="sm"
                      onClick={() => router.push("/map")}
                    >
                      Map
                    </Button>
                    <Button
                      variant={isAgentBookingView ? "activeFlat" : "mutedFlat"}
                      size="sm"
                      onClick={handleNewJobClick}
                    >
                      New Booking
                    </Button>
                  </div>
                )}

              {/* Technician View Switcher */}
              {forceShowNavigation &&
                !useIsMobile() &&
                user?.accountType === "PROVIDER" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        isProviderDashboardView ? "activeFlat" : "mutedFlat"
                      }
                      size="sm"
                      onClick={() => router.push("/dashboard")}
                    >
                      Dashboard
                    </Button>
                    <Button
                      variant={
                        isTechnicianJobsView ? "activeFlat" : "mutedFlat"
                      }
                      size="sm"
                      onClick={() => router.push("/jobs/all-jobs")}
                    >
                      Jobs
                    </Button>
                    <Button
                      variant={
                        isTechnicianCalendarView ? "activeFlat" : "mutedFlat"
                      }
                      size="sm"
                      onClick={() => router.push("/calendar")}
                    >
                      Calendar
                    </Button>
                    <Button
                      variant={isTechnicianMapView ? "activeFlat" : "mutedFlat"}
                      size="sm"
                      onClick={() => router.push("/map")}
                    >
                      Map
                    </Button>
                  </div>
                )}

              {/* New Job Button for Owner or Admin */}
              {!useIsMobile() && showNewJobButton && !isLimitedRole && (
                <Button
                  onClick={handleNewJobClick}
                  size="sm"
                  className="gap-2"
                  variant="mutedFlat"
                >
                  <Plus className="h-4 w-4" />
                  New Job
                </Button>
              )}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 h-auto p-0"
                  >
                    <Avatar className="size-9 border-2 border-border">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.name
                          ? user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <div className="text-sm">{user?.name || "User"}</div>
                      <div className="text-xs text-muted-foreground">
                        {user?.email || "email@example.com"}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      router.push("/profile");
                    }}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={setTheme}
                  >
                    <DropdownMenuRadioItem value="light">
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Monitor className="h-4 w-4 mr-2" />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
