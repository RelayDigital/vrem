"use client";

import { JobRequest, Technician } from "../../../types";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import {
  Clock,
  Calendar,
  Camera,
  Video,
  Plane,
  Sunset,
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "../../common";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { format } from "date-fns";
import { cn } from "../../../lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { P } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

interface JobCardProps {
  job: JobRequest;
  technician?: Technician;
  currentUserAccountType?: string;
  onViewRankings?: () => void;
  onClick?: () => void;
  onViewInProjectManagement?: () => void;
  selected?: boolean;
  horizontal?: boolean; // Force horizontal layout (always horizontal on mobile regardless of this prop)
  hideRequirements?: boolean; // Hide requirements/notes section
}

export function JobCard({
  job,
  technician,
  currentUserAccountType,
  onViewRankings,
  onClick,
  onViewInProjectManagement,
  selected,
  horizontal = false,
  hideRequirements = false,
}: JobCardProps) {
  const getMediaIcon = (type: string) => {
    switch (type) {
      case "photo":
        return Camera;
      case "video":
        return Video;
      case "aerial":
        return Plane;
      case "twilight":
        return Sunset;
      default:
        return Camera;
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          priority: "urgent" as const,
          icon: AlertCircle,
          label: "Urgent",
        };
      case "rush":
        return {
          priority: "rush" as const,
          icon: Zap,
          label: "Rush",
        };
      default:
        return {
          priority: "standard" as const,
          icon: Clock,
          label: "Standard",
        };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", status: "pending" as const };
      case "assigned":
        return { label: "Assigned", status: "assigned" as const };
      case "in_progress":
        return { label: "In Progress", status: "in_progress" as const };
      case "editing":
        return { label: "Editing", status: "editing" as const };
      case "delivered":
        return { label: "Delivered", status: "delivered" as const };
      case "cancelled":
        return { label: "Cancelled", status: "cancelled" as const };
      default:
        return { label: status, status: "default" as const };
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-br from-status-pending/20 via-status-pending/15 to-status-pending/10";
      case "assigned":
        return "bg-gradient-to-br from-status-assigned/20 via-status-assigned/15 to-status-assigned/10";
      case "in_progress":
        return "bg-gradient-to-br from-status-in-progress/20 via-status-in-progress/15 to-status-in-progress/10";
      case "editing":
        return "bg-gradient-to-br from-status-editing/20 via-status-editing/15 to-status-editing/10";
      case "delivered":
        return "bg-gradient-to-br from-status-delivered/20 via-status-delivered/15 to-status-delivered/10";
      case "cancelled":
        return "bg-gradient-to-br from-status-cancelled/20 via-status-cancelled/15 to-status-cancelled/10";
      default:
        return "bg-gradient-to-br from-status-cancelled/20 via-status-cancelled/15 to-status-cancelled/10";
    }
  };

  // Map JobRequest fields to Project-compatible shape for permission check
  const projectForPermissions = {
    projectManagerId: job.projectManagerId ?? undefined,
    technicianId: job.assignedTechnicianId ?? undefined,
    editorId: job.editorId ?? undefined,
  };
  const { canAssignTechnician } = useProjectPermissions(projectForPermissions);


  const priorityConfig = getPriorityConfig(job.priority);
  const statusConfig = getStatusConfig(job.status);
  const PriorityIcon = priorityConfig.icon;

  // Format date - parse as local date to avoid timezone shifts
  let formattedDate = job.scheduledDate;
  try {
    // Parse date string (YYYY-MM-DD) as local date, not UTC
    const [year, month, day] = job.scheduledDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, "MMM d, yyyy");
    }
  } catch (e) {
    // Keep original value if parsing fails
  }

  // Determine if layout should be horizontal
  // Always horizontal on mobile, or if horizontal prop is true
  const isHorizontal = horizontal;

  // Horizontal layout - Full bleed image with blur overlay
  if (isHorizontal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card
          className={cn(
            "group relative bg-card rounded-xl border-none overflow-hidden transition-all duration-200 w-full h-40",
            "hover:shadow-md",
            onClick ? "cursor-pointer" : "",
            selected && "ring-0"
          )}
          onClick={onClick}
        >
          {/* Full-bleed Background Image or Gradient */}
          <div className="absolute inset-0">
            {job.propertyImage && job.status === "delivered" ? (
              <ImageWithFallback
                src={job.propertyImage}
                alt={job.propertyAddress}
                className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <div
                className={cn(
                  "size-full",
                  getStatusGradient(job.status)
                )}
              />
            )}
          </div>

          {/* Blur overlay for text readability - gradient from transparent to blurred */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col justify-between h-full p-3">
            {/* Top Row - Priority, Order Number, Status, and Actions */}
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 h-full">
                {/* Priority Badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    "flex items-center gap-1 rounded-full backdrop-blur-md bg-white/20 border-0 text-white",
                    priorityConfig.priority === "urgent" && "bg-red-500/30",
                    priorityConfig.priority === "rush" && "bg-amber-500/30"
                  )}
                >
                  <PriorityIcon className="size-3" />
                  <span className="text-[10px] font-medium">
                    {priorityConfig.label}
                  </span>
                </Badge>

                {/* Order Number */}
                {job.orderNumber && (
                  <Badge
                    variant="secondary"
                    className="rounded-full backdrop-blur-md bg-white/20 border-0 text-white"
                  >
                    <span className="text-[10px] font-medium">
                      #{job.orderNumber}
                    </span>
                  </Badge>
                )}
              </div>

              {/* Right side - Status and View button */}
              <div className="flex items-center gap-1.5">
                {/* Status Badge */}
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full backdrop-blur-md bg-white/20 border-0"
                >
                  <div
                    className={cn(
                      "size-1.5 rounded-full",
                      statusConfig.status === "pending" && "bg-status-pending",
                      statusConfig.status === "assigned" && "bg-status-assigned",
                      statusConfig.status === "in_progress" && "bg-status-in-progress",
                      statusConfig.status === "editing" && "bg-status-editing",
                      statusConfig.status === "delivered" && "bg-status-delivered",
                      (statusConfig.status === "cancelled" || statusConfig.status === "default") && "bg-status-cancelled"
                    )}
                  />
                  <span className="text-[10px] font-medium text-white">
                    {statusConfig.label}
                  </span>
                </Badge>

                {/* View in Project Management */}
                {onViewInProjectManagement && (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewInProjectManagement();
                    }}
                    className="size-6 rounded-full backdrop-blur-md bg-white/20 border-0 hover:bg-white/30 text-white"
                  >
                    <ExternalLink className="size-3" />
                    <span className="sr-only">View in job management</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom Section - Main Info */}
            <div className="space-y-1">
              {/* Address */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-sm font-semibold text-white leading-tight line-clamp-1 drop-shadow-sm">
                    {job.propertyAddress}
                  </h3>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <P className="wrap-break-word">{job.propertyAddress}</P>
                </TooltipContent>
              </Tooltip>

              {/* Client Name */}
              <p className="text-xs text-white/70">
                {job.clientName}
              </p>

              {/* Bottom Row - Date, Time, Media Types */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-xs text-white/80">
                  <div className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{job.scheduledTime}</span>
                  </div>
                </div>

                {/* Media Types */}
                <div className="flex items-center gap-1.5">
                  {job.mediaType.map((type) => {
                    const Icon = getMediaIcon(type);
                    return (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <div className="p-1 rounded-full backdrop-blur-md bg-white/20">
                            <Icon className="size-3 text-white" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="capitalize">
                          {type}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Vertical layout (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full cursor-pointer!")}
    >
      <Card
        className={cn(
          "group relative flex flex-col bg-card rounded-md border-none overflow-hidden transition-all duration-200 size-full",
          "hover:shadow-xs"
          // selected
          //   ? "border-primary ring-2 ring-primary/20"
          //   : "",
        )}
        onClick={onClick}
      >
        {/* Media Section */}
        <CardHeader className="relative flex flex-col justify-between w-full aspect-video overflow-hidden p-2!">
          {job.propertyImage && job.status === "delivered" ? (
            <ImageWithFallback
              src={job.propertyImage}
              alt={job.propertyAddress}
              className="size-full object-cover absolute top-0 left-0 pointer-events-none group-hover:scale-[1.04] transition-transform duration-200"
            />
          ) : (
            <div
              className={cn(
                "size-full absolute top-0 left-0",
                getStatusGradient(job.status)
              )}
            />
          )}

          {/* Top Badges */}
          <div className="flex relative w-full z-10">
            {/* Priority Badge - Top Left */}
            <Badge
              variant="secondary"
              // className="flex z-10 backdrop-blur-md! bg-card/60!"
              className={cn(
                "flex items-center rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200",
                priorityConfig.priority === "urgent" &&
                  "bg-priority-urgent/10 text-priority-urgent",
                priorityConfig.priority === "rush" &&
                  "bg-priority-rush/10 text-priority-rush",
                priorityConfig.priority === "standard" &&
                  "bg-priority-standard/10 text-priority-standard"
              )}
            >
              <PriorityIcon
                className={cn(
                  "size-3.5",
                  priorityConfig.priority === "urgent" &&
                    "text-priority-urgent",
                  priorityConfig.priority === "rush" && "text-priority-rush",
                  priorityConfig.priority === "standard" &&
                    "text-priority-standard"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium hidden sm:inline",
                  priorityConfig.priority === "urgent" &&
                    "text-priority-urgent",
                  priorityConfig.priority === "rush" && "text-priority-rush",
                  priorityConfig.priority === "standard" &&
                    "text-priority-standard"
                )}
              >
                {priorityConfig.label}
              </span>
            </Badge>

            {/* Order Number Badge */}
            {job.orderNumber && (
              <Badge
                variant="secondary"
                // className="flex z-10 backdrop-blur-md! bg-card/60!"
                className={cn(
                  "flex items-center rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200",
                  priorityConfig.priority === "urgent" &&
                    "bg-priority-urgent/10 text-priority-urgent",
                  priorityConfig.priority === "rush" &&
                    "bg-priority-rush/10 text-priority-rush",
                  priorityConfig.priority === "standard" &&
                    "bg-priority-standard/10 text-priority-standard"
                )}
              >
                <span className="text-[11px] font-medium">
                  #{job.orderNumber}
                </span>
              </Badge>
            )}

            {/* View in Job Management Button - Top Right */}
            {onViewInProjectManagement && (
              <div className="flex absolute right-0 z-10">
                <Button
                  size="icon"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-[0.97]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewInProjectManagement();
                  }}
                >
                  <ExternalLink className="size-3.5" />
                  <span className="sr-only">View in job management</span>
                </Button>
              </div>
            )}
          </div>

          {/* Technician Profile Overlay or Find Technician Button */}
          {canAssignTechnician && (
              <div className="flex z-10 self-center w-full">
                {technician ? (
                  <div className="flex items-center gap-3 pl-1 pr-3 py-1 backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200 rounded-full max-w-[80%] mx-auto h-auto">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={technician.avatar}
                        alt={technician.name}
                      />
                      <AvatarFallback className="bg-muted-foreground/20 text-foreground text-xs">
                        {technician.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-sm font-semibold leading-[1.4] text-foreground truncate">
                          {technician.name}
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      </div>
                    </div>
                  </div>
                ) : (
                  onViewRankings && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRankings();
                      }}
                      className="w-full h-auto max-w-[80%] mx-auto px-4 py-2.5 bg-primary text-primary-foreground rounded-3xl shadow-lg hover:bg-primary/90 border-0"
                    >
                      <span className="text-sm font-semibold">
                        Find Technician
                      </span>
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  )
                )}
              </div>
            )}
        </CardHeader>

        {/* Details Section */}
        <CardContent className="px-4! py-4! flex flex-col gap-2 relative">
          <div className="flex items-center justify-between w-full gap-2">
            {/* Status Row */}
            <Badge
              variant="flat"
              className="flex items-center gap-1.5 mb-1 px-0"
            >
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  statusConfig.status === "pending" && "bg-status-pending",
                  statusConfig.status === "assigned" && "bg-status-assigned",
                  statusConfig.status === "in_progress" &&
                    "bg-status-in-progress",
                  statusConfig.status === "editing" && "bg-status-editing",
                  statusConfig.status === "delivered" && "bg-status-delivered",
                  (statusConfig.status === "cancelled" ||
                    statusConfig.status === "default") &&
                    "bg-status-cancelled"
                )}
              />

              <span
                className={cn(
                  "text-[13px] font-medium leading-[1.4]",
                  statusConfig.status === "pending" && "text-status-pending",
                  statusConfig.status === "assigned" && "text-status-assigned",
                  statusConfig.status === "in_progress" &&
                    "text-status-in-progress",
                  statusConfig.status === "editing" && "text-status-editing",
                  statusConfig.status === "delivered" &&
                    "text-status-delivered",
                  (statusConfig.status === "cancelled" ||
                    statusConfig.status === "default") &&
                    "text-status-cancelled"
                )}
              >
                {statusConfig.label}
              </span>
            </Badge>

            {/* Specs Row - Media Types */}
            <div className="flex items-center gap-2">
              {job.mediaType.map((type, index) => {
                const Icon = getMediaIcon(type);
                return (
                  <div key={type} className="inline-flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs capitalize"
                      >
                        {type}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Address Text */}
          <div className="mb-2">
            {/* <Tooltip>
              <TooltipTrigger asChild> */}
            <P className="text-[13px] leading-[1.4] text-muted-foreground line-clamp-2">
              {job.propertyAddress}
            </P>
            {/* </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <P className="wrap-break-word">{job.propertyAddress}</P>
              </TooltipContent>
            </Tooltip> */}
          </div>

          {/* Date/Time Row */}
          <div className="flex items-center gap-4 mb-2">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] leading-[1.4] text-muted-foreground">
                {formattedDate}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] leading-[1.4] text-muted-foreground">
                {job.scheduledTime}
              </span>
            </div>
          </div>

          {/* Listing Attribution - Customer Name */}
          <div className="mt-1">
            <P className="text-[11px] leading-[1.4] text-muted-foreground italic">
              Customer: {job.clientName}
            </P>
          </div>

          {/* Requirements/Notes */}
          {!hideRequirements && job.requirements && (
            <div className="mt-2 pt-2 border-t border-border">
              <P className="text-[13px] leading-[1.4] text-muted-foreground line-clamp-2">
                {job.requirements}
              </P>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
