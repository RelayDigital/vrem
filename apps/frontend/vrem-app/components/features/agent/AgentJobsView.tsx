'use client';

import { JobRequest, Technician, Photographer } from '../../../types';
import { JobCard } from '../../shared/jobs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { PaginatedJobGrid } from '../../shared/jobs';
import { PageHeader } from '../../shared/layout';
import { Plus, Briefcase, Clock, CheckCircle2, Camera, Video, Plane, Sunset, MapPin, Calendar, Zap, AlertCircle } from 'lucide-react';
import { JobsStatsBar } from './views/JobsStatsBar';
import { TableCell } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui/tooltip';
import { P } from '@/components/ui/typography';

interface AgentJobsViewProps {
  jobs: JobRequest[];
  photographers?: Photographer[]; // Deprecated: use technicians
  technicians: Technician[];
  organizationId: string;
  onNewJobClick: () => void;
}

export function AgentJobsView({ jobs, photographers, technicians, organizationId, onNewJobClick }: AgentJobsViewProps) {
  // Use technicians if provided, fallback to photographers for backwards compatibility
  const effectiveTechnicians = technicians || photographers || [];
  // Filter jobs for this agent's organization
  const myJobs = jobs.filter((job) => job.organizationId === organizationId);

  const pendingJobs = myJobs.filter((j) => j.status === 'pending');
  const assignedJobs = myJobs.filter((j) => j.status === 'assigned');
  const inProgressJobs = myJobs.filter((j) => j.status === 'in_progress');
  const completedJobs = myJobs.filter((j) => j.status === 'delivered');

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return Camera;
      case 'video':
        return Video;
      case 'aerial':
        return Plane;
      case 'twilight':
        return Sunset;
      default:
        return Camera;
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          variant: 'destructive' as const,
          label: 'Urgent',
          icon: AlertCircle,
        };
      case 'rush':
        return {
          variant: 'secondary' as const,
          label: 'Rush',
          icon: Zap,
        };
      default:
        return {
          variant: 'outline' as const,
          label: 'Standard',
          icon: Clock,
        };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: 'outline' as const, label: 'Pending' };
      case 'assigned':
        return { variant: 'secondary' as const, label: 'Assigned' };
      case 'in_progress':
        return { variant: 'default' as const, label: 'In Progress' };
      case 'editing':
        return { variant: 'secondary' as const, label: 'Editing' };
      case 'delivered':
        return { variant: 'default' as const, label: 'Delivered' };
      case 'cancelled':
        return { variant: 'destructive' as const, label: 'Cancelled' };
      default:
        return { variant: 'outline' as const, label: status };
    }
  };

  const renderTableRow = (job: JobRequest) => {
    const assignedId = job.assignedTechnicianId || job.assignedPhotographerId;
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
                <span className="truncate max-w-[180px]">{job.propertyAddress}</span>
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
              <span className="text-sm">{format(new Date(job.scheduledDate), 'MMM d, yyyy')}</span>
              {job.scheduledTime && (
                <span className="text-xs text-muted-foreground">{job.scheduledTime}</span>
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
                  {technician.name.split(' ').map(n => n[0]).join('')}
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <PageHeader
          title="My Jobs"
          description="View and manage all your photo shoot bookings"
          action={{
            label: 'New Booking',
            onClick: onNewJobClick,
            icon: <Plus className="h-4 w-4 mr-2" />,
          }}
        />

        {/* Stats Cards */}
        <JobsStatsBar
          pendingCount={pendingJobs.length}
          assignedCount={assignedJobs.length}
          inProgressCount={inProgressJobs.length}
          completedCount={completedJobs.length}
        />

        {/* Jobs Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({myJobs.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingJobs.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({assignedJobs.length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({inProgressJobs.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <PaginatedJobGrid
              items={myJobs}
              searchPlaceholder="Search by address, client, Order #..."
              searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`}
              filterOptions={[
                { label: 'Urgent', value: 'urgent' },
                { label: 'Rush', value: 'rush' },
                { label: 'Standard', value: 'standard' },
              ]}
              onFilterChange={(value) => myJobs.filter((j) => value === 'all' || j.priority === value)}
              renderItem={(job) => {
                const assignedId = job.assignedTechnicianId || job.assignedPhotographerId;
                const technician = assignedId
                  ? effectiveTechnicians.find((t) => t.id === assignedId)
                  : undefined;
                return <JobCard key={job.id} job={job} photographer={technician} />;
              }}
              renderTableRow={renderTableRow}
              emptyMessage="No jobs yet"
              emptyIcon={Briefcase}
              emptyTitle="No jobs yet"
              emptyDescription="Create your first booking to get started"
              emptyAction={{
                label: 'Create Booking',
                onClick: onNewJobClick,
              }}
              itemsPerPage={12}
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <PaginatedJobGrid
              items={pendingJobs}
              searchPlaceholder="Search by address, client, Order #..."
              searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`}
              filterOptions={[
                { label: 'Urgent', value: 'urgent' },
                { label: 'Rush', value: 'rush' },
                { label: 'Standard', value: 'standard' },
              ]}
              onFilterChange={(value) => pendingJobs.filter((j) => value === 'all' || j.priority === value)}
              renderItem={(job) => {
                const assignedId = job.assignedTechnicianId || job.assignedPhotographerId;
                const technician = assignedId
                  ? effectiveTechnicians.find((t) => t.id === assignedId)
                  : undefined;
                return <JobCard key={job.id} job={job} photographer={technician} />;
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
              searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`}
              filterOptions={[
                { label: 'Urgent', value: 'urgent' },
                { label: 'Rush', value: 'rush' },
                { label: 'Standard', value: 'standard' },
              ]}
              onFilterChange={(value) => assignedJobs.filter((j) => value === 'all' || j.priority === value)}
              renderItem={(job) => {
                const assignedId = job.assignedTechnicianId || job.assignedPhotographerId;
                const technician = assignedId
                  ? effectiveTechnicians.find((t) => t.id === assignedId)
                  : undefined;
                return <JobCard key={job.id} job={job} photographer={technician} />;
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
              searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`}
              filterOptions={[
                { label: 'Urgent', value: 'urgent' },
                { label: 'Rush', value: 'rush' },
                { label: 'Standard', value: 'standard' },
              ]}
              onFilterChange={(value) => inProgressJobs.filter((j) => value === 'all' || j.priority === value)}
              renderItem={(job) => {
                const assignedId = job.assignedTechnicianId || job.assignedPhotographerId;
                const technician = assignedId
                  ? effectiveTechnicians.find((t) => t.id === assignedId)
                  : undefined;
                return <JobCard key={job.id} job={job} photographer={technician} />;
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
              searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate} ${job.orderNumber}`}
              filterOptions={[
                { label: 'Urgent', value: 'urgent' },
                { label: 'Rush', value: 'rush' },
                { label: 'Standard', value: 'standard' },
              ]}
              onFilterChange={(value) => completedJobs.filter((j) => value === 'all' || j.priority === value)}
              renderItem={(job) => {
                const assignedId = job.assignedTechnicianId || job.assignedPhotographerId;
                const technician = assignedId
                  ? effectiveTechnicians.find((t) => t.id === assignedId)
                  : undefined;
                return <JobCard key={job.id} job={job} photographer={technician} />;
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
  );
}
