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
import { eventsOverlap, calculateEventLayout } from "@/lib/calendar-utils";

import { useState, useRef } from "react";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  technicians: Photographer[];
  technicianColors: TechnicianColor[];
  onEventClick: (event: CalendarEvent) => void;
  onEventDrag?: (eventId: string, newDate: Date, newTime?: string) => void;
  onCreateJob?: (initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  }) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0:00 to 23:00 (24 hours)

export function DayView({
  currentDate,
  events,
  technicians,
  technicianColors,
  onEventClick,
  onEventDrag,
  onCreateJob,
}: DayViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null); // Minutes from midnight
  const [dragEnd, setDragEnd] = useState<number | null>(null); // Minutes from midnight
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onCreateJob || !containerRef.current) return;

    // Prevent dragging if clicking on an event (event click handler will take precedence)
    if ((e.target as HTMLElement).closest('[data-event-card]')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const minutes = Math.floor(y / 1.6); // 1.6px per minute

    // Snap to nearest 15 minutes
    const snappedMinutes = Math.round(minutes / 15) * 15;

    setIsDragging(true);
    setDragStart(snappedMinutes);
    setDragEnd(snappedMinutes + 30); // Default 30 min duration initially
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStart === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const minutes = Math.floor(y / 1.6);

    // Snap to nearest 15 minutes
    const snappedMinutes = Math.round(minutes / 15) * 15;

    // Ensure end is after start
    if (snappedMinutes > dragStart) {
      setDragEnd(snappedMinutes);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStart === null || dragEnd === null) return;

    setIsDragging(false);

    if (onCreateJob) {
      const hours = Math.floor(dragStart / 60);
      const minutes = dragStart % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const duration = dragEnd - dragStart;

      // Only create if duration is at least 15 minutes
      if (duration >= 15) {
        onCreateJob({
          scheduledDate: format(currentDate, 'yyyy-MM-dd'),
          scheduledTime: timeString,
          estimatedDuration: duration,
        });
      }
    }

    setDragStart(null);
    setDragEnd(null);
  };
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 h-full">
      {/* Technician Labels */}
      <div className="col-span-1 border-r bg-muted shrink-0 h-full hidden md:block">
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
          <div
            className="flex-1 relative select-none"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute inset-0"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                height: `${HOURS.length * 96}px`,
              }}
            >
              {/* Hour Grid Lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="col-span-full border-b border-muted absolute w-full"
                  style={{
                    top: `${hour * 96}px`,
                  }}
                />
              ))}

              {/* Unified Timeline Area */}
              <div className="relative w-full h-full">
                {(() => {
                  const layoutMap = calculateEventLayout(dayEvents);

                  return dayEvents.map((event) => {
                    const layout = layoutMap.get(event.id);
                    if (!layout) return null;

                    const start = parseISO(event.start);
                    const end = parseISO(event.end);

                    // Calculate top position (minutes from midnight)
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

                    // 96px per hour = 1.6px per minute
                    const top = startMinutes * 1.6;
                    const height = Math.max(durationMinutes * 1.6, 24); // Minimum height

                    const technicianObj = getTechnician(event.technicianId);
                    const technicianColor = getTechnicianColor(event.technicianId);

                    return (
                      <div
                        key={event.id}
                        className="absolute px-1 py-1"
                        data-event-card
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `${layout.left}%`,
                          width: `${layout.width}%`,
                          zIndex: 20,
                        }}
                      >
                        {event.type === "External" ||
                          event.type === "Unscheduled" ? (
                          <CalendarEventPopover
                            event={event}
                            technician={technicianObj}
                            technicianColor={technicianColor}
                            onOpenJob={() => event.jobId && onEventClick(event)}
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
                  });
                })()}

                {/* Drag Selection Ghost */}
                {isDragging && dragStart !== null && dragEnd !== null && (
                  <div
                    className="absolute left-0 right-0 bg-primary/20 border-2 border-primary rounded z-50 pointer-events-none"
                    style={{
                      top: `${dragStart * 1.6}px`,
                      height: `${(dragEnd - dragStart) * 1.6}px`,
                    }}
                  >
                    <div className="text-xs font-medium text-primary p-1">
                      {Math.floor(dragStart / 60)}:{String(dragStart % 60).padStart(2, '0')} - {Math.floor(dragEnd / 60)}:{String(dragEnd % 60).padStart(2, '0')}
                      <span className="ml-1">({dragEnd - dragStart} min)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
