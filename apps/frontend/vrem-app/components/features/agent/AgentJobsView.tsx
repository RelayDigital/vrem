"use client";

import { JobRequest, Technician } from "../../../types";
import { JobCard } from "../../shared/jobs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { PaginatedJobGrid } from "../../shared/jobs";
import { PageHeader } from "../../shared/layout";
import {
  Plus,
  Briefcase,
  Clock,
  CheckCircle2,
  Camera,
  Video,
  Plane,
  Sunset,
  MapPin,
  Calendar,
  Zap,
  AlertCircle,
} from "lucide-react";
import { JobsStatsBar } from "./views/JobsStatsBar";
import { TableCell } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { H2, P } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { SetupGuideWidget } from "../tours/SetupGuideWidget";
import { useTour } from "@/context/tour-context";

interface AgentJobsViewProps {
  jobs: JobRequest[];
  technicians: Technician[];
  organizationId: string;
  onNewJobClick: () => void;
  onJobClick?: (job: JobRequest) => void;
}

export function AgentJobsView({
  jobs,
  technicians,
  organizationId,
  onNewJobClick,
  onJobClick: onJobClickProp,
}: AgentJobsViewProps) {
  const { user } = useRequireRole([
    "AGENT",
    "TECHNICIAN",
    "EDITOR",
    "PROJECT_MANAGER",
    "COMPANY",
  ]);
  const router = useRouter();
  const { shouldShowGuide, isTourActive } = useTour();
  // Use technicians if provided, fallback to technicians for backwards compatibility
  const effectiveTechnicians = technicians || technicians || [];
  // For agents, don't filter by org - customer-assigned projects can belong to any org
  // The backend already returns only the projects the agent should see
  const myJobs = jobs;

  const pendingJobs = myJobs.filter((j) => j.status === "pending");
  const assignedJobs = myJobs.filter((j) => j.status === "assigned");
  const inProgressJobs = myJobs.filter((j) => j.status === "in_progress");
  const completedJobs = myJobs.filter((j) => j.status === "delivered");

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

  const handleJobClick = (job: JobRequest) => {
    if (onJobClickProp) {
      // Use callback if provided (for sheet/task view during tour)
      onJobClickProp(job);
      // Dispatch event to notify tour that task view is opening
      if (isTourActive) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('jobTaskViewOpened', { detail: { id: job.id } }));
        }, 100);
      }
    } else {
      // Default: navigate to full job page
      router.push(`/jobs/${job.id}`);
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

  const renderTableRow = (job: JobRequest) => {
    const assignedId = job.assignedTechnicianId || job.assignedTechnicianId;
    const technician = assignedId
      ? effectiveTechnicians.find((t) => t.id === assignedId)
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
                {format(new Date(job.scheduledDate), "MMM d, yyyy")}
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
          <Badge variant={priorityConfig.variant} className="gap-1">
            <PriorityIcon className="h-3 w-3" />
            {priorityConfig.label}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </TableCell>
        <TableCell>
          {technician ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={technician.avatar} alt={technician.name} />
                <AvatarFallback>
                  {technician.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{technician.name}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {/* Agent view doesn't need action buttons typically */}
        </TableCell>
      </>
    );
  };

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md" data-tour="dashboard-article">
        {/* Setup Guide Widget */}
        {shouldShowGuide && (
          <div className="@container w-full mt-md" data-tour="setup-guide">
            <SetupGuideWidget />
          </div>
        )}
        {/* Header & Stats */}
        <div className={`@container w-full ${shouldShowGuide ? '' : 'mt-md'} mb-md`} data-tour="agent-dashboard">
          <div className="mb-md flex items-baseline justify-between" data-tour="agent-header">
            <H2 className="text-4xl mb-xs">My Jobs</H2>
            <Button variant="default" onClick={onNewJobClick} data-tour="jobs-create-button">
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
          <div className="@container w-full mb-md" data-tour="agent-stats">
            <JobsStatsBar
              pendingCount={pendingJobs.length}
              assignedCount={assignedJobs.length}
              inProgressCount={inProgressJobs.length}
              completedCount={completedJobs.length}
            />
          </div>

          {/* Jobs Tabs */}
          <div className="@container w-full" data-tour="agent-jobs-list">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5 rounded-md" data-tour="jobs-tabs">
                <TabsTrigger value="all">All ({myJobs.length})</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingJobs.length})
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  Assigned ({assignedJobs.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({inProgressJobs.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedJobs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <PaginatedJobGrid
                  items={myJobs}
                  searchPlaceholder="Search by address, client, Order #..."
                  searchFields={(job) =>
                    `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`
                  }
                  filterOptions={[
                    { label: "Urgent", value: "urgent" },
                    { label: "Rush", value: "rush" },
                    { label: "Standard", value: "standard" },
                  ]}
                  onItemClick={handleJobClick}
                  onFilterChange={(value) =>
                    myJobs.filter(
                      (j) => value === "all" || j.priority === value
                    )
                  }
                  renderItem={(job) => {
                    const assignedId =
                      job.assignedTechnicianId || job.assignedTechnicianId;
                    const technician = assignedId
                      ? effectiveTechnicians.find((t) => t.id === assignedId)
                      : undefined;
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        technician={technician}
                        currentUserAccountType={user?.accountType}
                      />
                    );
                  }}
                  renderTableRow={renderTableRow}
                  emptyMessage="No jobs yet"
                  emptyIcon={Briefcase}
                  emptyTitle="No jobs yet"
                  emptyDescription="Create your first booking to get started"
                  emptyAction={{
                    label: "Create Order",
                    onClick: onNewJobClick,
                  }}
                  itemsPerPage={12}
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                <PaginatedJobGrid
                  items={pendingJobs}
                  searchPlaceholder="Search by address, client, Order #..."
                  searchFields={(job) =>
                    `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`
                  }
                  filterOptions={[
                    { label: "Urgent", value: "urgent" },
                    { label: "Rush", value: "rush" },
                    { label: "Standard", value: "standard" },
                  ]}
                  onItemClick={handleJobClick}
                  onFilterChange={(value) =>
                    pendingJobs.filter(
                      (j) => value === "all" || j.priority === value
                    )
                  }
                  renderItem={(job) => {
                    const assignedId =
                      job.assignedTechnicianId || job.assignedTechnicianId;
                    const technician = assignedId
                      ? effectiveTechnicians.find((t) => t.id === assignedId)
                      : undefined;
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        technician={technician}
                        currentUserAccountType={user?.accountType}
                      />
                    );
                  }}
                  renderTableRow={renderTableRow}
                  emptyMessage="No pending jobs"
                  emptyIcon={Clock}
                  emptyTitle="No pending jobs"
                  emptyDescription="All your jobs have been assigned"
                  itemsPerPage={12}
                />
              </TabsContent>

              <TabsContent value="assigned" className="mt-6">
                <PaginatedJobGrid
                  items={assignedJobs}
                  searchPlaceholder="Search by address, client, Order #..."
                  searchFields={(job) =>
                    `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`
                  }
                  filterOptions={[
                    { label: "Urgent", value: "urgent" },
                    { label: "Rush", value: "rush" },
                    { label: "Standard", value: "standard" },
                  ]}
                  onItemClick={handleJobClick}
                  onFilterChange={(value) =>
                    assignedJobs.filter(
                      (j) => value === "all" || j.priority === value
                    )
                  }
                  renderItem={(job) => {
                    const assignedId =
                      job.assignedTechnicianId || job.assignedTechnicianId;
                    const technician = assignedId
                      ? effectiveTechnicians.find((t) => t.id === assignedId)
                      : undefined;
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        technician={technician}
                        currentUserAccountType={user?.accountType}
                      />
                    );
                  }}
                  renderTableRow={renderTableRow}
                  emptyMessage="No assigned jobs"
                  emptyIcon={Briefcase}
                  emptyTitle="No assigned jobs"
                  emptyDescription="Jobs will appear here once assigned to a technician"
                  itemsPerPage={12}
                />
              </TabsContent>

              <TabsContent value="in_progress" className="mt-6">
                <PaginatedJobGrid
                  items={inProgressJobs}
                  searchPlaceholder="Search by address, client, Order #..."
                  searchFields={(job) =>
                    `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`
                  }
                  filterOptions={[
                    { label: "Urgent", value: "urgent" },
                    { label: "Rush", value: "rush" },
                    { label: "Standard", value: "standard" },
                  ]}
                  onItemClick={handleJobClick}
                  onFilterChange={(value) =>
                    inProgressJobs.filter(
                      (j) => value === "all" || j.priority === value
                    )
                  }
                  renderItem={(job) => {
                    const assignedId =
                      job.assignedTechnicianId || job.assignedTechnicianId;
                    const technician = assignedId
                      ? effectiveTechnicians.find((t) => t.id === assignedId)
                      : undefined;
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        technician={technician}
                        currentUserAccountType={user?.accountType}
                      />
                    );
                  }}
                  renderTableRow={renderTableRow}
                  emptyMessage="No jobs in progress"
                  emptyIcon={Briefcase}
                  emptyTitle="No jobs in progress"
                  emptyDescription="Active shoots will appear here"
                  itemsPerPage={12}
                />
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                <PaginatedJobGrid
                  items={completedJobs}
                  searchPlaceholder="Search by address, client, Order #..."
                  searchFields={(job) =>
                    `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`
                  }
                  filterOptions={[
                    { label: "Urgent", value: "urgent" },
                    { label: "Rush", value: "rush" },
                    { label: "Standard", value: "standard" },
                  ]}
                  onItemClick={handleJobClick}
                  onFilterChange={(value) =>
                    completedJobs.filter(
                      (j) => value === "all" || j.priority === value
                    )
                  }
                  renderItem={(job) => {
                    const assignedId =
                      job.assignedTechnicianId || job.assignedTechnicianId;
                    const technician = assignedId
                      ? effectiveTechnicians.find((t) => t.id === assignedId)
                      : undefined;
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        technician={technician}
                      />
                    );
                  }}
                  renderTableRow={renderTableRow}
                  emptyMessage="No completed jobs"
                  emptyIcon={CheckCircle2}
                  emptyTitle="No completed jobs"
                  emptyDescription="Finished jobs will appear here"
                  itemsPerPage={12}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </article>
    </main>
  );
}
