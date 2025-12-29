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
} from "lucide-react";
import { User } from "@/types";
import { useJobCreation } from "@/context/JobCreationContext";
import { useAuth } from "@/context/auth-context";
import { OrganizationSwitcher } from "@/components/features/company/OrganizationSwitcher";
import { NotificationBell } from "@/components/shared/layout/NotificationBell";
import { UIContext } from "@/lib/roles";

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
  uiContext?: UIContext;
}

export function AppHeader({
  user,
  showNewJobButton = false,
  onNewJobClick,
  uiContext,
}: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { logout, activeOrganizationId } = useAuth();
  const jobCreation = useJobCreation();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Use UIContext for navigation decisions
  const { showSidebar, navItems, canCreateOrder, createActionLabel, createActionPath, accountType } = 
    uiContext || { showSidebar: false, navItems: [], canCreateOrder: false, createActionLabel: 'New Job', createActionPath: '/jobs/new', accountType: 'AGENT' as const };

  // Check if a nav item is active
  const isNavActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    if (path === '/orders') return pathname === '/orders' || pathname?.startsWith('/orders/');
    if (path === '/jobs/all-jobs') return pathname?.startsWith('/jobs');
    return pathname?.startsWith(path);
  };

  const handleCreateAction = () => {
    if (accountType === 'AGENT') {
      // Agents use the order creation flow
      router.push(createActionPath);
    } else if (onNewJobClick) {
      onNewJobClick();
    } else {
      jobCreation.openJobCreationDialog();
    }
  };

  const handleSettingsClick = () => {
    router.push("/settings");
  };

  const handleLogout = () => {
    localStorage.removeItem("accountType");
    logout();
  };

  const handleOrganizationHome = () => {
    router.push(activeOrganizationId ? `/organization/${activeOrganizationId}` : "/organization");
  };

  return (
    <header className="sticky top-0 z-50 flex items-center border-none! border-b bg-card/80 backdrop-blur-xl w-full pl-2 pr-4 h-header-h">
      <div className="w-full max-w-full">
        <div className="flex items-center justify-between">
          {/* Left side: Logo/Org Switcher */}
          <div className="flex items-center gap-3">
            {showSidebar ? (
              // Company org: show org switcher and sidebar trigger
              <>
                <OrganizationSwitcher
                  variant="header"
                  onOrgHome={handleOrganizationHome}
                />
                {!isMobile && <SafeSidebarTrigger />}
              </>
            ) : (
              // Personal/Team org: show org switcher for all users
              <OrganizationSwitcher
                variant="header"
                onOrgHome={handleOrganizationHome}
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation items for header-only layouts (PERSONAL/TEAM orgs) */}
            {!showSidebar && !isMobile && navItems.length > 0 && (
              <div className="flex items-center gap-2">
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={isNavActive(item.path) ? "activeFlat" : "mutedFlat"}
                    size="sm"
                    onClick={() => router.push(item.path)}
                  >
                    {item.label}
                  </Button>
                ))}
                {/* Create action button for agents */}
                {canCreateOrder && (
                  <Button
                    variant={pathname === createActionPath ? "activeFlat" : "mutedFlat"}
                    size="sm"
                    onClick={handleCreateAction}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    {createActionLabel}
                  </Button>
                )}
              </div>
            )}

            {/* New Job Button for Company orgs (Owner/Admin only) */}
            {showSidebar && !isMobile && showNewJobButton && (
              <Button
                onClick={handleCreateAction}
                size="sm"
                className="gap-2"
                variant="mutedFlat"
              >
                <Plus className="h-4 w-4" />
                {createActionLabel}
              </Button>
            )}

            {/* Notification Bell for all account types */}
            {(accountType === "AGENT" || accountType === "PROVIDER" || accountType === "COMPANY") && (
              <NotificationBell />
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
                <DropdownMenuItem onClick={() => router.push("/profile")}>
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
  );
}
