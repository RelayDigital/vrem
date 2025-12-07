"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import {
  User,
  Building2,
  Package,
  Shield,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toEffectiveRole } from "@/lib/roles";

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: {
    id: string;
    label: string;
    path: string;
    roles?: string[]; // If not specified, available to all
  }[];
}

const settingsSections: SettingsSection[] = [
  {
    id: "personal",
    label: "Personal",
    icon: User,
    items: [
      // { id: "profile", label: "Profile", path: "/settings/profile" },
      { id: "account", label: "Account", path: "/settings/account" },
      {
        id: "notifications",
        label: "Notifications",
        path: "/settings/notifications",
      },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    items: [
      {
        id: "general",
        label: "General",
        path: "/settings/organization/general",
        roles: ["OWNER", "ADMIN"],
      },
      {
        id: "members",
        label: "Members",
        path: "/settings/organization/members",
        roles: ["OWNER", "ADMIN"],
      },
      {
        id: "billing",
        label: "Billing",
        path: "/settings/organization/billing",
        roles: ["OWNER", "ADMIN"],
      },
      {
        id: "integrations",
        label: "Integrations",
        path: "/settings/organization/integrations",
        roles: ["OWNER", "ADMIN"],
      },
    ],
  },
  {
    id: "product",
    label: "Product",
    icon: Package,
    items: [
      {
        id: "features",
        label: "Features",
        path: "/settings/product/features",
        roles: ["OWNER", "ADMIN"],
      },
      {
        id: "plans",
        label: "Plans",
        path: "/settings/product/plans",
        roles: ["OWNER", "ADMIN"],
      },
      {
        id: "usage",
        label: "Usage",
        path: "/settings/product/usage",
        roles: ["OWNER", "ADMIN"],
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    items: [
      {
        id: "password",
        label: "Password",
        path: "/settings/security/password",
      },
      {
        id: "sessions",
        label: "Sessions",
        path: "/settings/security/sessions",
      },
      {
        id: "api-keys",
        label: "API Keys",
        path: "/settings/security/api-keys",
      },
      { id: "2fa", label: "2FA", path: "/settings/security/2fa" },
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: SettingsIcon,
    items: [
      {
        id: "appearance",
        label: "Appearance",
        path: "/settings/preferences/appearance",
      },
      {
        id: "language",
        label: "Language",
        path: "/settings/preferences/language",
      },
      {
        id: "timezone",
        label: "Timezone",
        path: "/settings/preferences/timezone",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: HelpCircle,
    items: [
      {
        id: "help-center",
        label: "Help Center",
        path: "/settings/support/help-center",
      },
      { id: "contact", label: "Contact", path: "/settings/support/contact" },
      {
        id: "changelog",
        label: "Changelog",
        path: "/settings/support/changelog",
      },
    ],
  },
];

const deriveRoleFromMembership = (
  membership: any,
  fallback: string | undefined
): "COMPANY" | "TECHNICIAN" | "AGENT" => {
  if (!membership) return toEffectiveRole(fallback);
  const orgType =
    membership.organization?.type ||
    (membership as any)?.organizationType ||
    "";
  if (orgType === "PERSONAL") return "COMPANY";
  const roleUpper = (
    membership.role ||
    (membership as any)?.orgRole ||
    fallback ||
    ""
  ).toUpperCase();
  return toEffectiveRole(roleUpper);
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, memberships, activeOrganizationId } = useAuth();

  // Determine which section is active
  const getActiveSection = () => {
    if (pathname?.startsWith("/settings/organization")) return "organization";
    if (pathname?.startsWith("/settings/product")) return "product";
    if (pathname?.startsWith("/settings/security")) return "security";
    if (pathname?.startsWith("/settings/preferences")) return "preferences";
    if (pathname?.startsWith("/settings/support")) return "support";
    if (
      pathname?.startsWith("/settings/account") ||
      pathname?.startsWith("/settings/notifications") ||
      pathname?.startsWith("/settings/profile")
    )
      return "personal";
    return "personal";
  };

  // Check if profile page is active (for highlighting personal section even though profile isn't in sidebar)
  const isProfileActive = pathname === "/settings/profile";

  const activeSection = getActiveSection();
  const [openSections, setOpenSections] = useState<string[]>([activeSection]);

  // Auto-open active section
  useEffect(() => {
    if (activeSection && !openSections.includes(activeSection)) {
      setOpenSections([...openSections, activeSection]);
    }
  }, [activeSection]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isItemAllowed = (item: SettingsSection["items"][0]) => {
    if (!item.roles) return true; // Available to all
    if (!user) return false;
    const membership = memberships.find(
      (m) => m.orgId === activeOrganizationId
    );
    const effectiveRole =
      deriveRoleFromMembership(membership, user.accountType) ||
      user.accountType;
    const normalizedRoles = item.roles.map((role) => toEffectiveRole(role));
    return normalizedRoles.includes(toEffectiveRole(effectiveRole));
  };

  const filteredSections = settingsSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isItemAllowed),
    }))
    .filter((section) => section.items.length > 0);

  // Flatten all items for mobile navigation
  const allSettingsItems = useMemo(() => {
    return filteredSections.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        sectionId: section.id,
        sectionLabel: section.label,
        sectionIcon: section.icon,
      }))
    );
  }, [filteredSections]);

  // Find current item index for mobile pagination
  const currentItemIndex = useMemo(() => {
    const index = allSettingsItems.findIndex((item) => item.path === pathname);
    return index >= 0 ? index : 0;
  }, [allSettingsItems, pathname]);

  const router = useRouter();

  // Mobile navigation handlers
  const handleMobileNavigation = (path: string) => {
    router.push(path);
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      router.push(allSettingsItems[currentItemIndex - 1].path);
    }
  };

  const handleNext = () => {
    if (currentItemIndex < allSettingsItems.length - 1) {
      router.push(allSettingsItems[currentItemIndex + 1].path);
    }
  };

  const currentItem = allSettingsItems[currentItemIndex] || allSettingsItems[0];

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Mobile Navigation - Only visible on mobile */}
        <div className="md:hidden w-full mt-md mb-md">
          <div className="space-y-4">
            <div>
              <H2 className="text-2xl mb-2">Settings</H2>
              <Muted className="text-sm">
                Manage your account settings and preferences.
              </Muted>
            </div>

            {/* Settings Selector */}
            <Select
              value={pathname || currentItem?.path}
              onValueChange={handleMobileNavigation}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {currentItem
                    ? (() => {
                        const Icon = currentItem.sectionIcon;
                        return (
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{currentItem.label}</span>
                          </div>
                        );
                      })()
                    : "Select a setting"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredSections.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <div key={section.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <SectionIcon className="h-4 w-4 mr-2" />
                        {section.label}
                      </div>
                      {section.items.map((item) => (
                        <SelectItem key={item.id} value={item.path}>
                          <div className="flex items-center gap-2">
                            <span>{item.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Pagination Controls */}
            {allSettingsItems.length > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentItemIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground px-2">
                  {currentItemIndex + 1} of {allSettingsItems.length}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentItemIndex === allSettingsItems.length - 1}
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="@container flex flex-col md:flex-row gap-2xl md:gap-3xl w-full mt-md mb-md">
          {/* Left Column - Navigation (Desktop only) */}
          <aside className="hidden md:block w-64 shrink-0 md:sticky top-[calc(var(--header-h)+2rem)] h-fit">
            <div className="space-y-2">
              <div className="mb-6">
                <H2 className="text-2xl mb-2">Settings</H2>
                <Muted className="text-sm">
                  Manage your account settings and preferences.
                </Muted>
              </div>
              <nav className="space-y-1">
                {filteredSections.map((section) => {
                  const SectionIcon = section.icon;
                  const isOpen = openSections.includes(section.id);
                  const hasActiveItem =
                    section.items.some((item) => pathname === item.path) ||
                    (section.id === "personal" && isProfileActive);

                  return (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                          hasActiveItem
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <SectionIcon className="h-4 w-4" />
                          <span>{section.label}</span>
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform duration-200 ml-auto",
                              // Inherit color from parent menu item state
                              "text-sidebar-foreground/50 group-hover/menu-item:text-sidebar-accent-foreground/70",
                              isOpen && "text-sidebar-accent-foreground/70",
                              isOpen && "rotate-90"
                            )}
                          />
                        </div>
                      </button>
                      {isOpen && (
                        <SidebarMenuSub className="w-full translate-x-0 mx-0 px-0 border-none">
                          {section.items.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                              <SidebarMenuSubItem
                                key={item.id}
                                className="ml-3"
                              >
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive}
                                >
                                  <Link href={item.path}>
                                    <span>{item.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Right Column - Content */}
          <div className="@container w-full">
            <div className="@container w-full flex flex-col gap-2xl md:gap-3xl">
              {children}
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
