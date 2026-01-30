"use client";

import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { TeamLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { AccessDenied } from "@/components/common/AccessDenied";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsRightContentSection } from "@/components/shared/settings/SettingsRightContentSection";
import { Receipt, Sparkles, Check } from "lucide-react";

export default function OrganizationBillingPage() {
  const {
    user,
    isLoading,
    isAllowed,
  } = useRoleGuard(["COMPANY", "PROJECT_MANAGER"]);
  const router = useRouter();

  if (isLoading) {
    return <TeamLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (!isAllowed) {
    return (
      <AccessDenied
        title="Access Denied"
        description="You do not have permission to view billing settings. Please contact your administrator."
      />
    );
  }

  return (
    <SettingsRightContentSection
      id="billing"
      title="Billing"
      description="Manage your subscription and billing information."
    >
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <CardDescription>Your organization's subscription</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Free
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are currently on the Free plan. All core features are included.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Team management
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Calendar & scheduling
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Invoicing
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Delivery portal
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice History</CardTitle>
          <CardDescription>
            View and manage invoices for your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => router.push("/invoices")}
          >
            <Receipt className="h-4 w-4 mr-2" />
            View Invoices
          </Button>
        </CardContent>
      </Card>
    </SettingsRightContentSection>
  );
}
