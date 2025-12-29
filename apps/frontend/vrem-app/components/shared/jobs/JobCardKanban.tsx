"use client";

import { useMemo, useState } from "react";
import { JobRequest, Technician } from "../../../types";
import { ChatMessage } from "../../../types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Star,
  AlertCircle,
  Clock,
  Zap,
  Calendar,
  Camera,
  Video,
  Plane,
  Box,
  FileImage,
  Compass,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip";
import { cn } from "../../../lib/utils";
import { P } from "@/components/ui/typography";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

// Aurora/Mesh gradient color palettes for each status
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
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash = (hash ^ (hash >>> 16)) >>> 0;
    return (hash % 1000) / 1000;
  };
};

// Aurora gradient component for kanban cards
const AuroraGradientKanban = ({ status, jobId, className }: { status: string; jobId: string; className?: string }) => {
  const colors = getAuroraColors(status);

  const randomValues = useMemo(() => {
    const rand = seededRandom(jobId);
    const randomPosition = () => ({
      top: `${-30 + rand() * 80}%`,
      left: `${-30 + rand() * 80}%`,
    });

    return {
      blob1: { ...randomPosition(), width: `${65 + rand() * 15}%`, height: `${65 + rand() * 15}%` },
      blob2: { ...randomPosition(), width: `${60 + rand() * 15}%`, height: `${60 + rand() * 15}%` },
      blob3: { ...randomPosition(), width: `${40 + rand() * 15}%`, height: `${40 + rand() * 15}%` },
      blob4: { ...randomPosition(), width: `${25 + rand() * 12}%`, height: `${25 + rand() * 12}%` },
      rotation1: rand() * 60,
      rotation2: rand() * 60,
      rotation3: rand() * 60,
      rotation4: rand() * 60,
    };
  }, [jobId]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", colors.base, className)}>
      <div className={cn("absolute rounded-full blur-3xl", colors.primary)} style={{ ...randomValues.blob1, transform: `rotate(${randomValues.rotation1}deg)` }} />
      <div className={cn("absolute rounded-full blur-3xl", colors.secondary)} style={{ ...randomValues.blob2, transform: `rotate(${randomValues.rotation2}deg)` }} />
      <div className={cn("absolute rounded-full blur-2xl", colors.accent)} style={{ ...randomValues.blob3, transform: `rotate(${randomValues.rotation3}deg)` }} />
      <div className={cn("absolute rounded-full blur-2xl", colors.highlight)} style={{ ...randomValues.blob4, transform: `rotate(${randomValues.rotation4}deg)` }} />
    </div>
  );
};

// Get media type icon
const getMediaIcon = (type: string) => {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("photo")) return Camera;
  if (normalizedType.includes("video")) return Video;
  if (normalizedType.includes("drone") || normalizedType.includes("aerial")) return Plane;
  if (normalizedType.includes("3d") || normalizedType.includes("matterport")) return Box;
  if (normalizedType.includes("floor")) return FileImage;
  if (normalizedType.includes("virtual") || normalizedType.includes("tour")) return Compass;
  return Camera;
};

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
        "group relative w-full max-w-full rounded-md overflow-hidden transition-all duration-200",
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
      {/* Aurora Gradient Background */}
      <AuroraGradientKanban
        status={job.status}
        jobId={job.id}
        className="group-hover:scale-[1.02] transition-transform duration-300 pointer-events-none"
      />

      {/* Blur overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/80 via-card/60 to-card/90" />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col justify-between h-full p-3 space-y-3">
        {/* Top Row - Priority, Order Number, Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Badge */}
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1 rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200",
                priorityConfig.priority === "urgent" && "bg-priority-urgent/10 text-priority-urgent",
                priorityConfig.priority === "rush" && "bg-priority-rush/10 text-priority-rush",
                priorityConfig.priority === "standard" && "bg-priority-standard/10 text-priority-standard"
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
                className="rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200"
              >
                <span className="text-[10px] font-medium">#{job.orderNumber}</span>
              </Badge>
            )}
          </div>

          {/* Right side - Status and More button */}
          <div className="flex items-center gap-1.5">
            {/* Status Badge */}
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 rounded-full backdrop-blur-md! bg-card/60! group-hover:bg-card! transition-colors duration-200"
            >
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  job.status === "pending" && "bg-status-pending",
                  job.status === "assigned" && "bg-status-assigned",
                  job.status === "in_progress" && "bg-status-in-progress",
                  job.status === "editing" && "bg-status-editing",
                  job.status === "delivered" && "bg-status-delivered",
                  job.status === "cancelled" && "bg-status-cancelled"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  job.status === "pending" && "text-status-pending",
                  job.status === "assigned" && "text-status-assigned",
                  job.status === "in_progress" && "text-status-in-progress",
                  job.status === "editing" && "text-status-editing",
                  job.status === "delivered" && "text-status-delivered",
                  job.status === "cancelled" && "text-status-cancelled"
                )}
              >
                {statusConfig.label}
              </span>
            </Badge>

            {/* More options dropdown */}
            <div
              className="relative z-50"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full backdrop-blur-md! bg-card/60! hover:bg-card! transition-colors duration-200"
                    data-dropdown-trigger="true"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-10000"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {onJobClick && (
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); onJobClick(); }}>
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onViewRankings && (job.status === "pending" || job.status === "assigned") && !job.assignedTechnicianId && canAssignTechnician && (
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); onViewRankings(); }}>
                      Find Technician
                    </DropdownMenuItem>
                  )}
                  {onChangeTechnician && job.assignedTechnicianId && (job.status === "assigned" || job.status === "in_progress") && canAssignTechnician && (
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); onChangeTechnician(); }}>
                      Change Technician
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Middle Section - Address and Client */}
        <div className="space-y-1 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                {job.propertyAddress}
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <P className="wrap-break-word">{job.propertyAddress}</P>
            </TooltipContent>
          </Tooltip>
          {job.clientName && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {job.clientName}
            </p>
          )}
        </div>

        {/* Bottom Row - Date, Time, Media Types, Assignee */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              <span>{formattedDate}</span>
            </div>
            {job.scheduledTime && (
              <div className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                <span>{job.scheduledTime}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Media Types */}
            {job.mediaType && job.mediaType.length > 0 && (
              <div className="flex items-center gap-1">
                {job.mediaType.slice(0, 3).map((type) => {
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
                {job.mediaType.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{job.mediaType.length - 3}</span>
                )}
              </div>
            )}

            {/* Assignee Avatar */}
            {assignees.length > 0 && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="cursor-pointer">
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarImage src={assignees[0].avatar} alt={assignees[0].name} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        {assignees[0].name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-0" align="end">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12 border-2 border-background">
                        <AvatarImage src={assignees[0].avatar} alt={assignees[0].name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {assignees[0].name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-semibold text-sm truncate">{assignees[0].name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-foreground">{assignees[0].rating.overall}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{assignees[0].reliability.totalJobs} jobs</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground">On-time</span>
                        <span className="text-foreground font-medium">{(assignees[0].reliability.onTimeRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className="text-foreground font-medium">{assignees[0].reliability.averageDeliveryTime}h</span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
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
