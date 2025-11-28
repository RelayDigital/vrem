"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Briefcase, MapPin, Calendar, Plus } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useJobCreation } from "@/context/JobCreationContext";

interface MenuItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const menuItems: MenuItem[] = [
  {
    path: "/dispatcher",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    path: "/dispatcher/jobs/all",
    icon: Briefcase,
    label: "Jobs",
  },
  {
    path: "/dispatcher/map",
    icon: MapPin,
    label: "Map",
  },
  {
    path: "/dispatcher/calendar",
    icon: Calendar,
    label: "Calendar",
  },
];

export function MobileMenuDock() {
  const pathname = usePathname();
  const router = useRouter();
  const jobCreation = useJobCreation();

  const isActive = (path: string) => {
    if (path === "/dispatcher") {
      return pathname === "/dispatcher";
    }
    return pathname?.startsWith(path);
  };

  const handleNewJobClick = () => {
    jobCreation.openJobCreationDialog();
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-card/95 backdrop-blur-xl shadow-lg"
      style={{ 
        height: 'var(--dock-h)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-screen-sm mx-auto">
        {/* First two menu items */}
        {menuItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-16 w-16 rounded-lg transition-colors relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              onClick={() => router.push(item.path)}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Center + button */}
        <button
          type="button"
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          onClick={handleNewJobClick}
          aria-label="Create new job"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Last two menu items */}
        {menuItems.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-16 w-16 rounded-lg transition-colors relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              onClick={() => router.push(item.path)}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

