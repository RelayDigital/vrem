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
} from "lucide-react";
import type { SettingsConfig } from "./SettingsView";

// All available settings options
const allSettingsOptions = {
  "personal-details": {
    id: "personal-details" as const,
    icon: User,
    title: "Personal details",
    description:
      "Contact information, password, authentication methods, and your active sessions.",
    category: "personal" as const,
  },
  "communication-preferences": {
    id: "communication-preferences" as const,
    icon: Mail,
    title: "Communication preferences",
    description:
      "Customize the emails, SMS, and push notifications you receive.",
    category: "personal" as const,
  },
  developers: {
    id: "developers" as const,
    icon: Monitor,
    title: "Developers",
    description: "Workbench, developer tools, and more.",
    category: "personal" as const,
  },
  business: {
    id: "business" as const,
    icon: Building2,
    title: "Business",
    description:
      "Account details, account health, public info, payouts, legal entity, custom domains, and more.",
    category: "account" as const,
  },
  "team-and-security": {
    id: "team-and-security" as const,
    icon: Shield,
    title: "Team and security",
    description:
      "Team members, roles, account security, authorized apps, and shared resources.",
    category: "account" as const,
  },
  "company-profile": {
    id: "company-profile" as const,
    icon: Globe,
    title: "Company profile",
    description: "Manage how you show up to other businesses.",
    category: "account" as const,
  },
  "your-plans": {
    id: "your-plans" as const,
    icon: FileCheck,
    title: "Your plans",
    description: "Manage how you pay for services.",
    category: "account" as const,
  },
  "compliance-and-documents": {
    id: "compliance-and-documents" as const,
    icon: FileDown,
    title: "Compliance and documents",
    description: "PCI compliance, documents, and legacy exports.",
    category: "account" as const,
  },
  "account-features-and-previews": {
    id: "account-features-and-previews" as const,
    icon: Beaker,
    title: "Account features and previews",
    description: "View your account features and product previews.",
    category: "account" as const,
  },
  perks: {
    id: "perks" as const,
    icon: Star,
    title: "Perks",
    description: "Discounts on tools to run your startup.",
    category: "account" as const,
  },
  billing: {
    id: "billing" as const,
    icon: Receipt,
    title: "Billing",
    description: "Subscriptions, invoices, quotes, and customer portal.",
    category: "product" as const,
  },
  payments: {
    id: "payments" as const,
    icon: CreditCard,
    title: "Payments",
    description:
      "Checkout, payment methods, currency conversion, and more.",
    category: "product" as const,
  },
  tax: {
    id: "tax" as const,
    icon: Clock,
    title: "Tax",
    description:
      "Origin address, preset tax code, default tax behavior, and tax integrations.",
    category: "product" as const,
  },
  "data-pipeline": {
    id: "data-pipeline" as const,
    icon: FileDown,
    title: "Data Pipeline",
    description:
      "Data warehouse and contact for updates on data processing.",
    category: "product" as const,
  },
  security: {
    id: "security" as const,
    icon: ShieldCheck,
    title: "Security",
    description:
      "Manage fraud protection and customization capabilities for your account.",
    category: "product" as const,
  },
  "discover-more-features": {
    id: "discover-more-features" as const,
    icon: Plus,
    title: "Discover more features",
    description: "Boost revenue, manage finances, and more.",
    category: "product" as const,
    className: "bg-muted/50 border-dashed",
  },
  integrations: {
    id: "integrations" as const,
    icon: Building,
    title: "Integrations",
    description:
      "Appearance, featured institutions, optimizations, and usage details.",
    category: "product" as const,
  },
  "api-and-webhooks": {
    id: "api-and-webhooks" as const,
    icon: Code,
    title: "API & Webhooks",
    description: "Manage your API features and webhook configurations.",
    category: "product" as const,
  },
};

// Helper function to create settings config from option IDs
function createSettingsConfig(
  optionIds: Array<keyof typeof allSettingsOptions>
): SettingsConfig {
  const personal: typeof allSettingsOptions[keyof typeof allSettingsOptions][] =
    [];
  const account: typeof allSettingsOptions[keyof typeof allSettingsOptions][] =
    [];
  const product: typeof allSettingsOptions[keyof typeof allSettingsOptions][] =
    [];

  optionIds.forEach((id) => {
    const option = allSettingsOptions[id];
    if (option.category === "personal") {
      personal.push(option);
    } else if (option.category === "account") {
      account.push(option);
    } else if (option.category === "product") {
      product.push(option);
    }
  });

  return { personal, account, product };
}

// Predefined configurations for each account type
export const dispatcherSettingsConfig: SettingsConfig = createSettingsConfig([
  "personal-details",
  "communication-preferences",
  "developers",
  "business",
  "team-and-security",
  "company-profile",
  "your-plans",
  "compliance-and-documents",
  "account-features-and-previews",
  "perks",
  "billing",
  "payments",
  "tax",
  "data-pipeline",
  "security",
  "discover-more-features",
  "integrations",
  "api-and-webhooks",
]);

export const agentSettingsConfig: SettingsConfig = createSettingsConfig([
  "personal-details",
  "communication-preferences",
  "billing",
  "payments",
  "security",
]);

export const photographerSettingsConfig: SettingsConfig = createSettingsConfig([
  "personal-details",
  "communication-preferences",
  "billing",
  "payments",
  "security",
  "integrations",
]);

