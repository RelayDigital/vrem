"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Beaker,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
import { cn } from "../../ui/utils";

export function DispatcherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const [headerHeight, setHeaderHeight] = useState(73); // Default fallback

  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector("header");
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    // Measure on mount
    measureHeader();

    // Measure on resize
    window.addEventListener("resize", measureHeader);

    // Also use ResizeObserver for more accurate measurements
    const header = document.querySelector("header");
    let resizeObserver: ResizeObserver | null = null;

    if (header) {
      resizeObserver = new ResizeObserver(() => {
        measureHeader();
      });
      resizeObserver.observe(header);
    }

    return () => {
      window.removeEventListener("resize", measureHeader);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Determine if a route is active
  const isActive = (path: string) => {
    if (path === "/dispatcher") {
      return pathname === "/dispatcher";
    }
    return pathname?.startsWith(path);
  };

  // Check if jobs submenu should be open (if we're on any jobs route)
  const isJobsRouteActive = pathname?.startsWith("/dispatcher/jobs") && pathname !== "/dispatcher/jobs";
  const [jobsSubmenuOpen, setJobsSubmenuOpen] = useState(false);

  // Check if settings submenu should be open (if we're on any settings route)
  const isSettingsRouteActive = pathname?.startsWith("/dispatcher/settings") && pathname !== "/dispatcher/settings";
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);

  // Auto-open submenus if on their routes
  useEffect(() => {
    setJobsSubmenuOpen(isJobsRouteActive);
    setSettingsSubmenuOpen(isSettingsRouteActive);
  }, [isJobsRouteActive, isSettingsRouteActive]);

  const menuItems = [
    {
      path: "/dispatcher",
      icon: LayoutDashboard,
      label: "Dashboard",
      tooltip: "Dashboard",
    },
    {
      path: "/dispatcher/jobs/all",
      icon: Briefcase,
      label: "Jobs",
      tooltip: "Jobs",
      defaultPath: "/dispatcher/jobs/all",
      submenu: [
        {
          path: "/dispatcher/jobs/all",
          icon: Briefcase,
          label: "All Jobs",
        },
        {
          path: "/dispatcher/jobs/project-management",
          icon: Kanban,
          label: "Project Management",
        },
      ],
    },
    {
      path: "/dispatcher/team",
      icon: Users,
      label: "Team",
      tooltip: "Team",
    },
    {
      path: "/dispatcher/audit",
      icon: FileText,
      label: "Audit Log",
      tooltip: "Audit Log",
    },
    {
      path: "/dispatcher/map",
      icon: MapPin,
      label: "Map",
      tooltip: "Map",
    },
    {
      path: "/dispatcher/calendar",
      icon: Calendar,
      label: "Calendar",
      tooltip: "Calendar",
    },
    {
      path: "/dispatcher/settings",
      icon: Settings,
      label: "Settings",
      tooltip: "Settings",
      defaultPath: "/dispatcher/settings",
      submenu: [
        {
          path: "/dispatcher/settings/personal",
          icon: User,
          label: "Personal",
        },
        {
          path: "/dispatcher/settings/account",
          icon: Building2,
          label: "Account",
        },
        {
          path: "/dispatcher/settings/product",
          icon: Beaker,
          label: "Product",
        },
      ],
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      style={
        {
          "--header-height": `${headerHeight}px`,
        } as React.CSSProperties
      }
      className={`**:data-[slot=sidebar-container]:top-(--header-height)! **:data-[slot=sidebar-container]:h-[calc(100vh-var(--header-height))]! **:data-[slot=sidebar-container]:bottom-auto!`}
    >
      <SidebarContent style={{ paddingTop: `${headerHeight}px` }}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isItemActive = isActive(item.path);
                const defaultPath = (item as any).defaultPath || item.path;
                
                // For items with submenu, check if any submenu item is active
                const isSubmenuActive = hasSubmenu && item.submenu?.some(subItem => isActive(subItem.path));
                const shouldBeOpen = hasSubmenu && (
                  isSubmenuActive || 
                  (item.path === "/dispatcher/jobs/all" && jobsSubmenuOpen) ||
                  (item.path === "/dispatcher/settings" && settingsSubmenuOpen)
                );

                if (hasSubmenu) {
                  const isJobsItem = item.path === "/dispatcher/jobs/all";
                  const isSettingsItem = item.path === "/dispatcher/settings";
                  
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
                        <div className="flex items-center w-full relative group/menu-item">
                          <SidebarMenuButton
                            asChild
                            isActive={isSubmenuActive || isItemActive}
                            tooltip={item.tooltip}
                            className="flex-1 pr-8"
                          >
                            <Link href={defaultPath}>
                              <Icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                          {state === "expanded" && (
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 p-0 flex items-center justify-center rounded-sm transition-transform pointer-events-auto z-10 hover:bg-transparent focus:bg-transparent active:bg-transparent focus:outline-none"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isJobsItem) {
                                    setJobsSubmenuOpen(!jobsSubmenuOpen);
                                  } else if (isSettingsItem) {
                                    setSettingsSubmenuOpen(!settingsSubmenuOpen);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  // Prevent the menu item click from firing
                                  e.stopPropagation();
                                }}
                              >
                                <ChevronRight className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-200",
                                  // Inherit color from parent menu item state
                                  "text-sidebar-foreground/50 group-hover/menu-item:text-sidebar-accent-foreground/70",
                                  (isSubmenuActive || isItemActive) && "text-sidebar-accent-foreground/70",
                                  shouldBeOpen && "rotate-90"
                                )} />
                              </button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => {
                              const SubIcon = subItem.icon;
                              return (
                                <SidebarMenuSubItem key={subItem.path}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(subItem.path)}
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
