"use client";

import { useState, useMemo, useEffect } from "react";
import { JobRequest, Photographer } from "../../../../types";
import { ChatMessage } from "../../../../types/chat";
import { JobCard, PaginatedJobGrid } from "../../../shared/jobs";
import { JobKanbanBoard } from "../../../shared/kanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import {
  Briefcase,
  Kanban,
  Camera,
  Video,
  Plane,
  Sunset,
  MapPin,
  Calendar,
  Clock,
  Zap,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { TableCell } from "../../../ui/table";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../../ui/avatar";
import { Input } from "../../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip";
import { H2, P } from "@/components/ui/typography";

interface JobsViewProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  messages?: ChatMessage[];
  onViewRankings: (job: JobRequest) => void;
  onChangePhotographer?: (job: JobRequest) => void; // For reassigning photographer
  onJobStatusChange?: (jobId: string, newStatus: JobRequest["status"]) => void;
  onJobClick?: (job: JobRequest) => void;
  disableContextMenu?: boolean;
}

export function JobsView({
  jobs,
  photographers,
  messages = [],
  onViewRankings,
  onChangePhotographer,
  onJobStatusChange,
  onJobClick,
  disableContextMenu = false,
}: JobsViewProps) {
  // Kanban view search, filter, and sort state
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState("");
  const [kanbanSelectedFilter, setKanbanSelectedFilter] =
    useState<string>("all");
  const [kanbanSortBy, setKanbanSortBy] = useState<string>("date-desc");
  const [headerHeight, setHeaderHeight] = useState(0);

  // Filter and sort jobs for kanban view
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Apply search filter
    if (kanbanSearchQuery) {
      const query = kanbanSearchQuery.toLowerCase();
      result = result.filter((job) => {
        const searchableText =
          `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`.toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Apply custom filter
    if (kanbanSelectedFilter !== "all") {
      // Check if it's a priority filter
      if (["urgent", "rush", "standard"].includes(kanbanSelectedFilter)) {
        result = result.filter((j) => j.priority === kanbanSelectedFilter);
      } else {
        // Otherwise it's a status filter
        result = result.filter((j) => j.status === kanbanSelectedFilter);
      }
      // Re-apply search after custom filter
      if (kanbanSearchQuery) {
        const query = kanbanSearchQuery.toLowerCase();
        result = result.filter((job) => {
          const searchableText =
            `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`.toLowerCase();
          return searchableText.includes(query);
        });
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (kanbanSortBy) {
        case "date-asc":
          // Sort by scheduledDate ascending (earliest first)
          if (a.scheduledDate && b.scheduledDate) {
            return (
              new Date(a.scheduledDate).getTime() -
              new Date(b.scheduledDate).getTime()
            );
          }
          if (a.scheduledDate) return -1;
          if (b.scheduledDate) return 1;
          return 0;
        case "date-desc":
          // Sort by scheduledDate descending (latest first)
          if (a.scheduledDate && b.scheduledDate) {
            return (
              new Date(b.scheduledDate).getTime() -
              new Date(a.scheduledDate).getTime()
            );
          }
          if (a.scheduledDate) return -1;
          if (b.scheduledDate) return 1;
          return 0;
        case "client-asc":
          // Sort by clientName A-Z
          if (a.clientName && b.clientName) {
            return a.clientName.localeCompare(b.clientName);
          }
          return 0;
        case "client-desc":
          // Sort by clientName Z-A
          if (a.clientName && b.clientName) {
            return b.clientName.localeCompare(a.clientName);
          }
          return 0;
        case "priority":
          // Sort by priority: urgent > rush > standard
          const priorityOrder: Record<string, number> = {
            urgent: 3,
            rush: 2,
            standard: 1,
          };
          const priorityA = priorityOrder[a.priority] || 0;
          const priorityB = priorityOrder[b.priority] || 0;
          return priorityB - priorityA;
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, kanbanSearchQuery, kanbanSelectedFilter, kanbanSortBy]);

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
          variant: "destructive" as const,
          label: "Urgent",
          icon: AlertCircle,
        };
      case "rush":
        return {
          variant: "secondary" as const,
          label: "Rush",
          icon: Zap,
        };
      default:
        return {
          variant: "outline" as const,
          label: "Standard",
          icon: Clock,
        };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { variant: "outline" as const, label: "Pending" };
      case "assigned":
        return { variant: "secondary" as const, label: "Assigned" };
      case "in_progress":
        return { variant: "default" as const, label: "In Progress" };
      case "editing":
        return { variant: "secondary" as const, label: "Editing" };
      case "delivered":
        return { variant: "default" as const, label: "Delivered" };
      case "cancelled":
        return { variant: "destructive" as const, label: "Cancelled" };
      default:
        return { variant: "outline" as const, label: status };
    }
  };

  // useEffect(() => {
  //   const measureHeader = () => {
  //     const header = document.querySelector("header");
  //     if (header) {
  //       setHeaderHeight(header.offsetHeight);
  //     }
  //   };

  //   // Measure on mount
  //   measureHeader();

  //   // Measure on resize
  //   window.addEventListener("resize", measureHeader);

  //   // Also use ResizeObserver for more accurate measurements
  //   const header = document.querySelector("header");
  //   let resizeObserver: ResizeObserver | null = null;

  //   if (header) {
  //     resizeObserver = new ResizeObserver(() => {
  //       measureHeader();
  //     });
  //     resizeObserver.observe(header);
  //   }

  //   // Prevent body scrolling when map view is active
  //   document.body.style.overflow = "hidden";
  //   document.documentElement.style.overflow = "hidden";

  //   return () => {
  //     window.removeEventListener("resize", measureHeader);
  //     if (resizeObserver) {
  //       resizeObserver.disconnect();
  //     }
  //     // Restore scrolling when component unmounts
  //     document.body.style.overflow = "";
  //     document.documentElement.style.overflow = "";
  //   };
  // }, []);

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        <div className="@container w-full mt-md mb-md">
          <H2 className="text-4xl mb-xs">Jobs</H2>
          <Tabs defaultValue="all" className="gap-0 size-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
              <TabsTrigger
                value="all"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="h-4 w-4" />
                All Jobs
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Kanban className="h-4 w-4" />
                Project Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <PaginatedJobGrid
                items={jobs}
                searchPlaceholder="Search by address, client, Order #..."
                searchFields={(job) =>
                  `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`
                }
                filterOptions={[
                  { label: "Urgent", value: "urgent" },
                  { label: "Rush", value: "rush" },
                  { label: "Standard", value: "standard" },
                  { label: "Pending", value: "pending" },
                  { label: "Assigned", value: "assigned" },
                  { label: "In Progress", value: "in_progress" },
                  { label: "Delivered", value: "delivered" },
                ]}
                onFilterChange={(value) => {
                  if (value === "all") return jobs;
                  // Check if it's a priority filter
                  if (["urgent", "rush", "standard"].includes(value)) {
                    return jobs.filter((j) => j.priority === value);
                  }
                  // Otherwise it's a status filter
                  return jobs.filter((j) => j.status === value);
                }}
                renderItem={(job, index, viewMode) => {
                  const photographer = job.assignedPhotographerId
                    ? photographers.find(
                        (p) => p.id === job.assignedPhotographerId
                      )
                    : undefined;
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      photographer={photographer}
                      onViewRankings={
                        job.status === "pending"
                          ? () => onViewRankings(job)
                          : undefined
                      }
                      onClick={onJobClick ? () => onJobClick(job) : undefined}
                    />
                  );
                }}
                renderTableRow={(job) => {
                  const photographer = job.assignedPhotographerId
                    ? photographers.find(
                        (p) => p.id === job.assignedPhotographerId
                      )
                    : undefined;
                  const priorityConfig = getPriorityConfig(job.priority);
                  const statusConfig = getStatusConfig(job.status);
                  const PriorityIcon = priorityConfig.icon;

                  return (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[180px]">
                                {job.propertyAddress}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <P className="max-w-xs">{job.propertyAddress}</P>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{job.clientName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(
                                new Date(job.scheduledDate),
                                "MMM d, yyyy"
                              )}
                            </span>
                            {job.scheduledTime && (
                              <span className="text-xs text-muted-foreground">
                                {job.scheduledTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {job.mediaType.map((type) => {
                            const Icon = getMediaIcon(type);
                            return (
                              <Tooltip key={type}>
                                <TooltipTrigger asChild>
                                  <div className="p-1.5 rounded bg-muted">
                                    <Icon className="h-3 w-3" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <P className="capitalize">{type}</P>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={priorityConfig.variant}
                          className="gap-1"
                        >
                          <PriorityIcon className="h-3 w-3" />
                          {priorityConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {photographer ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={photographer.avatar}
                                alt={photographer.name}
                              />
                              <AvatarFallback>
                                {photographer.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{photographer.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewRankings(job)}
                            >
                              Find Photographer
                            </Button>
                          )}
                          {onJobClick && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onJobClick(job)}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </>
                  );
                }}
                emptyMessage="No jobs found"
                emptyIcon={Briefcase}
                emptyTitle="No jobs found"
                emptyDescription="Jobs will appear here once created"
                itemsPerPage={12}
              />
            </TabsContent>

            <TabsContent
              value="kanban"
              className="mt-0"
            >
              <div className="flex flex-col space-y-4">
                {/* Search, Filter, and Sort Bar */}
                <div className="flex gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      type="text"
                      variant="muted"
                      placeholder="Search by address, client, Order #..."
                      value={kanbanSearchQuery}
                      onChange={(e) => setKanbanSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={kanbanSelectedFilter}
                    onValueChange={setKanbanSelectedFilter}
                  >
                    <SelectTrigger
                      variant="muted"
                      className="w-10 md:w-[180px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block"
                    >
                      <Filter className="h-4 w-4 md:mr-2" />
                      <SelectValue
                        placeholder="All Items"
                        className="hidden md:inline"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="rush">Rush</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={kanbanSortBy} onValueChange={setKanbanSortBy}>
                    <SelectTrigger
                      variant="muted"
                      className="w-10 md:w-[180px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block"
                    >
                      <ArrowUpDown className="h-4 w-4 md:mr-2" />
                      <SelectValue
                        placeholder="Sort by"
                        className="hidden md:inline"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">
                        Date (Newest First)
                      </SelectItem>
                      <SelectItem value="date-asc">
                        Date (Oldest First)
                      </SelectItem>
                      <SelectItem value="client-asc">Client (A-Z)</SelectItem>
                      <SelectItem value="client-desc">Client (Z-A)</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Kanban Board */}
                <JobKanbanBoard
                  jobs={filteredAndSortedJobs}
                  photographers={photographers}
                  messages={messages}
                  onViewRankings={onViewRankings}
                  onChangePhotographer={onChangePhotographer}
                  onJobStatusChange={onJobStatusChange}
                  onJobClick={onJobClick}
                  disableContextMenu={disableContextMenu}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </article>
    </main>
  );
}
