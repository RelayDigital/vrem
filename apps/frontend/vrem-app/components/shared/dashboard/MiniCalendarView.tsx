"use client";

import React, { useState, useMemo } from "react";
import { JobRequest, Photographer } from "../../../types";
import { Calendar } from "../../ui/calendar";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { format, parseISO, isSameDay, startOfDay, addDays } from "date-fns";
import { Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { jobToCalendarEvent, getEventsForDay } from "../../../lib/calendar-utils";
import { CalendarEvent } from "../../../types/calendar";
import { cn } from "../../../lib/utils";
import { H3, P } from "../../ui/typography";
import { DayButton } from "react-day-picker";

interface MiniCalendarViewProps {
  jobs: JobRequest[];
  photographers?: Photographer[];
  onDateClick?: (date: Date) => void;
  onJobClick?: (job: JobRequest) => void;
  onViewFullCalendar?: () => void;
}

export function MiniCalendarView({
  jobs,
  photographers = [],
  onDateClick,
  onJobClick,
  onViewFullCalendar,
}: MiniCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Convert jobs to calendar events
  const events = useMemo(() => {
    return jobs.map((job) => jobToCalendarEvent(job));
  }, [jobs]);

  // Get upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);
    
    return events
      .filter((event) => {
        const eventDate = parseISO(event.start);
        return eventDate >= today && eventDate <= nextWeek;
      })
      .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
      .slice(0, 5); // Show only top 5 upcoming events
  }, [events]);

  // Get job count for a specific day
  const getJobCountForDay = (date: Date): number => {
    return getEventsForDay(events, date).length;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      if (onDateClick) {
        onDateClick(date);
      }
    }
  };

  // Custom DayButton component to show job indicators
  const CustomDayButton = ({ day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) => {
    const jobCount = getJobCountForDay(day.date);
    const isToday = isSameDay(day.date, new Date());
    const isSelected = modifiers.selected;

    return (
      <Button
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString()}
        data-selected={isSelected}
        className={cn(
          "relative flex flex-col items-center justify-center aspect-square w-full min-w-(--cell-size) rounded-md hover:bg-accent transition-colors",
          isSelected && "bg-primary text-primary-foreground",
          isToday && !isSelected && "ring-2 ring-primary"
        )}
        {...props}
      >
        <span className={cn("text-sm", isSelected && "font-semibold")}>
          {format(day.date, "d")}
        </span>
        {jobCount > 0 && (
          <div
            className={cn(
              "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
              isSelected ? "bg-primary-foreground" : isToday ? "bg-primary" : "bg-muted-foreground"
            )}
          />
        )}
      </Button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-3">
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            components={{
              DayButton: CustomDayButton,
            }}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="pb-3">
          <H3 className="text-base font-semibold">Upcoming</H3>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length > 0 ? (
            <>
              {upcomingEvents.map((event) => {
                const eventDate = parseISO(event.start);
                const job = jobs.find((j) => j.id === event.jobId);
                const photographer = event.technicianId
                  ? photographers.find((p) => p.id === event.technicianId)
                  : undefined;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                      isSameDay(eventDate, selectedDate) && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      if (job && onJobClick) {
                        onJobClick(job);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <P className="text-xs font-medium text-muted-foreground">
                          {format(eventDate, "MMM d")}
                        </P>
                      </div>
                      {event.orderNumber && (
                        <Badge variant="outline" className="text-xs h-5">
                          #{event.orderNumber}
                        </Badge>
                      )}
                    </div>
                    <P className="text-sm font-medium line-clamp-1 mb-1">
                      {event.title}
                    </P>
                    {!event.allDay && (
                      <P className="text-xs text-muted-foreground">
                        {format(eventDate, "h:mm a")}
                      </P>
                    )}
                    {photographer && (
                      <P className="text-xs text-muted-foreground mt-1">
                        {photographer.name}
                      </P>
                    )}
                  </div>
                );
              })}
              {upcomingEvents.length >= 5 && (
                <Button
                  variant="flat"
                  size="sm"
                  className="w-full mt-2"
                  onClick={onViewFullCalendar}
                >
                  View all events
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <P className="text-sm text-muted-foreground">No upcoming events</P>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

