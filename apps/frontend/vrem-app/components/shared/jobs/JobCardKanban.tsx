"use client";

import { useState } from "react";
import { JobRequest, Technician } from "../../../types";
import { ChatMessage } from "../../../types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { format } from "date-fns";
import {
  Flag,
  MessageSquare,
  Link as LinkIcon,
  CheckSquare2,
  MoreHorizontal,
  Star,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../ui/hover-card";
import { cn } from "../../../lib/utils";
import { H3, P } from "@/components/ui/typography";
import { useAuth } from "@/context/auth-context";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

interface JobCardKanbanProps {
  job: JobRequest;
  technician?: Technician;
  messages?: ChatMessage[];
  onClick?: () => void;
  onViewRankings?: () => void;
  onJobClick?: () => void;
  onChangeTechnician?: () => void; // For reassigning technician
  disableContextMenu?: boolean; // Disable context menu when sheet is open
}

// Helper to get CSS variable value
const getCSSVar = (varName: string): string => {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
};

// Map job status to kanban status using theme colors
const getStatusConfig = (status: JobRequest["status"]) => {
  const getStatusColor = (s: string) => {
    const color = getCSSVar(`--status-${s.replace("_", "-")}`);
    return color || "";
  };

  const getStatusBg = (s: string) => {
    const color = getStatusColor(s);
    return color ? `${color}20` : "";
  };

  switch (status) {
    case "delivered":
      return {
        label: "Delivered",
        dotColor: getStatusColor("delivered") || "oklch(0.60 0.15 142)",
        bgColor: getStatusBg("delivered") || "oklch(0.60 0.15 142 / 0.2)",
        textColor: getStatusColor("delivered") || "oklch(0.60 0.15 142)",
      };
    case "in_progress":
      return {
        label: "In Progress",
        dotColor: getStatusColor("in-progress") || "oklch(0.60 0.15 280)",
        bgColor: getStatusBg("in-progress") || "oklch(0.60 0.15 280 / 0.2)",
        textColor: getStatusColor("in-progress") || "oklch(0.60 0.15 280)",
      };
    case "pending":
    case "assigned":
      return {
        label: status === "pending" ? "Pending" : "Assigned",
        dotColor: getStatusColor(status) || "oklch(0.55 0.15 250)",
        bgColor: getStatusBg(status) || "oklch(0.55 0.15 250 / 0.2)",
        textColor: getStatusColor(status) || "oklch(0.55 0.15 250)",
      };
    case "editing":
      return {
        label: "Editing",
        dotColor: getStatusColor("editing") || "oklch(0.65 0.15 60)",
        bgColor: getStatusBg("editing") || "oklch(0.65 0.15 60 / 0.2)",
        textColor: getStatusColor("editing") || "oklch(0.65 0.15 60)",
      };
    default:
      return {
        label: "Pending",
        dotColor: getStatusColor("pending") || "oklch(0.65 0.15 60)",
        bgColor: getStatusBg("pending") || "oklch(0.65 0.15 60 / 0.2)",
        textColor: getStatusColor("pending") || "oklch(0.65 0.15 60)",
      };
  }
};

// Map priority to kanban priority using theme colors
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

export function JobCardKanban({
  job,
  technician,
  messages = [],
  onClick,
  onViewRankings,
  onJobClick,
  onChangeTechnician,
  disableContextMenu = false,
}: JobCardKanbanProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  
  // Map JobRequest fields to Project-compatible shape for permission check
  const projectForPermissions = {
    projectManagerId: job.projectManagerId ?? undefined,
    technicianId: job.assignedTechnicianId ?? undefined,
    editorId: job.editorId ?? undefined,
  };
  const { canAssignTechnician } = useProjectPermissions(projectForPermissions);

  const statusConfig = getStatusConfig(job.status);
  const priorityConfig = getPriorityConfig(job.priority);
  const PriorityIcon = priorityConfig.icon;

  // Format date - parse as local date to avoid timezone shifts
  const formattedDate = (() => {
    try {
      // Parse date string (YYYY-MM-DD) as local date, not UTC
      const [year, month, day] = job.scheduledDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, "dd MMM yyyy");
    } catch (e) {
      return job.scheduledDate;
    }
  })();

  // Get assignees (technician if assigned)
  const assignees = technician ? [technician] : [];

  // Calculate actual comment count from messages
  const commentsCount = messages.filter((msg) => msg.jobId === job.id).length;
  //   const linksCount = 0;
  //   const checklistProgress = {
  //     done: job.mediaType.length,
  //     total: job.mediaType.length,
  //   };

  const cardContent = (
    <div
      className={cn(
        "group relative w-full max-w-full rounded-md bg-card px-4 py-4 transition-all duration-200 space-y-2",
        "hover:shadow-xs",
        onClick || onJobClick ? "cursor-pointer" : ""
      )}
      onClick={(e) => {
        // Don't trigger card click if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (
          target.closest('[role="menu"]') ||
          target.closest('[data-dropdown-trigger="true"]') ||
          target.closest('[data-radix-dropdown-menu-trigger]') ||
          target.closest('[data-radix-dropdown-menu-content]') ||
          target.closest('button[aria-haspopup="menu"]') ||
          target.closest('button[data-radix-dropdown-menu-trigger]') ||
          target.closest('[data-radix-context-menu-trigger]') ||
          target.closest('[data-radix-context-menu-content]') ||
          target.closest('[data-slot="dropdown-menu-trigger"]') ||
          target.closest('[data-slot="dropdown-menu-content"]') ||
          target.closest('[data-slot="context-menu-trigger"]') ||
          target.closest('[data-slot="context-menu-content"]')
        ) {
          return;
        }
        if (onClick) {
          onClick();
        } else if (onJobClick) {
          onJobClick();
        }
      }}
    >
          {/* Status Pill Row */}
          <div className="flex items-center justify-between">
            <Badge
              variant="muted"
              className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.textColor,
              }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: statusConfig.dotColor,
                }}
              />
              <span className="text-xs font-medium leading-[1.4]">
                {statusConfig.label}
              </span>
            </Badge>
            {priorityConfig.label !== "Standard" && (
              <Badge
                variant="muted"
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 py-1",
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
                {/* <span
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
                </span> */}
              </Badge>
            )}

            {/* Order Number */}
            {job.orderNumber && (
              <span className="text-xs font-medium text-muted-foreground ml-auto mr-2">
                #{job.orderNumber}
              </span>
            )}

            <div 
              className="relative z-50"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="muted"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    data-dropdown-trigger="true"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-10000"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
              >
                {onJobClick && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      onJobClick();
                    }}
                  >
                    View Details
                  </DropdownMenuItem>
                )}
                {onViewRankings &&
                  (job.status === "pending" || job.status === "assigned") &&
                  !job.assignedTechnicianId &&
                  canAssignTechnician && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        onViewRankings();
                      }}
                    >
                      Find Technician
                    </DropdownMenuItem>
                  )}
                {onChangeTechnician &&
                  job.assignedTechnicianId &&
                  (job.status === "assigned" || job.status === "in_progress") &&
                  canAssignTechnician && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        onChangeTechnician();
                      }}
                    >
                      Change Technician
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Card Body */}
          <div className="space-y-1">
            <H3 className="line-clamp-2 text-sm font-semibold leading-[1.4] text-foreground">
              {job.propertyAddress}
            </H3>
            {job.requirements && (
              <P className="line-clamp-2 text-xs leading-normal text-muted-foreground">
                {job.requirements}
              </P>
            )}
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Assignees */}
            {assignees.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((assignee, index) => (
                    <HoverCard key={assignee.id}>
                      <HoverCardTrigger asChild>
                        <div className="cursor-pointer">
                          <Avatar
                            className="h-6 w-6 border-2 border-card"
                            style={{ zIndex: assignees.length - index }}
                          >
                            <AvatarImage
                              src={assignee.avatar}
                              alt={assignee.name}
                            />
                            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                              {assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 p-0" align="start">
                        <div className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-3">
                            <Avatar className="size-12 border-2 border-background">
                              <AvatarImage
                                src={assignee.avatar}
                                alt={assignee.name}
                              />
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {assignee.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-semibold text-sm truncate">
                                  {assignee.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-foreground">
                                    {assignee.rating.overall}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {assignee.reliability.totalJobs} jobs
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <span className="text-muted-foreground">
                                On-time
                              </span>
                              <span className="text-foreground font-medium">
                                {(
                                  assignee.reliability.onTimeRate * 100
                                ).toFixed(0)}
                                %
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <span className="text-muted-foreground">
                                Delivery
                              </span>
                              <span className="text-foreground font-medium">
                                {assignee.reliability.averageDeliveryTime}h
                              </span>
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                  {assignees.length > 3 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date */}
            <span className="text-xs leading-[1.4] text-muted-foreground">
              {formattedDate}
            </span>
            {/* Comments */}
            {commentsCount > 0 && (
              <div className="inline-flex items-center gap-1.5">
                <span className="text-xs leading-[1.4] text-muted-foreground">
                  {commentsCount}
                </span>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            {/* <div className="inline-flex items-center gap-1.5">
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs leading-[1.4] text-muted-foreground">
            {linksCount} Links
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <CheckSquare2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs leading-[1.4] text-muted-foreground">
            {checklistProgress.done}/{checklistProgress.total}
          </span>
        </div> */}
          </div>
    </div>
  );

  if (disableContextMenu) {
    return cardContent;
  }

  return (
    <ContextMenu 
      {...({ open: contextMenuOpen, onOpenChange: setContextMenuOpen } as any)}
    >
      <ContextMenuTrigger 
        asChild
        onContextMenu={(e) => {
          // Don't show context menu if clicking on dropdown button
          const target = e.target as HTMLElement;
          if (
            target.closest('[data-radix-dropdown-menu-trigger]') ||
            target.closest('button[aria-haspopup="menu"]') ||
            target.closest('[data-slot="dropdown-menu-trigger"]')
          ) {
            e.preventDefault();
            return;
          }
        }}
      >
        {cardContent}
      </ContextMenuTrigger>
      <ContextMenuContent 
        className="z-9999"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        {onJobClick && (
          <ContextMenuItem
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenuOpen(false);
              // Use setTimeout to ensure the menu closes after the callback
              setTimeout(() => {
                onJobClick();
              }, 0);
            }}
          >
            View Details
          </ContextMenuItem>
        )}
        {onViewRankings &&
          (job.status === "pending" || job.status === "assigned") &&
          !job.assignedTechnicianId &&
          canAssignTechnician && (
            <ContextMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuOpen(false);
                // Use setTimeout to ensure the menu closes after the callback
                setTimeout(() => {
                  onViewRankings();
                }, 0);
              }}
            >
              Find Technician
            </ContextMenuItem>
          )}
        {onChangeTechnician &&
          job.assignedTechnicianId &&
          (job.status === "assigned" || job.status === "in_progress") &&
          canAssignTechnician && (
            <ContextMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuOpen(false);
                // Use setTimeout to ensure the menu closes after the callback
                setTimeout(() => {
                  onChangeTechnician();
                }, 0);
              }}
            >
              Change Technician
            </ContextMenuItem>
          )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
