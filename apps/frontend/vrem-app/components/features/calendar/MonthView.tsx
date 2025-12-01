"use client";

import { useMemo } from "react";
import { CalendarEvent } from "@/types/calendar";
import { Technician } from "@/types";
import { TechnicianColor } from "@/types/calendar";
import { CalendarEventPill } from "./CalendarEventPill";
import { CalendarEventPopover } from "./CalendarEventPopover";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { getEventsForDay } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  technicians: Technician[];
  technicianColors: TechnicianColor[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  compact?: boolean;
}

const MAX_VISIBLE_EVENTS = 3;

export function MonthView({
  currentDate,
  events,
  technicians,
  technicianColors,
  onEventClick,
  onDayClick,
  compact = false,
}: MonthViewProps) {
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const calendarStart = useMemo(
    () => startOfWeek(monthStart, { weekStartsOn: 0 }),
    [monthStart]
  );
  const calendarEnd = useMemo(
    () => endOfWeek(monthEnd, { weekStartsOn: 0 }),
    [monthEnd]
  );

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  const getTechnician = (technicianId?: string) => {
    if (!technicianId) return undefined;
    return technicians.find((t) => t.id === technicianId);
  };

  const getTechnicianColor = (technicianId?: string) => {
    if (!technicianId) return undefined;
    return technicianColors.find((tc) => tc.technicianId === technicianId)
      ?.color;
  };

  const getEventsForDaySorted = (day: Date) => {
    const dayEvents = getEventsForDay(events, day);
    return dayEvents.sort((a, b) => {
      const timeA = new Date(a.start).getTime();
      const timeB = new Date(b.start).getTime();
      return timeA - timeB;
    });
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("flex-1 flex flex-col", compact ? "h-auto" : "h-full overflow-hidden")}>
      {/* Week Day Headers */}
      <div className={cn("grid grid-cols-7 border-b bg-muted/30", compact && "text-xs")}>
        {weekDays.map((day) => (
          <div
            key={day}
            className={cn(
              "text-center font-semibold border-r last:border-r-0",
              compact ? "p-1 text-xs" : "p-2 text-sm"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={cn("grid grid-cols-7", compact ? "" : "flex-1 auto-rows-fr")}>
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDaySorted(day);
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const remainingCount = dayEvents.length - MAX_VISIBLE_EVENTS;
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isLastDayOfWeek = index % 7 === 6; // Last column (7th day, 0-indexed)

          return (
            <div
              key={index}
              className={cn(
                "border-b flex flex-col",
                !isLastDayOfWeek && "border-r",
                !isCurrentMonth && "bg-muted/20",
                isToday && "bg-primary/10 ring-2 ring-primary ring-inset",
                compact ? "p-1 min-h-[60px]" : "p-2 min-h-[120px]"
              )}
            >
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "p-0 font-semibold mb-1 self-start",
                  compact ? "h-5 w-5 text-xs" : "h-6 w-6",
                  isToday && "bg-primary text-primary-foreground"
                )}
                onClick={() => onDayClick(day)}
              >
                {format(day, "d")}
              </Button>

              <div className={cn("flex-1 space-y-0.5 overflow-hidden", compact && "space-y-0")}>
                {visibleEvents.map((event) => {
                  const technician = getTechnician(event.technicianId);
                  const technicianColor = getTechnicianColor(
                    event.technicianId
                  );

                  if (
                    event.type === "External" ||
                    event.type === "Unscheduled"
                  ) {
                    return (
                      <CalendarEventPopover
                        key={event.id}
                        event={event}
                        technician={technician}
                        technicianColor={technicianColor}
                        onOpenJob={() => event.jobId && onEventClick(event)}
                        onAssignTechnician={() =>
                          event.jobId && onEventClick(event)
                        }
                      >
                        <div>
                          <CalendarEventPill
                            event={event}
                            technicianColor={technicianColor}
                            onClick={() => onEventClick(event)}
                            className={compact ? "text-[10px] px-1 py-0.5" : undefined}
                          />
                        </div>
                      </CalendarEventPopover>
                    );
                  }

                  return (
                    <CalendarEventPill
                      key={event.id}
                      event={event}
                      technicianColor={technicianColor}
                      onClick={() => onEventClick(event)}
                      className={compact ? "text-[10px] px-1 py-0.5" : undefined}
                    />
                  );
                })}

                {remainingCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      compact ? "h-4 text-[10px]" : "h-6 text-xs"
                    )}
                    onClick={() => onDayClick(day)}
                  >
                    +{remainingCount} more
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
