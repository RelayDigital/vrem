"use client";

import { H2, H3, P } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import {
  User,
  Mail,
  Monitor,
  Building2,
  Shield,
  Globe,
  FileCheck,
  Beaker,
  Star,
  Receipt,
  CreditCard,
  Clock,
  FileDown,
  ShieldCheck,
  Plus,
  Building,
  Code,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSubView =
  | null
  | "personal-details"
  | "communication-preferences"
  | "developers"
  | "business"
  | "team-and-security"
  | "company-profile"
  | "your-plans"
  | "compliance-and-documents"
  | "account-features-and-previews"
  | "perks"
  | "billing"
  | "payments"
  | "tax"
  | "data-pipeline"
  | "security"
  | "discover-more-features"
  | "integrations"
  | "api-and-webhooks";

export interface SettingsOption {
  id: SettingsSubView;
  icon: LucideIcon;
  title: string;
  description: string;
  category: "personal" | "account" | "product";
  className?: string;
}

export interface SettingsConfig {
  personal: SettingsOption[];
  account: SettingsOption[];
  product: SettingsOption[];
}

export type AccountType = "dispatcher" | "agent" | "technician";

interface SettingsViewProps {
  subView?: SettingsSubView;
  onNavigate?: (subView: SettingsSubView) => void;
  config: SettingsConfig;
  accountType: AccountType;
  componentRegistry?: SettingsSubViewComponents;
}

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  onClick?: () => void;
}

function SettingsCard({
  icon,
  title,
  description,
  className,
  onClick,
}: SettingsCardProps) {
  return (
    <Card
      variant="outline"
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <H3 className="text-base font-semibold text-foreground">{title}</H3>
          </div>
          <P className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </P>
        </div>
      </CardContent>
    </Card>
  );
}

const getSubViewTitle = (view: SettingsSubView): string => {
  const titles: Record<string, string> = {
    "personal-details": "Personal details",
    "communication-preferences": "Communication preferences",
    developers: "Developers",
    business: "Business",
    "team-and-security": "Team and security",
    "company-profile": "Company profile",
    "your-plans": "Your plans",
    "compliance-and-documents": "Compliance and documents",
    "account-features-and-previews": "Account features and previews",
    perks: "Perks",
    billing: "Billing",
    payments: "Payments",
    tax: "Tax",
    "data-pipeline": "Data Pipeline",
    security: "Security",
    "discover-more-features": "Discover more features",
    integrations: "Integrations",
    "api-and-webhooks": "API & Webhooks",
  };
  return titles[view || ""] || "Settings";
};

// Component registry type for account-specific settings sub-views
export type SettingsSubViewComponents = Partial<
  Record<Exclude<SettingsSubView, null>, React.ComponentType<any>>
>;

// Component resolver for account-specific settings sub-views
// This will be populated by each account type's settings index file
function getSettingsSubViewComponent(
  accountType: AccountType,
  subView: SettingsSubView,
  componentRegistry?: SettingsSubViewComponents
): React.ComponentType<any> | null {
  if (!subView) return null;

  // First check if a component registry was provided
  if (componentRegistry && componentRegistry[subView]) {
    return componentRegistry[subView];
  }

  // Fallback: try to dynamically import (for backwards compatibility)
  const componentName = subView
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  try {
    switch (accountType) {
      case "dispatcher":
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(`@/components/features/dispatcher/settings/${componentName}`)
          .default;
      case "agent":
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(`@/components/features/agent/settings/${componentName}`)
          .default;
      case "technician":
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(
          `@/components/features/technician/settings/${componentName}`
        ).default;
      default:
        return null;
    }
  } catch (error) {
    // Component doesn't exist yet, return null to show placeholder
    return null;
  }
}

function SettingsSubViewContent({
  subView,
  onNavigate,
  accountType,
  componentRegistry,
}: {
  subView: SettingsSubView;
  onNavigate?: (subView: SettingsSubView) => void;
  accountType: AccountType;
  componentRegistry?: SettingsSubViewComponents;
}) {
  const SubViewComponent = getSettingsSubViewComponent(
    accountType,
    subView,
    componentRegistry
  );

  return (
    <div className="mt-md">
      <div className="mb-md flex items-baseline justify-between">
        <H2 className="border-0">{getSubViewTitle(subView)}</H2>
      </div>
      {SubViewComponent ? (
        <SubViewComponent />
      ) : (
        <Card>
          <CardContent className="p-6">
            <P className="text-muted-foreground">
              This is the {getSubViewTitle(subView)} settings page. Content will
              be added here.
            </P>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SettingsView({
  subView = null,
  onNavigate,
  config,
  accountType,
  componentRegistry,
}: SettingsViewProps) {
  const handleCardClick = (view: SettingsSubView) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  // If a sub-view is selected, show that view
  if (subView) {
    return (
      <main className="container relative mx-auto">
        <article className="flex flex-col gap-2xl md:gap-3xl px-md">
          {/* Breadcrumb */}
          <div className="@container w-full mt-md">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/settings/profile">Settings</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getSubViewTitle(subView)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

            <SettingsSubViewContent
              subView={subView}
              onNavigate={onNavigate}
              accountType={accountType}
              componentRegistry={componentRegistry}
            />
          </div>
        </article>
      </main>
    );
  }

  // Main settings page
  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Personal settings */}
        {config.personal.length > 0 && (
          <div className="@container w-full mt-md">
            <div className="mb-md flex items-baseline justify-between">
              <H2 className="border-0">Personal settings</H2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.personal.map((option) => {
                const Icon = option.icon;
                return (
                  <SettingsCard
                    key={option.id}
                    icon={<Icon className="h-5 w-5" />}
                    title={option.title}
                    description={option.description}
                    className={option.className}
                    onClick={() => handleCardClick(option.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Account settings */}
        {config.account.length > 0 && (
          <div className="@container w-full">
            <div className="mb-md flex items-baseline justify-between">
              <H2 className="border-0">Account settings</H2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.account.map((option) => {
                const Icon = option.icon;
                return (
                  <SettingsCard
                    key={option.id}
                    icon={<Icon className="h-5 w-5" />}
                    title={option.title}
                    description={option.description}
                    className={option.className}
                    onClick={() => handleCardClick(option.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Product settings */}
        {config.product.length > 0 && (
          <div className="@container w-full">
            <div className="mb-md flex items-baseline justify-between">
              <H2 className="border-0">Product settings</H2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.product.map((option) => {
                const Icon = option.icon;
                return (
                  <SettingsCard
                    key={option.id}
                    icon={<Icon className="h-5 w-5" />}
                    title={option.title}
                    description={option.description}
                    className={option.className}
                    onClick={() => handleCardClick(option.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="@container w-full mb-md">
          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Share feedback
              </a>
              <span>·</span>
              <a href="#" className="hover:text-foreground transition-colors">
                Keyboard shortcuts
              </a>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}

