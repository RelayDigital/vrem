"use client";

import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Plus,
  Package,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useJobCreation } from "@/context/JobCreationContext";
import { UIContext, NavItem } from "@/lib/roles";

// Icon mapping for nav items
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Briefcase,
  MapPin,
  Calendar,
  Package,
  MessageSquare,
};

// Default menu items for company orgs (sidebar layout)
const companyMenuItems = [
  { path: "/dashboard", icon: "LayoutDashboard", label: "Dashboard" },
  { path: "/jobs", icon: "Briefcase", label: "Jobs" },
  { path: "/map", icon: "MapPin", label: "Map" },
  { path: "/calendar", icon: "Calendar", label: "Calendar" },
];

interface MobileMenuDockProps {
  uiContext?: UIContext;
}

export function MobileMenuDock({ uiContext }: MobileMenuDockProps) {
  const pathname = usePathname();
  const router = useRouter();
  const jobCreation = useJobCreation();

  // Get context values with defaults
  const { 
    showSidebar = true, 
    navItems = [], 
    canCreateOrder = false, 
    createActionPath = '/jobs/new',
    accountType = 'AGENT' 
  } = uiContext || {};

  // Use appropriate menu items based on context
  const menuItems: NavItem[] = showSidebar 
    ? companyMenuItems 
    : navItems.length > 0 
      ? navItems 
      : companyMenuItems;

  // Take first 4 items for mobile dock
  const dockItems = menuItems.slice(0, 4);

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    if (path === "/orders") return pathname === "/orders" || pathname?.startsWith("/orders/");
    if (path === "/jobs" || path === "/jobs/all-jobs") return pathname?.startsWith("/jobs");
    return pathname?.startsWith(path);
  };

  const handleCreateAction = () => {
    if (accountType === 'AGENT') {
      router.push(createActionPath);
    } else {
      jobCreation.openJobCreationDialog();
    }
  };

  // Determine if we should show the create button
  // For agents: always show (they can create orders)
  // For providers in personal org: don't show (they receive jobs)
  // For company orgs: only OWNER/ADMIN can create
  const showCreateButton = canCreateOrder || accountType === 'AGENT';

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
        {dockItems.slice(0, 2).map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 size-16 rounded-lg transition-colors relative",
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
        {showCreateButton && (
          <button
            type="button"
            className="size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
            onClick={handleCreateAction}
            aria-label={accountType === 'AGENT' ? "Create order" : "Create new job"}
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {/* Last two menu items */}
        {dockItems.slice(2, 4).map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 size-16 rounded-lg transition-colors relative",
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
