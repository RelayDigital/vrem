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
import { useMemo } from "react";

// Aurora/Mesh gradient color palettes for each status
// Using mid-tone base colors to ensure visibility against both light and dark backgrounds
const getAuroraColors = (status: string) => {
  switch (status) {
    case "pending":
      return {
        base: "bg-amber-100 dark:bg-amber-900",
        primary: "bg-amber-400/60",
        secondary: "bg-orange-400/50",
        accent: "bg-yellow-300/45",
        highlight: "bg-amber-500/40",
      };
    case "assigned":
      return {
        base: "bg-blue-100 dark:bg-blue-900",
        primary: "bg-blue-400/60",
        secondary: "bg-indigo-400/50",
        accent: "bg-cyan-300/45",
        highlight: "bg-blue-500/40",
      };
    case "in_progress":
      return {
        base: "bg-violet-100 dark:bg-violet-900",
        primary: "bg-violet-400/60",
        secondary: "bg-purple-400/50",
        accent: "bg-fuchsia-300/45",
        highlight: "bg-indigo-500/40",
      };
    case "editing":
      return {
        base: "bg-pink-100 dark:bg-pink-900",
        primary: "bg-pink-400/60",
        secondary: "bg-rose-400/50",
        accent: "bg-fuchsia-300/45",
        highlight: "bg-pink-500/40",
      };
    case "delivered":
      return {
        base: "bg-emerald-100 dark:bg-emerald-900",
        primary: "bg-emerald-400/60",
        secondary: "bg-teal-400/50",
        accent: "bg-green-300/45",
        highlight: "bg-emerald-500/40",
      };
    case "cancelled":
    default:
      return {
        base: "bg-slate-200 dark:bg-slate-800",
        primary: "bg-slate-400/60",
        secondary: "bg-gray-400/50",
        accent: "bg-zinc-300/45",
        highlight: "bg-slate-500/40",
      };
  }
};

// Simple seeded random number generator based on string
const seededRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Return a function that generates deterministic "random" values
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash = (hash ^ (hash >>> 16)) >>> 0;
    return (hash % 1000) / 1000;
  };
};

