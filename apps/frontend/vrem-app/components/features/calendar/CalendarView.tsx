"use client";

import { useState, useMemo, useEffect } from "react";
import { JobRequest, Photographer } from "@/types";
import {
  CalendarEvent,
  CalendarView as ViewType,
  CalendarFilters,
  generateTechnicianColors,
} from "@/types/calendar";
import { jobToCalendarEvent } from "@/lib/calendar-utils";
import { CalendarHeaderToolbar } from "./CalendarHeaderToolbar";
import { CalendarRightSidebar } from "./CalendarRightSidebar";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { MonthView } from "./MonthView";
import { ListView } from "./ListView";
import {
  addDays,
  subDays,
  parseISO,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";
import { getWeekRange } from "@/lib/calendar-utils";
import { useIsMobile } from "@/components/ui/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface CalendarViewProps {
  jobs?: JobRequest[];
  photographers?: Photographer[];
  onJobClick?: (job: JobRequest) => void;
  onCreateJob?: () => void;
}

export function CalendarView({
  jobs = [],
  photographers = [],
  onJobClick,
  onCreateJob,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("week");
  const [timezone, setTimezone] = useState("America/Edmonton");
  const [filters, setFilters] = useState<CalendarFilters>({
    eventTypes: {
      Scheduled: true,
      Unscheduled: true,
      External: true,
    },
    territories: [],
    technicians: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Generate technician colors
  const technicianColors = useMemo(
    () => generateTechnicianColors(photographers),
    [photographers]
  );

  // Convert jobs to calendar events
  const allEvents = useMemo(() => {
    const jobEvents: CalendarEvent[] = jobs.map((job) =>
      jobToCalendarEvent(job)
    );

    // Add some mock external events for demonstration
    const externalEvents: CalendarEvent[] = [
      {
        id: "ext-1",
        title: "External Meeting",
        start: new Date(
          currentDate.getTime() + 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        end: new Date(
          currentDate.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000
        ).toISOString(),
        type: "External",
        externalSource: "Google Calendar",
        technicianId: photographers[0]?.id,
      },
    ];

    return [...jobEvents, ...externalEvents];
  }, [jobs, currentDate, photographers]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // Event type filter
      if (!filters.eventTypes[event.type]) {
        return false;
      }

      // Technician filter
      if (filters.technicians.length > 0) {
        if (
          !event.technicianId ||
          !filters.technicians.includes(event.technicianId)
        ) {
          return false;
        }
      }

      // Territory filter
      if (filters.territories.length > 0) {
        if (
          !event.territory ||
          !filters.territories.includes(event.territory)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, filters]);

  // Detect conflicts (overlapping events for the same technician/photographer)
  // This includes: scheduled jobs overlapping with each other, or external events overlapping with scheduled jobs
  const eventsWithConflicts = useMemo(() => {
    return filteredEvents.map((event) => {
      // Only check conflicts for events with a technician assigned
      if (!event.technicianId) {
        return event;
      }

      const hasConflict = filteredEvents.some((otherEvent) => {
        // Check if events are for the same technician and overlap in time
        if (
          otherEvent.technicianId === event.technicianId &&
          otherEvent.id !== event.id
        ) {
          const eventStart = parseISO(event.start);
          const eventEnd = parseISO(event.end);
          const otherStart = parseISO(otherEvent.start);
          const otherEnd = parseISO(otherEvent.end);

          // Check if events overlap (one starts before the other ends)
          return eventStart < otherEnd && otherStart < eventEnd;
        }
        return false;
      });

      return { ...event, hasConflict };
    });
  }, [filteredEvents]);

  // Get unique territories from events
  const territories = useMemo(() => {
    const territorySet = new Set<string>();
    allEvents.forEach((event) => {
      if (event.territory) {
        territorySet.add(event.territory);
      }
    });
    return Array.from(territorySet);
  }, [allEvents]);

  const handlePrev = () => {
    switch (view) {
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "list":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "list":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(startOfDay(new Date()));
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.jobId && onJobClick) {
      const job = jobs.find((j) => j.id === event.jobId);
      if (job) {
        onJobClick(job);
      }
    }
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const renderView = () => {
    const commonProps = {
      currentDate,
      events: eventsWithConflicts,
      technicians: photographers,
      technicianColors,
      onEventClick: handleEventClick,
    };

    switch (view) {
      case "day":
        return <DayView {...commonProps} />;
      case "week":
        return <WeekView {...commonProps} />;
      case "month":
        return <MonthView {...commonProps} onDayClick={handleDayClick} />;
      case "list":
        return <ListView {...commonProps} />;
      default:
        return <WeekView {...commonProps} />;
    }
  };

  const sidebarContent = (
    <CalendarRightSidebar
      currentDate={currentDate}
      view={view}
      onDateSelect={(date) => {
        setCurrentDate(date);
        if (isMobile) {
          setSidebarOpen(false);
        }
      }}
      filters={filters}
      onFiltersChange={setFilters}
      technicians={photographers}
      technicianColors={technicianColors}
      territories={territories}
      timezone={timezone}
      onTimezoneChange={setTimezone}
    />
  );

  return (
    <div className="flex flex-col size-full">
      <CalendarHeaderToolbar
        currentDate={currentDate}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={setView}
        onCreateJob={onCreateJob}
      />

      <div className="grid grid-cols-1 lg:grid-cols-6 overflow-hidden relative h-full">
        {/* Main Calendar Area */}
        <div className="lg:col-span-5 overflow-auto">{renderView()}</div>

        {/* Right Sidebar */}
        {isMobile ? (
          <Drawer
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            direction="right"
          >
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="w-[85vw] max-w-sm">
              {sidebarContent}
            </DrawerContent>
          </Drawer>
        ) : (
          <div className="lg:col-span-1 relative">
            <div className="relative border-l bg-background flex flex-col self-start size-full overflow-hidden">
              {sidebarContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
