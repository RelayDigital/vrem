'use client';

import { JobRequest, Photographer } from "../../../types";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import {
  MapPin,
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

interface JobCardProps {
  job: JobRequest;
  photographer?: Photographer;
  onViewRankings?: () => void;
  onClick?: () => void;
  onViewInProjectManagement?: () => void;
  selected?: boolean;
}

export function JobCard({
  job,
  photographer,
  onViewRankings,
  onClick,
  onViewInProjectManagement,
  selected,
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

  const priorityConfig = getPriorityConfig(job.priority);
  const statusConfig = getStatusConfig(job.status);
  const PriorityIcon = priorityConfig.icon;

  // Format date - handle both Date objects and strings
  let formattedDate = job.scheduledDate;
  try {
    const date = new Date(job.scheduledDate);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, "MMM d, yyyy");
    }
  } catch (e) {
    // Keep original value if parsing fails
  }

  // Always use vertical layout
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <div
        className={cn(
          "group relative flex flex-col bg-card rounded-3xl border border-border overflow-hidden transition-all duration-200",
          "shadow-lg",
          "hover:shadow-xl",
          selected
            ? "border-primary ring-2 ring-primary/20"
            : "",
          onClick ? "cursor-pointer" : ""
        )}
        onClick={onClick}
      >
        {/* Media Section */}
        <div className="relative flex flex-col justify-between w-full aspect-[16/10] overflow-hidden p-2">
          {job.propertyImage ? (
            <ImageWithFallback
              src={job.propertyImage}
              alt={job.propertyAddress}
              className="w-full h-full object-cover absolute top-0 left-0"
            />
          ) : null}

          {/* Priority Badge - Top Left */}
          <div className="flex z-10">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-card/90 border border-border/50 shadow-lg",
                priorityConfig.priority === "urgent" && "bg-destructive/10 text-destructive",
                priorityConfig.priority === "rush" && "bg-orange-50 text-orange-600",
                priorityConfig.priority === "standard" && "bg-primary/10 text-primary"
              )}
            >
              <PriorityIcon
                className={cn(
                  "h-3.5 w-3.5",
                  priorityConfig.priority === "urgent" && "text-destructive",
                  priorityConfig.priority === "rush" && "text-orange-600",
                  priorityConfig.priority === "standard" && "text-primary"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium hidden sm:inline",
                  priorityConfig.priority === "urgent" && "text-destructive",
                  priorityConfig.priority === "rush" && "text-orange-600",
                  priorityConfig.priority === "standard" && "text-primary"
                )}
              >
                {priorityConfig.label}
              </span>
            </div>
          </div>

          {/* View in Project Management Button - Top Right */}
          {onViewInProjectManagement && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-[0.97] shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewInProjectManagement();
                }}
              >
                <ExternalLink className="h-[18px] w-[18px]" />
                <span className="sr-only">View in project management</span>
              </Button>
            </div>
          )}

          {/* Photographer Profile Overlay or Find Photographer Button */}
          <div className="flex z-10 ">
            {photographer ? (
              <div className="flex items-center gap-3 pl-1 pr-3 py-1 bg-card rounded-3xl shadow-lg max-w-[80%] mx-auto h-auto">
                <Avatar className="size-8 shadow-sm">
                  <AvatarImage src={photographer.avatar} alt={photographer.name} />
                  <AvatarFallback className="bg-muted-foreground/20 text-foreground text-xs">
                    {photographer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-sm font-semibold leading-[1.4] text-foreground truncate">
                      {photographer.name}
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
                  <span className="text-sm font-semibold">Find Photographer</span>
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              )
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="px-4 py-4 flex flex-col gap-2 relative">
          {/* Status Row */}
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                statusConfig.status === "pending" && "bg-orange-500",
                statusConfig.status === "assigned" && "bg-primary",
                statusConfig.status === "in_progress" && "bg-accent",
                statusConfig.status === "editing" && "bg-orange-500",
                statusConfig.status === "delivered" && "bg-emerald-500",
                (statusConfig.status === "cancelled" || statusConfig.status === "default") && "bg-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-[13px] font-medium leading-[1.4]",
                statusConfig.status === "pending" && "text-orange-500",
                statusConfig.status === "assigned" && "text-primary",
                statusConfig.status === "in_progress" && "text-accent",
                statusConfig.status === "editing" && "text-orange-500",
                statusConfig.status === "delivered" && "text-emerald-500",
                (statusConfig.status === "cancelled" || statusConfig.status === "default") && "text-muted-foreground"
              )}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Specs Row - Media Types */}
          <div className="flex items-center gap-3 mb-1">
            {job.mediaType.map((type, index) => {
              const Icon = getMediaIcon(type);
              return (
                <div key={type} className="inline-flex items-center gap-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground capitalize">
                    {type}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Address Text */}
          <div className="mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[13px] leading-[1.4] text-muted-foreground line-clamp-2">
                  {job.propertyAddress}
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="wrap-break-word">{job.propertyAddress}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Date/Time Row */}
          <div className="flex items-center gap-4 mb-2">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] leading-[1.4] text-muted-foreground">{formattedDate}</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] leading-[1.4] text-muted-foreground">{job.scheduledTime}</span>
            </div>
          </div>

          {/* Listing Attribution - Client Name */}
          <div className="mt-1">
            <p className="text-[11px] leading-[1.4] text-muted-foreground italic">
              Client: {job.clientName}
            </p>
          </div>

          {/* Requirements/Notes */}
          {job.requirements && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[13px] leading-[1.4] text-muted-foreground line-clamp-2">
                {job.requirements}
              </p>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
