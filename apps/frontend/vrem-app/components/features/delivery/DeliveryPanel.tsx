"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  Copy,
  Check,
  Link2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import { ClientApprovalStatus } from "@/types";

interface DeliveryPanelProps {
  projectId: string;
  projectStatus: string;
  canManageDelivery: boolean;
  variant?: "inline" | "card";
}

interface DeliveryStatus {
  enabled: boolean;
  deliveryToken: string | null;
  deliveryEnabledAt: Date | null;
  clientApprovalStatus: ClientApprovalStatus;
  clientApprovedAt: Date | null;
  clientApprovedBy: { id: string; name: string } | null;
}

const approvalStatusConfig: Record<
  ClientApprovalStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING_REVIEW: {
    label: "Pending Review",
    color: "text-amber-600",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-600",
    icon: CheckCircle2,
  },
  CHANGES_REQUESTED: {
    label: "Changes Requested",
    color: "text-red-600",
    icon: AlertCircle,
  },
};

export function DeliveryPanel({
  projectId,
  projectStatus,
  canManageDelivery,
  variant = "inline",
}: DeliveryPanelProps) {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.projectDelivery.getStatus(projectId);
        setStatus(data);
      } catch (error) {
        console.error("Failed to fetch delivery status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [projectId]);

  const handleToggleDelivery = async () => {
    if (!status) return;

    setToggling(true);
    try {
      if (status.enabled) {
        const result = await api.projectDelivery.disable(projectId);
        setStatus((prev) => prev ? { ...prev, ...result } : null);
        toast.success("Delivery link disabled");
      } else {
        const result = await api.projectDelivery.enable(projectId);
        setStatus((prev) => prev ? { ...prev, ...result } : null);
        toast.success("Delivery link enabled");
      }
    } catch (error) {
      console.error("Failed to toggle delivery:", error);
      toast.error("Failed to update delivery settings");
    } finally {
      setToggling(false);
    }
  };

  const handleCopyLink = async () => {
    if (!status?.deliveryToken) return;

    const url = api.projectDelivery.getDeliveryUrl(status.deliveryToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Delivery link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleOpenDelivery = () => {
    if (!status?.deliveryToken) return;
    const url = api.projectDelivery.getDeliveryUrl(status.deliveryToken);
    window.open(url, "_blank");
  };

  if (loading) {
    if (variant === "inline") {
      return <Skeleton className="h-5 w-24" />;
    }
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const approvalConfig = approvalStatusConfig[status.clientApprovalStatus];
  const ApprovalIcon = approvalConfig.icon;

  if (variant === "inline") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-3">
          {canManageDelivery && (
            <div className="flex items-center gap-2">
              <Switch
                checked={status.enabled}
                onCheckedChange={handleToggleDelivery}
                disabled={toggling}
                className="data-[state=checked]:bg-green-600"
              />
              <span className="text-sm text-muted-foreground">
                {toggling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : status.enabled ? (
                  "Enabled"
                ) : (
                  "Disabled"
                )}
              </span>
            </div>
          )}

          {status.enabled && status.deliveryToken && (
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy delivery link</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleOpenDelivery}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open delivery page</TooltipContent>
              </Tooltip>

              <Badge
                variant="outline"
                className={cn("gap-1", approvalConfig.color)}
              >
                <ApprovalIcon className="h-3 w-3" />
                <span className="text-xs">{approvalConfig.label}</span>
              </Badge>
            </div>
          )}

          {!status.enabled && !canManageDelivery && (
            <span className="text-sm text-muted-foreground">
              Delivery not enabled
            </span>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Card variant
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Client Delivery</span>
        </div>

        {canManageDelivery && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {status.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={status.enabled}
              onCheckedChange={handleToggleDelivery}
              disabled={toggling}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        )}
      </div>

      {status.enabled && status.deliveryToken && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
              {api.projectDelivery.getDeliveryUrl(status.deliveryToken)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDelivery}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Client Approval Status
            </span>
            <Badge
              variant="outline"
              className={cn("gap-1.5", approvalConfig.color)}
            >
              <ApprovalIcon className="h-3.5 w-3.5" />
              {approvalConfig.label}
            </Badge>
          </div>

          {status.clientApprovedAt && status.clientApprovedBy && (
            <div className="text-xs text-muted-foreground">
              Approved by {status.clientApprovedBy.name} on{" "}
              {new Date(status.clientApprovedAt).toLocaleDateString()}
            </div>
          )}
        </>
      )}

      {!status.enabled && (
        <div className="text-sm text-muted-foreground">
          {canManageDelivery
            ? "Enable delivery to share media with your client."
            : "Delivery has not been enabled for this project."}
        </div>
      )}
    </div>
  );
}
