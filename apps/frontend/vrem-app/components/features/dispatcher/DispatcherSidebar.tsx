"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../ui/sidebar";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  MapPin,
  Calendar,
} from "lucide-react";

interface DispatcherSidebarProps {
  currentView: "dashboard" | "jobs" | "team" | "audit" | "map" | "calendar";
  onViewChange: (
    view: "dashboard" | "jobs" | "team" | "audit" | "map" | "calendar"
  ) => void;
}

export function DispatcherSidebar({
  currentView,
  onViewChange,
}: DispatcherSidebarProps) {
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === "dashboard"}
                  onClick={() => onViewChange("dashboard")}
                  tooltip="Dashboard"
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === "jobs"}
                  onClick={() => onViewChange("jobs")}
                  tooltip="Jobs"
                >
                  <Briefcase />
                  <span>Jobs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === "team"}
                  onClick={() => onViewChange("team")}
                  tooltip="Team"
                >
                  <Users />
                  <span>Team</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === "audit"}
                  onClick={() => onViewChange("audit")}
                  tooltip="Audit Log"
                >
                  <FileText />
                  <span>Audit Log</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === "map"}
                  onClick={() => onViewChange("map")}
                  tooltip="Map"
                >
                  <MapPin />
                  <span>Map</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === "calendar"}
                  onClick={() => onViewChange("calendar")}
                  tooltip="Calendar"
                >
                  <Calendar />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
