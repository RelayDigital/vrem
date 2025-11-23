"use client";

import { useMemo } from "react";
import { CalendarEvent } from "@/types/calendar";
import { Photographer } from "@/types";
import { TechnicianColor } from "@/types/calendar";
import { CalendarEventCard } from "./CalendarEventCard";
import { CalendarEventPopover } from "./CalendarEventPopover";
import { parseISO, format } from "date-fns";
import { getEventsForDay } from "@/lib/calendar-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/components/ui/utils";
import { Wifi, WifiOff } from "lucide-react";
import { eventsOverlap } from "@/lib/calendar-utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  technicians: Photographer[];
  technicianColors: TechnicianColor[];
  onEventClick: (event: CalendarEvent) => void;
  onEventDrag?: (eventId: string, newDate: Date, newTime?: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 to 23:00 (24 hours)

export function DayView({
  currentDate,
  events,
  technicians,
  technicianColors,
  onEventClick,
  onEventDrag,
}: DayViewProps) {
  const dayEvents = useMemo(
    () => getEventsForDay(events, currentDate),
    [events, currentDate]
  );

  // Get unique technicians from events or all technicians
  const activeTechnicians = useMemo(() => {
    const technicianIds = new Set(
      dayEvents.map((e) => e.technicianId).filter((id): id is string => !!id)
    );

    if (technicianIds.size === 0) {
      return technicians.slice(0, 5); // Show first 5 if no events
    }

    return technicians.filter((t) => technicianIds.has(t.id));
  }, [dayEvents, technicians]);

  const getTechnician = (technicianId?: string) => {
    if (!technicianId) return undefined;
    return technicians.find((t) => t.id === technicianId);
  };

  const getTechnicianColor = (technicianId?: string) => {
    if (!technicianId) return undefined;
    return technicianColors.find((tc) => tc.technicianId === technicianId)
      ?.color;
  };

  const getEventsForTechnician = (technicianId: string) => {
    return dayEvents.filter((e) => e.technicianId === technicianId);
  };

  // Calculate grid row position and span for an event
  const getEventGridPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);

    // Calculate minutes from midnight (start of day)
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    // Total timeline spans 24 hours = 1440 minutes
    // Each hour is 96px, so we have 24 * 96 = 2304px total
    // Convert to grid rows: each row represents 1 minute
    const totalMinutes = 24 * 60; // 1440 minutes
    const startRow =
      Math.floor((startMinutes / totalMinutes) * (HOURS.length * 96)) + 1; // +1 because grid rows start at 1
    const rowSpan = Math.max(
      Math.ceil((durationMinutes / totalMinutes) * (HOURS.length * 96)),
      1
    );

    return {
      gridRowStart: startRow,
      gridRowEnd: startRow + rowSpan,
    };
  };

  // Calculate col-span and col-start for an event based on overlapping events
  // Returns the technician's column index and the event's position within that column
  const getEventColumnPosition = (
    event: CalendarEvent,
    technicianId: string
  ) => {
    const technicianIndex = activeTechnicians.findIndex(
      (t) => t.id === technicianId
    );
    const technicianEvents = getEventsForTechnician(technicianId);

    // Find all events that overlap with this one
    const overlappingEvents = technicianEvents.filter((e) =>
      eventsOverlap(e, event)
    );

    // Sort overlapping events by start time (chronological order)
    const sortedOverlapping = [...overlappingEvents].sort(
      (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()
    );

    // Find the index of the current event in the sorted overlapping events
    const overlapIndex = sortedOverlapping.findIndex((e) => e.id === event.id);

    // Calculate column span and start within the technician's column
    // If no overlap (1 event), span full column (col-span = 1, which is the full technician column)
    // If overlap, each event gets equal share
    const numOverlapping = sortedOverlapping.length;
    const colSpan = numOverlapping === 1 ? 1 : 1 / numOverlapping; // Fraction of the technician's column
    const colStart = technicianIndex + 1 + overlapIndex * colSpan; // Start at technician's column + offset

    return {
      gridColumnStart: colStart,
      gridColumnEnd: colStart + colSpan,
    };
  };

  return (
    <div className="grid grid-cols-5 h-full">
      {/* Technician Labels */}
      <div className="col-span-1 border-r bg-muted shrink-0 h-full">
        <div className="h-12 border-b flex items-center px-4 font-semibold text-sm">
          Technician
        </div>
        {activeTechnicians.map((technician) => {
          const color = getTechnicianColor(technician.id);
          const isAvailable = technician.availability.some(
            (a) => a.date === format(currentDate, "yyyy-MM-dd") && a.available
          );

          return (
            <div
              key={technician.id}
              className="h-24 border-b p-3 flex items-center gap-3"
            >
              <div
                className="w-1 h-full rounded-full shrink-0"
                style={{ backgroundColor: color || "#6b7280" }}
              />
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={technician.avatar} />
                <AvatarFallback>
                  {technician.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {technician.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {technician.companyName || "Independent"}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {isAvailable ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Calendar Timeline */}
      <ScrollArea className="col-span-4 relative overflow-y-auto">
        <div className=" absolute flex w-full">
          {/* Hour Labels */}
          <div
            className="w-16 border-r bg-muted shrink-0"
            style={{ height: `${HOURS.length * 96}px` }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-24 border-b flex items-start justify-end pr-2 pt-1"
              >
                <span className="text-xs text-muted-foreground">
                  {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Grid Area */}
          <div className="flex-1 relative">
            <div
              className="absolute inset-0"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${activeTechnicians.length}, 1fr)`,
                gridTemplateRows: `repeat(${HOURS.length * 96}, 1px)`,
                height: `${HOURS.length * 96}px`,
              }}
            >
              {/* Hour Grid Lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="col-span-full border-b border-muted"
                  style={{
                    gridRowStart: hour * 96 + 1,
                    gridRowEnd: hour * 96 + 1,
                  }}
                />
              ))}

              {/* Technician Columns with nested grids for overlapping events */}
              {activeTechnicians.map((technician, technicianIndex) => {
                const technicianEvents = getEventsForTechnician(technician.id);
                const maxOverlapping = Math.max(
                  1,
                  ...technicianEvents.map((event) => {
                    const overlapping = technicianEvents.filter((e) =>
                      eventsOverlap(e, event)
                    );
                    return overlapping.length;
                  })
                );

                return (
                  <div
                    key={technician.id}
                    className="relative"
                    style={{
                      gridColumnStart: technicianIndex + 1,
                      gridColumnEnd: technicianIndex + 2,
                      gridRowStart: 1,
                      gridRowEnd: HOURS.length * 96 + 1,
                      display: "grid",
                      gridTemplateColumns: `repeat(${maxOverlapping}, 1fr)`,
                      gridTemplateRows: `repeat(${HOURS.length * 96}, 1px)`,
                    }}
                  >
                    {technicianEvents.map((event) => {
                      const gridPosition = getEventGridPosition(event);

                      // Find all events that overlap with this one
                      const overlappingEvents = technicianEvents.filter((e) =>
                        eventsOverlap(e, event)
                      );

                      // Sort overlapping events by start time (chronological order)
                      const sortedOverlapping = [...overlappingEvents].sort(
                        (a, b) =>
                          parseISO(a.start).getTime() -
                          parseISO(b.start).getTime()
                      );

                      // Find the index of the current event in the sorted overlapping events
                      const overlapIndex = sortedOverlapping.findIndex(
                        (e) => e.id === event.id
                      );

                      // Calculate column span and start within the technician's nested grid
                      const numOverlapping = sortedOverlapping.length;

                      // If no overlap (only this event), span full nested grid and start at column 1
                      // If overlap, each event gets equal share and later events are staggered
                      let colSpan: number;
                      let colStart: number;

                      if (numOverlapping === 1) {
                        // No overlap - span full width, start at column 1
                        colSpan = maxOverlapping;
                        colStart = 1;
                      } else {
                        // Overlap - share columns equally, stagger based on chronological order
                        colSpan = Math.floor(maxOverlapping / numOverlapping);
                        colStart = overlapIndex * colSpan + 1;
                      }

                      const technicianObj = getTechnician(event.technicianId);
                      const technicianColor = getTechnicianColor(
                        event.technicianId
                      );

                      return (
                        <div
                          key={event.id}
                          className="relative"
                          style={{
                            gridRowStart: gridPosition.gridRowStart,
                            gridRowEnd: gridPosition.gridRowEnd,
                            gridColumnStart: colStart,
                            gridColumnEnd: colStart + colSpan,
                            zIndex: event.hasConflict ? 30 : 20,
                          }}
                        >
                          {event.type === "External" ||
                          event.type === "Unscheduled" ? (
                            <CalendarEventPopover
                              event={event}
                              technician={technicianObj}
                              technicianColor={technicianColor}
                              onOpenJob={() =>
                                event.jobId && onEventClick(event)
                              }
                              onAssignTechnician={() =>
                                event.jobId && onEventClick(event)
                              }
                            >
                              <div className="h-full">
                                <CalendarEventCard
                                  event={event}
                                  technician={technicianObj}
                                  technicianColor={technicianColor}
                                  onClick={() => onEventClick(event)}
                                  className="text-xs h-full"
                                />
                              </div>
                            </CalendarEventPopover>
                          ) : (
                            <CalendarEventCard
                              event={event}
                              technician={technicianObj}
                              technicianColor={technicianColor}
                              onClick={() => onEventClick(event)}
                              className="text-xs h-full"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
