"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { AgentBookingFlow, AgentJobData } from "@/components/features/agent/AgentBookingFlow";
import { Technician, Organization, Project } from "@/types";
import { toast } from "sonner";
import { DashboardLoadingSkeleton } from "@/components/shared/loading/CompanyLoadingSkeletons";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { H1, H2, P, Muted } from "@/components/ui/typography";
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Building2,
  Package,
  ArrowRight,
  Plus,
  Home,
  Clock,
} from "lucide-react";

interface OrderSuccessData {
  project: Project;
  providerName: string;
  address: string;
  scheduledDate?: string;
  scheduledTime?: string;
  packageName?: string;
  schedulingMode: 'scheduled' | 'requested';
}

function OrderSuccessScreen({
  data,
  onViewDashboard,
  onCreateAnother,
}: {
  data: OrderSuccessData;
  onViewDashboard: () => void;
  onCreateAnother: () => void;
}) {
  const isScheduled = data.schedulingMode === 'scheduled';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <div className="w-full max-w-lg space-y-8">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-2"
        >
          <H1 className="text-2xl md:text-3xl">Order Submitted!</H1>
          <P className="text-muted-foreground">
            Your order has been sent to <strong>{data.providerName}</strong>
          </P>
        </motion.div>

        {/* Order Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-2">
            <CardHeader className="pb-3">
              <H2 className="text-base border-0">Order Summary</H2>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider */}
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Muted className="text-xs">Provider</Muted>
                  <P className="text-sm font-medium">{data.providerName}</P>
                </div>
              </div>

              {/* Package */}
              {data.packageName && (
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Muted className="text-xs">Package</Muted>
                    <P className="text-sm font-medium">{data.packageName}</P>
                  </div>
                </div>
              )}

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Muted className="text-xs">Location</Muted>
                  <P className="text-sm font-medium">{data.address}</P>
                </div>
              </div>

              {/* Schedule */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Muted className="text-xs">Schedule</Muted>
                  {isScheduled ? (
                    <P className="text-sm font-medium">
                      {data.scheduledDate} at {data.scheduledTime}
                    </P>
                  ) : (
                    <P className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      To be scheduled by provider
                    </P>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-muted/50 rounded-xl p-4 space-y-3"
        >
          <H2 className="text-sm font-medium border-0">What happens next?</H2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>{data.providerName} will review your order</span>
            </li>
            {!isScheduled && (
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>They will contact you to confirm the schedule</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>A technician will be assigned to your shoot</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>You will receive updates as the job progresses</span>
            </li>
          </ul>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            variant="outline"
            onClick={onCreateAnother}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Another Order
          </Button>
          <Button onClick={onViewDashboard} className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            View Dashboard
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function BookingPage() {
  const router = useRouter();
  const { user, isLoading, organizationId, memberships } = useRequireRole([
    "AGENT",
    "COMPANY",
  ]);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [companies, setCompanies] = useState<Organization[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessData | null>(null);

  // Determine if user is an agent
  const isAgent = user?.accountType?.toUpperCase() === "AGENT";

  // Fetch technicians and companies for the booking flow
  // Agents don't need technicians - they select a provider org instead
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user) return;

      setLoadingData(true);
      try {
        // Only fetch technicians for COMPANY users, not agents
        // Agents select a provider org via ProviderStep, not individual technicians
        if (!isAgent) {
          const techs = await fetchOrganizationTechnicians();
          if (!cancelled) {
            setTechnicians(techs);
          }
        }

        // Fetch companies (organizations that can fulfill orders)
        // For now, use empty array - this can be expanded later
        if (!cancelled) {
          setCompanies([]);
        }
      } catch (error) {
        console.error("Failed to load booking data:", error);
        if (!cancelled) {
          setTechnicians([]);
          setCompanies([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user, isAgent]);

  // Get preferred vendors (could be from user preferences or org settings)
  const preferredVendors = useMemo(() => {
    // For now, return empty array - can be populated from user/org settings
    return [];
  }, []);

  const handleJobCreate = async (job: AgentJobData) => {
    if (!user) {
      toast.error("Unable to create order. Please try again.");
      return;
    }

    // Agent flow requires a provider org
    if (!job.providerOrgId) {
      toast.error("Please select a service provider.");
      return;
    }

    // Agent flow requires a package selection
    if (!job.packageId) {
      toast.error("Please select a package.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build scheduled time ISO string from date and time
      // For 'requested' scheduling mode, use current time as placeholder
      const isRequestedScheduling = job.schedulingMode === 'requested';
      const scheduledTime = isRequestedScheduling
        ? new Date().toISOString()
        : job.scheduledDate && job.scheduledTime
          ? new Date(`${job.scheduledDate}T${job.scheduledTime}`).toISOString()
          : new Date().toISOString();

      // Generate idempotency key to prevent duplicate submissions
      const idempotencyKey = `${user.id}-${job.providerOrgId}-${job.addressLine1 || job.propertyAddress}-${Date.now()}`;

      const orderPayload = {
        // Agent flow: specify the provider org
        providerOrgId: job.providerOrgId,
        // Address - use parsed components from Mapbox, fallback to full address string
        addressLine1: job.addressLine1 || job.propertyAddress || "",
        city: job.city,
        region: job.region,
        postalCode: job.postalCode,
        countryCode: job.countryCode,
        lat: job.location?.lat,
        lng: job.location?.lng,
        // Scheduling
        scheduledTime,
        estimatedDuration: job.estimatedDuration || 120,
        schedulingMode: job.schedulingMode || 'scheduled',
        // Service details
        mediaTypes: job.mediaType || [],
        priority: job.priority || "standard",
        notes: job.requirements || "",
        // Idempotency key for duplicate prevention
        idempotencyKey,
      };

      // Create order - backend returns either a project or a checkout redirect
      const result = await api.orders.create(orderPayload);

      // If the provider requires upfront payment, redirect to Stripe Checkout
      if ('requiresPayment' in result && result.requiresPayment && result.checkoutUrl) {
        toast.info("Redirecting to payment...");
        window.location.href = result.checkoutUrl;
        return;
      }

      // Direct order creation (NO_PAYMENT or INVOICE_AFTER_DELIVERY modes)
      // Dispatch event to refresh job lists across the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orderCreated'));
      }

      // Show success screen
      const orderResult = result as { project: any; customer: any; calendarEvent: any; isNewCustomer: boolean };
      setOrderSuccess({
        project: orderResult.project,
        providerName: job.providerName || 'Provider',
        address: job.propertyAddress || job.addressLine1 || 'Address',
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime,
        packageName: job.packageName,
        schedulingMode: job.schedulingMode || 'scheduled',
      });

      toast.success("Order submitted successfully!");
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  const handleViewDashboard = () => {
    router.push("/dashboard");
  };

  const handleCreateAnother = () => {
    setOrderSuccess(null);
  };

  if (isLoading || loadingData) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Show success screen after order is created
  if (orderSuccess) {
    return (
      <OrderSuccessScreen
        data={orderSuccess}
        onViewDashboard={handleViewDashboard}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  return (
    <div className="size-full overflow-x-hidden">
      <AgentBookingFlow
        technicians={technicians}
        companies={companies}
        preferredVendors={preferredVendors}
        onJobCreate={handleJobCreate}
        isAuthenticated={true}
        onCancel={handleCancel}
      />
    </div>
  );
}
