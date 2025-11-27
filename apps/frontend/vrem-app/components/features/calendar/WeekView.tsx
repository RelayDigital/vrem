"use client";

import { useMemo } from "react";
import { CalendarEvent } from "@/types/calendar";
import { Photographer } from "@/types";
import { TechnicianColor } from "@/types/calendar";
import { CalendarEventCard } from "./CalendarEventCard";
import { CalendarEventPopover } from "./CalendarEventPopover";
import { parseISO } from "date-fns";
import { getWeekRange, getEventsForDay } from "@/lib/calendar-utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/components/ui/utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  technicians: Photographer[];
  technicianColors: TechnicianColor[];
  onEventClick: (event: CalendarEvent) => void;
  onEventDrag?: (eventId: string, newDate: Date, newTime?: string) => void;
}

export function WeekView({
  currentDate,
  events,
  technicians,
  technicianColors,
  onEventClick,
  onEventDrag,
}: WeekViewProps) {
  const weekRange = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(weekRange.start);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekRange]);

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
      const timeA = parseISO(a.start).getTime();
      const timeB = parseISO(b.start).getTime();
      return timeA - timeB;
    });
  };

  return (
    <ScrollArea className="flex-1 relative">
      <div className="absolute w-full">
        {/* Mobile: Horizontal scrollable wrapper */}
        <div className="flex-1 flex flex-col overflow-x-auto md:overflow-x-visible">
          {/* Container that holds both headers and grid, scrolls together */}
          <div className="min-w-[1200px] md:min-w-0 flex flex-col h-full">
            {/* Week Day Headers */}
            <div className="sticky top-0 z-10 grid grid-cols-7 border-b bg-muted shrink-0">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 text-center border-r last:border-r-0",
                    format(day, "yyyy-MM-dd") ===
                      format(new Date(), "yyyy-MM-dd") && "bg-primary/10"
                  )}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(day, "EEE")}
                  </div>
                  <div className="text-sm font-semibold">
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7 min-h-screen">
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDaySorted(day);

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "border-r last:border-r-0 p-2 space-y-2",
                        format(day, "yyyy-MM-dd") ===
                          format(new Date(), "yyyy-MM-dd") && "bg-primary/5"
                      )}
                    >
                      {dayEvents.map((event) => {
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
                              onOpenJob={() =>
                                event.jobId && onEventClick(event)
                              }
                              onAssignTechnician={() =>
                                event.jobId && onEventClick(event)
                              }
                            >
                              <div>
                                <CalendarEventCard
                                  event={event}
                                  technician={technician}
                                  technicianColor={technicianColor}
                                  onClick={() => onEventClick(event)}
                                />
                              </div>
                            </CalendarEventPopover>
                          );
                        }

                        return (
                          <CalendarEventCard
                            key={event.id}
                            event={event}
                            technician={technician}
                            technicianColor={technicianColor}
                            onClick={() => onEventClick(event)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
