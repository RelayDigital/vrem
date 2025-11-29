"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

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
      // Profile is not shown in sidebar - only accessible via avatar dropdown
      { id: "account", label: "Account", path: "/settings/account" },
      { id: "notifications", label: "Notifications", path: "/settings/notifications" },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    items: [
      { id: "general", label: "General", path: "/settings/organization/general", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
      { id: "members", label: "Members", path: "/settings/organization/members", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
      { id: "billing", label: "Billing", path: "/settings/organization/billing", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
      { id: "integrations", label: "Integrations", path: "/settings/organization/integrations", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
    ],
  },
  {
    id: "product",
    label: "Product",
    icon: Package,
    items: [
      { id: "features", label: "Features", path: "/settings/product/features", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
      { id: "plans", label: "Plans", path: "/settings/product/plans", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
      { id: "usage", label: "Usage", path: "/settings/product/usage", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    items: [
      { id: "password", label: "Password", path: "/settings/security/password" },
      { id: "sessions", label: "Sessions", path: "/settings/security/sessions" },
      { id: "api-keys", label: "API Keys", path: "/settings/security/api-keys", roles: ["dispatcher", "ADMIN", "PROJECT_MANAGER"] },
      { id: "2fa", label: "2FA", path: "/settings/security/2fa" },
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: SettingsIcon,
    items: [
      { id: "appearance", label: "Appearance", path: "/settings/preferences/appearance" },
      { id: "language", label: "Language", path: "/settings/preferences/language" },
      { id: "timezone", label: "Timezone", path: "/settings/preferences/timezone" },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: HelpCircle,
    items: [
      { id: "help-center", label: "Help Center", path: "/settings/support/help-center" },
      { id: "contact", label: "Contact", path: "/settings/support/contact" },
      { id: "changelog", label: "Changelog", path: "/settings/support/changelog" },
    ],
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Determine which section is active
  const getActiveSection = () => {
    if (pathname?.startsWith("/settings/organization")) return "organization";
    if (pathname?.startsWith("/settings/product")) return "product";
    if (pathname?.startsWith("/settings/security")) return "security";
    if (pathname?.startsWith("/settings/preferences")) return "preferences";
    if (pathname?.startsWith("/settings/support")) return "support";
    if (pathname?.startsWith("/settings/account") || pathname?.startsWith("/settings/notifications") || pathname?.startsWith("/settings/profile")) return "personal";
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
    return item.roles.includes(user.role);
  };

  const filteredSections = settingsSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isItemAllowed),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container flex flex-col md:flex-row gap-2xl md:gap-3xl w-full mt-md">
          {/* Left Sidebar - Navigation */}
          <aside className="w-64 shrink-0 md:sticky top-[calc(var(--header-h)+2rem)] h-fit">
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
                  const hasActiveItem = section.items.some(
                    (item) => pathname === item.path
                  ) || (section.id === "personal" && isProfileActive);

                  return (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between",
                          hasActiveItem
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <SectionIcon className="h-4 w-4" />
                          <span>{section.label}</span>
                        </div>
                        <span
                          className={cn(
                            "transition-transform text-xs",
                            isOpen ? "rotate-90" : ""
                          )}
                        >
                          ▶
                        </span>
                      </button>
                      {isOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {section.items.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                              <Link
                                key={item.id}
                                href={item.path}
                                className={cn(
                                  "block px-3 py-1.5 text-sm rounded-md transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                              >
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="@container w-full flex-1">
            {children}
          </div>
        </div>
      </article>
    </main>
  );
}

