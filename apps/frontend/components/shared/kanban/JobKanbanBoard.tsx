"use client";

import { useMemo } from "react";
import { JobRequest, Technician } from "../../../types";
import { ChatMessage } from "../../../types/chat";
import { JobCardKanban } from "../jobs/JobCardKanban";
import { Badge } from "../../ui/badge";
import { Calendar, Camera, Scissors, CheckCircle2 } from "lucide-react";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from "../../ui/shadcn-io/kanban";

interface JobKanbanBoardProps {
  jobs: JobRequest[];
  technicians: Technician[];
  messages?: ChatMessage[];
  onViewRankings?: (job: JobRequest) => void;
  onChangeTechnician?: (job: JobRequest) => void; // For reassigning technician
  onJobStatusChange?: (jobId: string, newStatus: JobRequest["status"]) => void;
  onJobClick?: (job: JobRequest) => void;
  disableContextMenu?: boolean; // Disable context menu when sheet is open
  /** 
   * Function to check if user can change status for a specific job.
   * If not provided, all jobs are draggable.
   * Used to disable drag-and-drop for jobs the user cannot edit.
   */
  canChangeJobStatus?: (job: JobRequest) => boolean;
}

type PipelineStage = "booked" | "shooting" | "editing" | "delivered";

interface KanbanColumn extends Record<string, unknown> {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  statuses: JobRequest["status"][];
  targetStatus: JobRequest["status"];
}

const columns: KanbanColumn[] = [
  {
    id: "booked",
    name: "Booked",
    icon: Calendar,
    color: "text-blue-600",
    statuses: ["pending", "assigned"],
    targetStatus: "assigned",
  },
  {
    id: "shooting",
    name: "Shooting",
    icon: Camera,
    color: "text-purple-600",
    statuses: ["in_progress"],
    targetStatus: "in_progress",
  },
  {
    id: "editing",
    name: "Editing",
    icon: Scissors,
    color: "text-orange-600",
    statuses: ["editing"],
    targetStatus: "editing",
  },
  {
    id: "delivered",
    name: "Delivered",
    icon: CheckCircle2,
    color: "text-green-600",
    statuses: ["delivered"],
    targetStatus: "delivered",
  },
];

interface JobKanbanItem extends Record<string, unknown> {
  id: string;
  name: string;
  column: string;
  job: JobRequest;
}

export function JobKanbanBoard({
  jobs,
  technicians,
  messages = [],
  onViewRankings,
  onChangeTechnician,
  onJobStatusChange,
  onJobClick,
  disableContextMenu = false,
  canChangeJobStatus,
}: JobKanbanBoardProps) {
  // Transform jobs into kanban items
  const kanbanData = useMemo<JobKanbanItem[]>(() => {
    return jobs.map((job) => {
      // Find which column this job belongs to
      const column = columns.find((col) => col.statuses.includes(job.status));
      return {
        id: job.id,
        name: job.propertyAddress,
        column: column?.id || "booked",
        job,
      };
    });
  }, [jobs]);

  // Handle data changes (when items are moved between columns)
  const handleDataChange = (newData: unknown[]) => {
    if (!onJobStatusChange) return;

    const typedData = newData as JobKanbanItem[];
    // Find jobs that changed columns by comparing with current kanbanData
    typedData.forEach((newItem) => {
      const oldItem = kanbanData.find((item) => item.id === newItem.id);
      if (oldItem && oldItem.column !== newItem.column) {
        const targetColumn = columns.find((col) => col.id === newItem.column);
        if (targetColumn) {
          // For "Booked" stage, keep the current status if it's already pending or assigned
          if (targetColumn.id === "booked") {
            if (
              newItem.job.status === "pending" ||
              newItem.job.status === "assigned"
            ) {
              // Already in booked stage, no change needed
              return;
            }
            // Moving to booked from another stage, set to assigned
            onJobStatusChange(newItem.job.id, "assigned");
          } else {
            onJobStatusChange(newItem.job.id, targetColumn.targetStatus);
          }
        }
      }
    });
  };

  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden">
      <KanbanProvider
        columns={columns}
        data={kanbanData}
        onDataChange={handleDataChange}
        className="h-full"
      >
        {(column: KanbanColumn) => {
          const Icon = column.icon as React.ComponentType<{
            className?: string;
          }>;
          const columnJobs = kanbanData.filter(
            (item) => item.column === column.id
          );

          return (
            <KanbanBoard
              key={column.id}
              id={column.id}
              className="relative shrink-0 md:max-w-[350px] shadow-none"
            >
              <KanbanHeader className="flex items-center justify-between p-4 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${column.color}`} />
                  <span className="text-sm font-semibold">{column.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnJobs.length}
                </Badge>
              </KanbanHeader>
              {columnJobs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <div className="text-center py-8 text-muted-foreground text-sm px-4">
                    No jobs in this column
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <KanbanCards id={column.id} className="h-full">
                  {(item) => {
                    const jobItem = item as JobKanbanItem;
                    const technician = jobItem.job.assignedTechnicianId
                      ? technicians.find(
                          (p) => p.id === jobItem.job.assignedTechnicianId
                        )
                      : undefined;
                    
                    // Check if user can change status for this job
                    // If canChangeJobStatus is not provided, assume all jobs are draggable
                    const canDrag = canChangeJobStatus 
                      ? canChangeJobStatus(jobItem.job) 
                      : true;

                    return (
                      <div key={jobItem.id} className="w-full">
                        <KanbanCard
                          id={jobItem.id}
                          name={jobItem.name}
                          column={jobItem.column}
                          className="p-0 w-full border-none shadow-none hover:translate-y-[-2px] transition-transform duration-200"
                          disabled={!canDrag}
                        >
                          <JobCardKanban
                            job={jobItem.job}
                            technician={technician}
                            messages={messages}
                            onViewRankings={
                              (jobItem.job.status === "pending" ||
                                jobItem.job.status === "assigned") &&
                              onViewRankings
                                ? () => onViewRankings(jobItem.job)
                                : undefined
                            }
                            onChangeTechnician={
                              onChangeTechnician
                                ? () => onChangeTechnician(jobItem.job)
                                : undefined
                            }
                            onJobClick={
                              onJobClick
                                ? () => onJobClick(jobItem.job)
                                : undefined
                            }
                            disableContextMenu={disableContextMenu}
                          />
                        </KanbanCard>
                      </div>
                    );
                  }}
                  </KanbanCards>
                </div>
              )}
            </KanbanBoard>
          );
          }}
        </KanbanProvider>
    </div>
  );
}