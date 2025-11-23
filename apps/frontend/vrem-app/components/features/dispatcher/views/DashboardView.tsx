"use client";

import { JobRequest, Photographer, Metrics } from "../../../../types";
import { MetricsDashboard } from "../../../shared/metrics";
import { JobCard } from "../../../shared/jobs";
import { MapWithSidebar } from "../../../shared/dashboard/MapWithSidebar";
import { MiniCalendarView } from "../../../shared/dashboard/MiniCalendarView";
import { Button } from "../../../ui/button";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { H2 } from "@/components/ui/typography";
import { EmptyState } from "../../../common";

interface DashboardViewProps {
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

export function DashboardView({
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
}: DashboardViewProps) {
  const assignedJobs = jobs.filter((j) => j.status === "assigned");

  // Show only enough jobs to fill one grid row
  // lg: 4 columns, md: 2 columns, sm: 1 column
  const maxJobsToShow = 4;
  const jobsToDisplay = assignedJobs.slice(0, maxJobsToShow);

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Metrics */}
        <div className="@container w-full mt-md">
          <MetricsDashboard metrics={metrics} />
        </div>
        {/* Merged Map and Pending Assignments */}
        <div className="@container w-full">
          <div className="mb-md flex items-baseline justify-between">
            {/* <MapPin className="h-5 w-5 text-primary" /> */}
            <H2 className="text-lg border-0">Live Job Map</H2>
            <Button variant="flat" onClick={onNavigateToMapView}>
              View map
            </Button>
          </div>

          <MapWithSidebar
            jobs={jobs}
            photographers={photographers}
            selectedJob={selectedJob}
            onSelectJob={onSelectJob}
            onNavigateToJobInProjectManagement={
              onNavigateToJobInProjectManagement
            }
            onJobAssign={onJobAssign}
          />
        </div>
        {/* Calendar */}
        <div className="@container w-full mt-md">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg border-0">Schedule</H2>
            <Button variant="flat" onClick={onNavigateToCalendarView}>
              View calendar
            </Button>
          </div>
          <MiniCalendarView
            jobs={jobs}
            photographers={photographers}
            onJobClick={onJobClick}
            onViewFullCalendar={onNavigateToCalendarView}
          />
        </div>
        {/* Active Jobs */}
        <div className="@container w-full mb-md">
          <div className="mb-md flex items-baseline justify-between">
            <H2 className="text-lg">Active Jobs</H2>
            {assignedJobs.length > 0 && onNavigateToJobsView && (
              <Button variant="flat" onClick={onNavigateToJobsView}>
                View all
              </Button>
            )}
          </div>
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
