'use client';

import { JobRequest, Photographer } from '../../../../types';
import { JobCard, PaginatedJobGrid } from '../../../shared/jobs';
import { JobKanbanBoard } from '../../../shared/kanban';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Briefcase, Kanban, Camera, Video, Plane, Sunset, MapPin, Calendar, Clock, Zap, AlertCircle } from 'lucide-react';
import { TableCell } from '../../../ui/table';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../ui/avatar';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../ui/tooltip';

interface JobsViewProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  onViewRankings: (job: JobRequest) => void;
  onJobStatusChange?: (jobId: string, newStatus: JobRequest['status']) => void;
  onJobClick?: (job: JobRequest) => void;
}

export function JobsView({ jobs, photographers, onViewRankings, onJobStatusChange, onJobClick }: JobsViewProps) {
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

  return (
    <main className="container mx-auto p-6 h-full">

        <Tabs defaultValue="all" className="gap-0 size-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              All Jobs
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Project Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <PaginatedJobGrid
              items={jobs}
              searchPlaceholder="Search by address, client name..."
              searchFields={(job) => `${job.propertyAddress} ${job.clientName} ${job.scheduledDate}`}
              filterOptions={[
                { label: 'Urgent', value: 'urgent' },
                { label: 'Rush', value: 'rush' },
                { label: 'Standard', value: 'standard' },
                { label: 'Pending', value: 'pending' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Delivered', value: 'delivered' },
              ]}
              onFilterChange={(value) => {
                if (value === 'all') return jobs;
                // Check if it's a priority filter
                if (['urgent', 'rush', 'standard'].includes(value)) {
                  return jobs.filter((j) => j.priority === value);
                }
                // Otherwise it's a status filter
                return jobs.filter((j) => j.status === value);
              }}
              renderItem={(job, index, viewMode) => {
                const photographer = job.assignedPhotographerId
                  ? photographers.find((p) => p.id === job.assignedPhotographerId)
                  : undefined;
                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    photographer={photographer}
                    onViewRankings={
                      job.status === 'pending'
                        ? () => onViewRankings(job)
                        : undefined
                    }
                    onClick={onJobClick ? () => onJobClick(job) : undefined}
                  />
                );
              }}
              renderTableRow={(job) => {
                const photographer = job.assignedPhotographerId
                  ? photographers.find((p) => p.id === job.assignedPhotographerId)
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
                            <p className="max-w-xs">{job.propertyAddress}</p>
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
                                <p className="capitalize">{type}</p>
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
                      {photographer ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={photographer.avatar} alt={photographer.name} />
                            <AvatarFallback>
                              {photographer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{photographer.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === 'pending' && (
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

          <TabsContent value="kanban" className="mt-0">
            <JobKanbanBoard
              jobs={jobs}
              photographers={photographers}
              onViewRankings={onViewRankings}
              onJobStatusChange={onJobStatusChange}
              onJobClick={onJobClick}
            />
          </TabsContent>
        </Tabs>

    </main>
  );
}

