"use client";

import { useState, useMemo, useEffect } from "react";
import { JobRequest, Technician } from "@/types";
import { USE_MOCK_DATA } from "@/lib/utils";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface CalendarViewProps {
  canSeeTechnicians?: boolean;
  jobs?: JobRequest[];
  technicians?: Technician[];
  techniciansLoading?: boolean;
  onJobClick?: (job: JobRequest) => void;
  onCreateJob?: (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => void;
}

export function CalendarView({
  canSeeTechnicians = false,
  jobs = [],
  technicians = [],
  techniciansLoading = false,
  onJobClick,
  onCreateJob,
}: CalendarViewProps) {
  const baseTechnicians = technicians || [];
  const effectiveTechnicians = canSeeTechnicians ? baseTechnicians : [];
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

  // Generate technician colors
  const technicianColors = useMemo(
    () => generateTechnicianColors(effectiveTechnicians),
    [effectiveTechnicians]
  );

  // Convert jobs to calendar events
  const allEvents = useMemo(() => {
    const jobEvents: CalendarEvent[] = jobs.map((job) =>
      jobToCalendarEvent(job)
    );

    return jobEvents;
  }, [jobs]);

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

  // Detect conflicts (overlapping events for the same technician/technician)
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
      technicians: effectiveTechnicians,
      technicianColors,
      onEventClick: handleEventClick,
    };

    switch (view) {
      case "day":
        return <DayView {...commonProps} onCreateJob={onCreateJob} canSeeTechnicians={canSeeTechnicians} />;
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
      canSeeTechnicians={canSeeTechnicians}
      currentDate={currentDate}
      view={view}
      onDateSelect={(date) => {
        setCurrentDate(date);
        if (useIsMobile()) {
          setSidebarOpen(false);
        }
      }}
      filters={filters}
      onFiltersChange={setFilters}
      technicians={effectiveTechnicians}
      techniciansLoading={techniciansLoading}
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

      <div className="grid grid-cols-1 lg:grid-cols-5 min-[2560px]:grid-cols-7! overflow-hidden relative h-full">
        {/* Main Calendar Area */}
        <div className="col-span-1 md:col-span-4 min-[2560px]:col-span-6! overflow-auto">{renderView()}</div>

        {/* Right Sidebar */}
        {useIsMobile() ? (
          <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="fixed bottom-[calc(var(--dock-h)+0.5rem)] right-2 z-50 rounded-full size-12 p-0"
              >
                <Filter className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="sr-only">
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-scroll size-full">{sidebarContent}</div>
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
