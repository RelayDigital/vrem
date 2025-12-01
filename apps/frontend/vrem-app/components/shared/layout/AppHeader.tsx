"use client";

import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { H2 } from "@/components/ui/typography";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
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
import { OrganizationSwitcher } from "@/components/features/dispatcher/OrganizationSwitcher";

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
}

export function AppHeader({
  user,
  showNewJobButton = false,
  onNewJobClick,
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
  const isTechnicianDashboardView = pathname === "/dashboard";
  const isTechnicianJobsView = pathname.startsWith("/jobs/all-jobs");
  const isTechnicianCalendarView = pathname === "/calendar";
  const isTechnicianMapView = pathname === "/map";

  // Determine dispatcher view (check for canonical routes or legacy dispatcher routes)
  const isDispatcherView =
    pathname.startsWith("/dispatcher") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/jobs/all-jobs") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/map") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/settings");

  const handleNewJobClick = () => {
    // For agents, navigate to booking page
    if (user?.role === "AGENT") {
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
    router.push("/settings/profile");
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

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center border-b bg-card/80 backdrop-blur-xl shadow-sm w-full pl-2 pr-4 h-header-h">
        <div className="w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            {/* Organization Switcher */}
            <div className="flex items-center gap-3">
              {(user?.role === "DISPATCHER" ||
                user?.role === ("dispatcher" as any)) && (
                <OrganizationSwitcher
                  variant="header"
                  showJoin={false}
                  onOrgHome={handleOrganizationHome}
                  accountType="dispatcher"
                />
              )}
              {(user?.role === "TECHNICIAN" ||
                user?.role === ("technician" as any)) && (
                <OrganizationSwitcher
                  variant="header"
                  includePersonal
                  showManage={false}
                  onOrgHome={handleOrganizationHome}
                  accountType="technician"
                />
              )}
              {user?.role !== "DISPATCHER" &&
                user?.role !== ("dispatcher" as any) &&
                user?.role !== "TECHNICIAN" &&
                user?.role !== ("technician" as any) && (
                  <H2 className="p-0 border-0">VX Media</H2>
                )}
              {!useIsMobile() &&
                isDispatcherView &&
                (user?.role === "DISPATCHER") && <SafeSidebarTrigger />}
            </div>

            <div className="flex items-center gap-4">
              {/* Agent View Switcher */}
              {!useIsMobile() && user?.role === ("AGENT" as any) && (
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
              {!useIsMobile() && (user?.role === ("TECHNICIAN" as any) ||
                user?.role === ("technician" as any) ||
                user?.role === ("TECHNICIAN" as any)) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={
                      isTechnicianDashboardView ? "activeFlat" : "mutedFlat"
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

              {/* New Job Button for Dispatcher */}
              {!useIsMobile() && showNewJobButton &&
                (user?.role === ("DISPATCHER" as any) ||
                  user?.role === ("PROJECT_MANAGER" as any) ||
                  user?.role === ("EDITOR" as any)) && (
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
                    <Avatar className="h-9 w-9 border-2 border-border shadow-sm">
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
                      // All roles use canonical profile route
                      router.push("/settings/profile");
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
