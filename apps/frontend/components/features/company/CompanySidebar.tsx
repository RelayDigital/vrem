"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "../../ui/sidebar";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  MapPin,
  Calendar,
  Settings,
  Kanban,
  ChevronRight,
  User,
  Building2,
  Handshake,
  Shield,
  Receipt,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { cn } from "../../ui/utils";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export function CompanySidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { activeMembership } = useCurrentOrganization();
  const orgRole = (
    (activeMembership?.role || (activeMembership as any)?.orgRole || "") as string
  ).toUpperCase();
  const orgType =
    activeMembership?.organization?.type ||
    (activeMembership as any)?.organizationType ||
    "";
  const isProjectManager =
    orgRole === "PROJECT_MANAGER" && orgType !== "PERSONAL";
  const isEditor = orgRole === "EDITOR" && orgType !== "PERSONAL";
  const isLimitedRole = isProjectManager || isEditor;

  // Determine if a route is active
  // For submenu items, use exact matching to avoid highlighting multiple items
  const isActive = (path: string, isSubmenuItem: boolean = false) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For settings submenu items, use startsWith to match any route in that section
    if (isSubmenuItem && path.startsWith("/settings")) {
      // Personal section: account, notifications, or profile
      if (path === "/settings/account") {
        return pathname?.startsWith("/settings/account") || 
               pathname?.startsWith("/settings/notifications") ||
               pathname === "/settings/profile";
      }
      // For other settings sections, check if pathname starts with the section path
      // Extract the section prefix (e.g., "/settings/organization" from "/settings/organization/general")
      const sectionPath = path.split("/").slice(0, 3).join("/");
      return pathname?.startsWith(sectionPath);
    }
    // For other submenu items, use exact matching
    if (isSubmenuItem) {
      return pathname === path;
    }
    // For parent menu items, use startsWith to match any child route
    return pathname?.startsWith(path);
  };

  // Check if jobs submenu should be open (if we're on any jobs route)
  const isJobsRouteActive =
    pathname?.startsWith("/jobs") && pathname !== "/jobs";
  const [jobsSubmenuOpen, setJobsSubmenuOpen] = useState(false);

  // Check if settings submenu should be open (if we're on any settings route)
  const isSettingsRouteActive =
    pathname?.startsWith("/settings") &&
    pathname !== "/settings";
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);

  // Auto-open submenus if on their routes
  useEffect(() => {
    setJobsSubmenuOpen(isJobsRouteActive);
    setSettingsSubmenuOpen(isSettingsRouteActive);
  }, [isJobsRouteActive, isSettingsRouteActive]);

  const menuItems = [
    {
      path: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      tooltip: "Dashboard",
    },
    {
      path: "/jobs/all-jobs",
      icon: Briefcase,
      label: "Jobs",
      tooltip: "Jobs",
      defaultPath: "/jobs/all-jobs",
      submenu: [
        {
          path: "/jobs/all-jobs",
          icon: Briefcase,
          label: "All Jobs",
        },
        {
          path: "/jobs/job-management",
          icon: Kanban,
          label: "Job Management",
        },
      ],
    },
    {
      path: "/team",
      icon: Users,
      label: "Team",
      tooltip: "Team",
    },
    {
      path: "/customers",
      icon: Handshake,
      label: "Customers",
      tooltip: "Customers",
    },
    {
      path: "/invoices",
      icon: Receipt,
      label: "Invoices",
      tooltip: "Invoices",
    },
    {
      path: "/audit",
      icon: FileText,
      label: "Audit Log",
      tooltip: "Audit Log",
    },
    {
      path: "/map",
      icon: MapPin,
      label: "Map",
      tooltip: "Map",
    },
    {
      path: "/calendar",
      icon: Calendar,
      label: "Calendar",
      tooltip: "Calendar",
    },
    {
      path: "/settings",
      icon: Settings,
      label: "Settings",
      tooltip: "Settings",
      defaultPath: "/settings/account",
      submenu: [
        {
          path: "/settings/account",
          icon: User,
          label: "Personal",
        },
        {
          path: "/settings/organization/general",
          icon: Building2,
          label: "Organization",
        },
        {
          path: "/settings/organization/billing",
          icon: Receipt,
          label: "Billing",
        },
        {
          path: "/settings/notifications",
          icon: Settings,
          label: "Notifications",
        },
        {
          path: "/settings/security/password",
          icon: Shield,
          label: "Security",
        },
      ],
    },
  ];
  const filteredMenuItems = menuItems
    .filter(
      (item) =>
        !(
          isLimitedRole &&
          (item.label === "Customers" || item.label === "Audit Log" || item.label === "Invoices")
        )
    )
    .map((item) => {
      if (!item.submenu) return item;
      const filteredSubmenu = isLimitedRole
        ? item.submenu.filter(
            (subItem) =>
              subItem.label !== "Organization" && subItem.label !== "Billing"
          )
        : item.submenu;
      return { ...item, submenu: filteredSubmenu };
    })
    .filter((item) => !(item.submenu && item.submenu.length === 0));

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      style={
        {
          "--header-height": "var(--header-h)",
        } as React.CSSProperties
      }
      className={`**:data-[slot=sidebar-container]:top-(--header-height)! **:data-[slot=sidebar-container]:h-[calc(100vh-var(--header-height))]! **:data-[slot=sidebar-container]:bottom-auto! mt-[var(--header-h)] h-[calc(100vh-var(--header-h))] border-none! bg-card/80! backdrop-blur-xl!`}
    >
      <SidebarContent className="pl-1.5">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isItemActive = isActive(item.path);
                const defaultPath = (item as any).defaultPath || item.path;

                // For items with submenu, check if any submenu item is active
                const isSubmenuActive =
                  hasSubmenu &&
                  item.submenu?.some((subItem) => isActive(subItem.path, true));
                const shouldBeOpen =
                  hasSubmenu &&
                  (isSubmenuActive ||
                    (item.path === "/jobs" && jobsSubmenuOpen) ||
                    (item.path === "/settings" &&
                      settingsSubmenuOpen));

                if (hasSubmenu) {
                  const isJobsItem = item.path === "/jobs";
                  const isSettingsItem = item.path === "/settings";

                  return (
                    <Collapsible
                      key={item.path}
                      open={shouldBeOpen}
                      onOpenChange={(open) => {
                        if (isJobsItem) {
                          setJobsSubmenuOpen(open);
                        } else if (isSettingsItem) {
                          setSettingsSubmenuOpen(open);
                        }
                      }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isSubmenuActive || isItemActive}
                          tooltip={item.tooltip}
                        >
                          <Link href={defaultPath}>
                            <Icon />
                            <span>{item.label}</span>

                            {/* CollapsibleTrigger for submenu */}
                            {state === "expanded" && (
                              <CollapsibleTrigger
                                asChild
                                className="ml-auto z-50"
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-200",
                                    // Inherit color from parent menu item state
                                    "text-sidebar-foreground/50 group-hover/menu-item:text-sidebar-accent-foreground/70",
                                    (isSubmenuActive || isItemActive) &&
                                      "text-sidebar-accent-foreground/70",
                                    shouldBeOpen && "rotate-90"
                                  )}
                                />
                              </CollapsibleTrigger>
                            )}
                          </Link>
                        </SidebarMenuButton>
                        <CollapsibleContent>
                          <SidebarMenuSub className="w-full translate-x-0 mx-0 px-0 border-none">
                            {item.submenu.map((subItem) => {
                              const SubIcon = subItem.icon;
                              return (
                                <SidebarMenuSubItem key={subItem.path} className="ml-3">
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(subItem.path, true)}
                                  >
                                    <Link href={subItem.path}>
                                      <SubIcon />
                                      <span>{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isItemActive}
                      tooltip={item.tooltip}
                    >
                      <Link href={item.path}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