// Aurora gradient component - mesh-style gradient with blurred color blobs
// Moved outside JobCard to prevent recreation on each render
const AuroraGradient = ({ status, jobId, className }: { status: string; jobId: string; className?: string }) => {
  const colors = getAuroraColors(status);

  // Generate stable random values based on job ID (deterministic)
  // Blobs can appear anywhere in the container - not confined to zones
  const randomValues = useMemo(() => {
    const rand = seededRandom(jobId);

    // Each blob can appear anywhere: -30% to 50% allows blobs to extend past edges
    // This ensures colors aren't always in the same spots
    const randomPosition = () => ({
      top: `${-30 + rand() * 80}%`,
      left: `${-30 + rand() * 80}%`,
    });

    return {
      // Blob 1 - primary (large, anywhere)
      blob1: {
        ...randomPosition(),
        width: `${65 + rand() * 15}%`,
        height: `${65 + rand() * 15}%`,
      },
      // Blob 2 - secondary (large, anywhere)
      blob2: {
        ...randomPosition(),
        width: `${60 + rand() * 15}%`,
        height: `${60 + rand() * 15}%`,
      },
      // Blob 3 - accent (medium, anywhere)
      blob3: {
        ...randomPosition(),
        width: `${40 + rand() * 15}%`,
        height: `${40 + rand() * 15}%`,
      },
      // Blob 4 - highlight (smaller, anywhere)
      blob4: {
        ...randomPosition(),
        width: `${25 + rand() * 12}%`,
        height: `${25 + rand() * 12}%`,
      },
      // Rotation for organic feel
      rotation1: rand() * 60,
      rotation2: rand() * 60,
      rotation3: rand() * 60,
      rotation4: rand() * 60,
    };
  }, [jobId]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", colors.base, className)}>
      {/* Primary blob */}
      <div
        className={cn(
          "absolute rounded-full blur-3xl",
          colors.primary
        )}
        style={{
          top: randomValues.blob1.top,
          left: randomValues.blob1.left,
          width: randomValues.blob1.width,
          height: randomValues.blob1.height,
          transform: `rotate(${randomValues.rotation1}deg)`,
        }}
      />

      {/* Secondary blob */}
      <div
        className={cn(
          "absolute rounded-full blur-3xl",
          colors.secondary
        )}
        style={{
          top: randomValues.blob2.top,
          left: randomValues.blob2.left,
          width: randomValues.blob2.width,
          height: randomValues.blob2.height,
          transform: `rotate(${randomValues.rotation2}deg)`,
        }}
      />

      {/* Accent blob */}
      <div
        className={cn(
          "absolute rounded-full blur-2xl",
          colors.accent
        )}
        style={{
          top: randomValues.blob3.top,
          left: randomValues.blob3.left,
          width: randomValues.blob3.width,
          height: randomValues.blob3.height,
          transform: `rotate(${randomValues.rotation3}deg)`,
        }}
      />

      {/* Highlight blob */}
      <div
        className={cn(
          "absolute rounded-full blur-2xl",
          colors.highlight
        )}
        style={{
          top: randomValues.blob4.top,
          left: randomValues.blob4.left,
          width: randomValues.blob4.width,
          height: randomValues.blob4.height,
          transform: `rotate(${randomValues.rotation4}deg)`,
        }}
      />
    </div>
  );
};

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
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card
          className={cn(
            "group relative bg-transparent rounded-md border-none overflow-hidden transition-all duration-200 w-full h-40",
            onClick ? "cursor-pointer" : "",
            selected && "ring-0"
          )}
          onClick={onClick}
        >
          {/* Full-bleed Background Image or Aurora Gradient */}
          <div className="absolute inset-0">
            {job.propertyImage && job.status === "delivered" ? (
              <ImageWithFallback
                src={job.propertyImage}
                alt={job.propertyAddress}
                className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <AuroraGradient status={job.status} jobId={job.id} className="group-hover:scale-[1.02] transition-transform duration-300 pointer-events-none" />
            )}
          </div>

          {/* Blur overlay for text readability - gradient from transparent to blurred */}
          <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/70 to-transparent" />

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col justify-between h-full p-3">
            {/* Top Row - Priority, Order Number, Status, and Actions */}
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 h-full">
                {/* Priority Badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    "flex items-center gap-1 rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200",
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
                      "size-3",
                      priorityConfig.priority === "urgent" && "text-priority-urgent",
                      priorityConfig.priority === "rush" && "text-priority-rush",
                      priorityConfig.priority === "standard" && "text-priority-standard"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      priorityConfig.priority === "urgent" && "text-priority-urgent",
                      priorityConfig.priority === "rush" && "text-priority-rush",
                      priorityConfig.priority === "standard" && "text-priority-standard"
                    )}
                  >
                    {priorityConfig.label}
                  </span>
                </Badge>

                {/* Order Number */}
                {job.orderNumber && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200",
                      priorityConfig.priority === "urgent" &&
                        "bg-priority-urgent/10 text-priority-urgent",
                      priorityConfig.priority === "rush" &&
                        "bg-priority-rush/10 text-priority-rush",
                      priorityConfig.priority === "standard" &&
                        "bg-priority-standard/10 text-priority-standard"
                    )}
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
                  className="flex items-center gap-1.5 rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200"
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
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      statusConfig.status === "pending" && "text-status-pending",
                      statusConfig.status === "assigned" && "text-status-assigned",
                      statusConfig.status === "in_progress" && "text-status-in-progress",
                      statusConfig.status === "editing" && "text-status-editing",
                      statusConfig.status === "delivered" && "text-status-delivered",
                      (statusConfig.status === "cancelled" || statusConfig.status === "default") && "text-status-cancelled"
                    )}
                  >
                    {statusConfig.label}
                  </span>
                </Badge>

                {/* View in Project Management */}
                {onViewInProjectManagement && (
                  <Button
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewInProjectManagement();
                    }}
                    className="size-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-[0.97]"
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
                  <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-1">
                    {job.propertyAddress}
                  </h3>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <P className="wrap-break-word">{job.propertyAddress}</P>
                </TooltipContent>
              </Tooltip>

              {/* Client Name */}
              <p className="text-xs text-muted-foreground">
                {job.clientName}
              </p>

              {/* Bottom Row - Date, Time, Media Types */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                          <div className="p-1 rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200">
                            <Icon className="size-3 text-muted-foreground" />
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
          "group relative flex flex-col bg-transparent rounded-md border-none overflow-hidden transition-all duration-200 size-full",
          // selected
          //   ? "border-primary ring-2 ring-primary/20"
          //   : "",
        )}
        onClick={onClick}
      >
        {/* Media Section */}
        <CardHeader className="relative flex flex-col justify-between w-full aspect-video shrink-0 overflow-hidden p-2! rounded-b-md">
          {job.propertyImage && job.status === "delivered" ? (
            <ImageWithFallback
              src={job.propertyImage}
              alt={job.propertyAddress}
              className="size-full object-cover absolute top-0 left-0 pointer-events-none group-hover:scale-[1.04] transition-transform duration-200"
            />
          ) : (
            <AuroraGradient status={job.status} jobId={job.id} className="group-hover:scale-[1.04] transition-transform duration-300 pointer-events-none" />
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
          {/* Show technician info if assigned (for all users including agents), or show Find button if can assign */}
          {(technician || canAssignTechnician) && (
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
                  canAssignTechnician && onViewRankings && (
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
              {job.mediaType.map((type) => {
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
          <div className="space-y-1 mb-2">
            <P className="text-[13px] leading-[1.4] text-muted-foreground line-clamp-2">
              {job.propertyAddress}
            </P>
            {/* Customer Name - below address */}
            <p className="text-xs text-muted-foreground">
              {job.clientName}
            </p>
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
