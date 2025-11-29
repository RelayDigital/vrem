"use client";

import { useMemo, useState } from "react";
import { JobRequest, Photographer, Metrics } from "../../../../types";
import { MetricsDashboard } from "../../../shared/metrics";
import { USE_MOCK_DATA } from "../../../../lib/utils";
import { JobCard } from "../../../shared/jobs";
import { MapWithSidebar } from "../../../shared/dashboard/MapWithSidebar";
import { MonthView } from "../../../features/calendar/MonthView";
import { Button } from "../../../ui/button";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { H2 } from "@/components/ui/typography";
import { EmptyState } from "../../../common";
import { jobToCalendarEvent } from "../../../../lib/calendar-utils";
import {
  CalendarEvent,
  generateTechnicianColors,
} from "../../../../types/calendar";

interface DispatcherDashboardViewProps {
  jobs: JobRequest[];
  photographers: Photographer[];
  metrics: Metrics;
  selectedJob: JobRequest | null;
  onViewRankings: (job: JobRequest) => void;
  onSelectJob: (job: JobRequest) => void;
  onNavigateToJobsView?: () => void;
  onNavigateToMapView?: () => void;
  onNavigateToCalendarView?: () => void;
  onNavigateToJobInProjectManagement?: (job: JobRequest) => void;
  onJobAssign?: (jobId: string, photographerId: string, score: number) => void;
  onJobClick?: (job: JobRequest) => void;
}

export function DispatcherDashboardView({
  jobs,
  photographers,
  metrics,
  selectedJob,
  onViewRankings,
  onSelectJob,
  onNavigateToJobsView,
  onNavigateToMapView,
  onNavigateToCalendarView,
  onNavigateToJobInProjectManagement,
  onJobAssign,
  onJobClick,
}: DispatcherDashboardViewProps) {
  const assignedJobs = jobs.filter((j) => j.status === "assigned");
  const [currentDate] = useState(new Date());

  // Show only enough jobs to fill one grid row
  // lg: 4 columns, md: 2 columns, sm: 1 column
  const maxJobsToShow = 4;
  const jobsToDisplay = assignedJobs.slice(0, maxJobsToShow);

  // Convert jobs to calendar events
  const calendarEvents = useMemo(() => {
    return jobs.map((job) => jobToCalendarEvent(job));
  }, [jobs]);

  // Use empty array when mock data is disabled
  const displayPhotographers = USE_MOCK_DATA ? photographers : [];

  // Generate technician colors
  const technicianColors = useMemo(
    () => generateTechnicianColors(displayPhotographers),
    [displayPhotographers]
  );

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    if (event.jobId && onJobClick) {
      const job = jobs.find((j) => j.id === event.jobId);
      if (job) {
        onJobClick(job);
      }
    }
  };

  // Handle day click - navigate to calendar view
  const handleDayClick = (date: Date) => {
    if (onNavigateToCalendarView) {
      onNavigateToCalendarView();
    }
  };

  // Use empty metrics when mock data is disabled
  const displayMetrics = USE_MOCK_DATA
    ? metrics
    : {
        organizationId: "",
        period: "week" as const,
        jobs: {
          total: 0,
          pending: 0,
          assigned: 0,
          completed: 0,
          cancelled: 0,
        },
        photographers: {
          active: 0,
          available: 0,
          utilization: 0,
        },
        technicians: {
          active: 0,
          available: 0,
          utilization: 0,
        },
        performance: {
          averageAssignmentTime: 0,
          averageDeliveryTime: 0,
          onTimeRate: 0,
          clientSatisfaction: 0,
        },
        revenue: {
          total: 0,
          perJob: 0,
        },
      };

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Metrics */}
        <div className="@container w-full mt-md">
          {/* Content */}
          <MetricsDashboard metrics={displayMetrics} />
        </div>
        {/* Calendar */}
        <div className="@container w-full">
          {/* Heading and button */}
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">Schedule</H2>
            <Button
              variant="flat"
              className="px-0"
              onClick={onNavigateToCalendarView}
            >
              View calendar
            </Button>
          </div>
          {/* Content */}
          <div className="border rounded-md overflow-hidden">
            <MonthView
              currentDate={currentDate}
              events={calendarEvents}
              technicians={displayPhotographers}
              technicianColors={technicianColors}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
              compact={true}
            />
          </div>
        </div>
        {/* Merged Map and Pending Assignments */}
        <div className="@container w-full">
          {/* Heading and button */}
          <div className="mb-md flex items-baseline justify-between">
            {/* <MapPin className="h-5 w-5 text-primary" /> */}
            <H2 className="text-lg border-0">Live Job Map</H2>
            <Button
              variant="flat"
              className="px-0"
              onClick={onNavigateToMapView}
            >
              View map
            </Button>
          </div>

          {/* Content */}
          <MapWithSidebar
            jobs={jobs}
            photographers={displayPhotographers}
            selectedJob={selectedJob}
            onSelectJob={onSelectJob}
            onNavigateToJobInProjectManagement={
              onNavigateToJobInProjectManagement
            }
            onJobAssign={onJobAssign}
            isDispatcherView={true}
          />
        </div>
        {/* Active Jobs */}
        <div className="@container w-full mb-md">
          {/* Heading and button */}
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg">Active Jobs</H2>
            {assignedJobs.length > 0 && onNavigateToJobsView && (
              <Button
                variant="flat"
                className="px-0"
                onClick={onNavigateToJobsView}
              >
                View all
              </Button>
            )}
          </div>

          {/* Content */}
          {assignedJobs.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {jobsToDisplay.map((job) => {
                  const photographer = photographers.find(
                    (p) => p.id === job.assignedPhotographerId
                  );
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
                })}
              </div>
            </motion.div>
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No Active Jobs"
              description="There are currently no active jobs assigned to photographers."
              action={
                onNavigateToJobsView
                  ? {
                      label: "View All Jobs",
                      onClick: onNavigateToJobsView,
                    }
                  : undefined
              }
            />
          )}
        </div>
      </article>
    </main>
  );
}
