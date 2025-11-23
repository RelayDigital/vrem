"use client";

import { useMemo } from "react";
import { CalendarEvent } from "@/types/calendar";
import { Photographer } from "@/types";
import { TechnicianColor } from "@/types/calendar";
import { CalendarEventPopover } from "./CalendarEventPopover";
import { Badge } from "@/components/ui/badge";
import { formatTimeRange } from "@/lib/calendar-utils";
import { format, parseISO, isSameDay } from "date-fns";
import { getWeekRange } from "@/lib/calendar-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { P } from "@/components/ui/typography";

interface ListViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  technicians: Photographer[];
  technicianColors: TechnicianColor[];
  onEventClick: (event: CalendarEvent) => void;
}

export function ListView({
  currentDate,
  events,
  technicians,
  technicianColors,
  onEventClick,
}: ListViewProps) {
  // Get date range based on current view context (week range for list view)
  const weekRange = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    // Get all days in the range
    const days: Date[] = [];
    const current = new Date(weekRange.start);
    while (current <= weekRange.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    days.forEach((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter((event) => {
        const eventStart = parseISO(event.start);
        const eventEnd = parseISO(event.end);
        return (
          isSameDay(eventStart, day) ||
          isSameDay(eventEnd, day) ||
          (eventStart <= day && eventEnd >= day)
        );
      });

      if (dayEvents.length > 0) {
        // Sort by start time
        dayEvents.sort((a, b) => {
          const timeA = parseISO(a.start).getTime();
          const timeB = parseISO(b.start).getTime();
          return timeA - timeB;
        });
        groups[dayKey] = dayEvents;
      }
    });

    return groups;
  }, [events, weekRange]);

  const getTechnician = (technicianId?: string) => {
    if (!technicianId) return undefined;
    return technicians.find((t) => t.id === technicianId);
  };

  const getTechnicianColor = (technicianId?: string) => {
    if (!technicianId) return undefined;
    return technicianColors.find((tc) => tc.technicianId === technicianId)?.color;
  };

  const sortedDayKeys = Object.keys(groupedEvents).sort();

  return (
    <ScrollArea className="flex-1 relative">
      <div className="p-4 space-y-6 absolute w-full">
        {sortedDayKeys.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No events in this period
          </div>
        ) : (
          sortedDayKeys.map((dayKey) => {
            const dayEvents = groupedEvents[dayKey];
            const day = parseISO(dayKey);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={dayKey} className="space-y-2">
                <div
                  className={cn(
                    "sticky top-0 bg-background z-10 py-2 border-b",
                    isToday && "text-primary font-semibold"
                  )}
                >
                  <h3 className="text-lg font-semibold">
                    {format(day, 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>

                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const technician = getTechnician(event.technicianId);
                    const technicianColor = getTechnicianColor(event.technicianId);

                    return (
                      <CalendarEventPopover
                        key={event.id}
                        event={event}
                        technician={technician}
                        technicianColor={technicianColor}
                        onOpenJob={() => event.jobId && onEventClick(event)}
                        onAssignTechnician={() => event.jobId && onEventClick(event)}
                      >
                        <div
                          className={cn(
                            "p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            event.hasConflict && "border-red-500 border-dashed"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{event.title}</h4>
                                {technicianColor && (
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: technicianColor }}
                                  />
                                )}
                              </div>
                              {event.orderNumber && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  Order #{event.orderNumber}
                                </div>
                              )}
                              {event.description && (
                                <P className="text-sm text-muted-foreground">
                                  {event.description}
                                </P>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {!event.allDay && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatTimeRange(event.start, event.end, true)}</span>
                                  </div>
                                )}
                                {event.territory && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.territory}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {technician && (
                                <Badge variant="secondary" className="text-xs">
                                  {technician.name}
                                </Badge>
                              )}
                              <Badge
                                variant={event.type === 'External' ? 'outline' : 'default'}
                                className="text-xs"
                              >
                                {event.type}
                              </Badge>
                              {event.hasConflict && (
                                <Badge variant="destructive" className="text-xs">
                                  Conflict
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CalendarEventPopover>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}

