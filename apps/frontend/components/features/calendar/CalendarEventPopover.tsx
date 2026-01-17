"use client";

import { CalendarEvent } from "@/types/calendar";
import { Technician } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimeRange } from "@/lib/calendar-utils";
import { Clock, MapPin, User, ExternalLink } from "lucide-react";
import { ReactNode } from "react";
import { P } from "@/components/ui/typography";

interface CalendarEventPopoverProps {
  event: CalendarEvent;
  technician?: Technician;
  technicianColor?: string;
  children: ReactNode;
  onOpenJob?: () => void;
  onAssignTechnician?: () => void;
}

export function CalendarEventPopover({
  event,
  technician,
  technicianColor,
  children,
  onOpenJob,
  onAssignTechnician,
}: CalendarEventPopoverProps) {
  const isUnscheduled = event.type === 'Unscheduled';
  const isExternal = event.type === 'External';

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">{event.title}</h4>
            {event.orderNumber && (
              <P className="text-xs text-muted-foreground font-mono mt-1">
                Order #{event.orderNumber}
              </P>
            )}
            {event.description && (
              <P className="text-xs text-muted-foreground mt-1">
                {event.description}
              </P>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {!event.allDay && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTimeRange(event.start, event.end, true)}</span>
              </div>
            )}
            {technician && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{technician.name}</span>
                {technicianColor && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: technicianColor }}
                  />
                )}
              </div>
            )}
            {event.territory && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.territory}</span>
              </div>
            )}
            {isExternal && event.externalSource && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <span>{event.externalSource}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Badge variant={event.type === 'External' ? 'outline' : 'default'}>
              {event.type}
            </Badge>
            {event.hasConflict && (
              <Badge variant="destructive">Conflict</Badge>
            )}
          </div>

          {!isExternal && (
            <div className="flex gap-2 pt-2 border-t">
              {isUnscheduled && onAssignTechnician && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAssignTechnician}
                  className="flex-1"
                >
                  Assign Technician
                </Button>
              )}
              {onOpenJob && (
                <Button
                  size="sm"
                  onClick={onOpenJob}
                  className={isUnscheduled && onAssignTechnician ? "flex-1" : "w-full"}
                >
                  Open Job
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

