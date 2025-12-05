"use client";

import { useMemo, useState } from "react";
import { JobRequest, Technician } from "@/types";
import { JobCard } from "@/components/shared/jobs";
import { MapWithSidebar } from "@/components/shared/dashboard/MapWithSidebar";
import { MonthView } from "@/components/features/calendar/MonthView";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { H2 } from "@/components/ui/typography";
import { EmptyState } from "@/components/common";
import { jobToCalendarEvent } from "@/lib/calendar-utils";
import {
  CalendarEvent,
  generateTechnicianColors,
} from "@/types/calendar";
import { StatsGrid } from "@/components/shared/dashboard";
import { CheckCircle2, Star, TrendingUp } from "lucide-react";

interface ProviderDashboardViewProps {
  jobs: JobRequest[]; // Already filtered to assigned jobs
  technicians: Technician[];
  selectedJob: JobRequest | null;
  stats: {
    upcoming: number;
    completed: number;
    rating: number;
    onTimeRate: string;
  };
  onSelectJob: (job: JobRequest) => void;
  onNavigateToJobsView?: () => void;
  onNavigateToMapView?: () => void;
  onNavigateToCalendarView?: () => void;
  onNavigateToJobInProjectManagement?: (job: JobRequest) => void;
  onJobClick?: (job: JobRequest) => void;
  currentUserId?: string | null;
}

export function ProviderDashboardView({
  jobs,
  technicians,
  selectedJob,
  stats,
  onSelectJob,
  onNavigateToJobsView,
  onNavigateToMapView,
  onNavigateToCalendarView,
  onNavigateToJobInProjectManagement,
  onJobClick,
  currentUserId,
}: ProviderDashboardViewProps) {
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
  const displayTechnicians = technicians ?? [];

  const techniciansWithLocation = useMemo(
    () =>
      displayTechnicians.filter((tech) => {
        if (
          !tech?.homeLocation ||
          typeof tech.homeLocation.lat !== "number" ||
          typeof tech.homeLocation.lng !== "number"
        ) {
          return false;
        }
        const address = tech.homeLocation.address || {};
        const hasAddressDetails = [
          address.street,
          address.city,
          address.stateProvince,
          address.postalCode,
          address.country,
        ].some(Boolean);
        return hasAddressDetails;
      }),
    [displayTechnicians]
  );

  const selfTechnician = useMemo(
    () =>
      currentUserId
        ? techniciansWithLocation.find((tech) => tech.id === currentUserId)
        : undefined,
    [techniciansWithLocation, currentUserId]
  );

  const calendarTechnicians =
    techniciansWithLocation.length > 0
      ? techniciansWithLocation
      : displayTechnicians;

  // For the technician dashboard, only show the current technician on the map.
  // Derive the technician IDs that appear on this user's jobs and filter to those.
  const mapTechnicians = useMemo(() => {
    const ids = new Set(
      jobs
        .map((job) => job.assignedTechnicianId || job.assignedTechnicianId)
        .filter((id): id is string => Boolean(id))
    );
    const filtered = techniciansWithLocation.filter((p) => ids.has(p.id));
    if (filtered.length > 0) return filtered;
    if (selfTechnician) return [selfTechnician];
    // Fallback: show the first technician with a location so the user sees a marker
    return techniciansWithLocation.length > 0
      ? [techniciansWithLocation[0]]
      : [];
  }, [jobs, techniciansWithLocation, selfTechnician]);

  // Generate technician colors for the (possibly single) technician shown on the map
  const technicianColors = useMemo(
    () => generateTechnicianColors(mapTechnicians),
    [mapTechnicians]
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

  return (
    <main className="container relative mx-auto">
      <article className="flex flex-col gap-2xl md:gap-3xl px-md">
        {/* Metrics */}
        <div className="@container w-full mt-md">
          <StatsGrid
            stats={[
              {
                icon: Briefcase,
                value: stats.upcoming,
                label: "Upcoming Jobs",
                iconBgColor: "bg-accent",
                iconColor: "text-primary",
              },
              {
                icon: CheckCircle2,
                value: stats.completed,
                label: "Total Completed",
                iconBgColor: "bg-emerald-100",
                iconColor: "text-emerald-600",
              },
              {
                icon: Star,
                value: stats.rating.toFixed(1),
                label: "Rating",
                iconBgColor: "bg-yellow-100",
                iconColor: "text-yellow-600",
              },
              {
                icon: TrendingUp,
                value: stats.onTimeRate,
                label: "On-Time Rate",
                valueSuffix: "%",
                iconBgColor: "bg-accent",
                iconColor: "text-primary",
              },
            ]}
          />
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
              technicians={calendarTechnicians}
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
            providers={mapTechnicians}
            selectedJob={selectedJob}
            onSelectJob={onSelectJob}
            onNavigateToJobInProjectManagement={
              onNavigateToJobInProjectManagement
            }
            onJobAssign={undefined} // Technicians cannot assign jobs to themselves
            isDispatcherView={false}
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
                  const technician = technicians.find(
                    (p) => p.id === job.assignedTechnicianId
                  );
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      technician={technician}
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
              description="There are currently no active jobs assigned to you."
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
