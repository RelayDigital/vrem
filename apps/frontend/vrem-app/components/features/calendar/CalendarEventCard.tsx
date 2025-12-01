"use client";

import { CalendarEvent } from "@/types/calendar";
import { Technician } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatTimeRange } from "@/lib/calendar-utils";
import { cn } from "@/components/ui/utils";
import { Clock, MapPin } from "lucide-react";

interface CalendarEventCardProps {
  event: CalendarEvent;
  technician?: Technician;
  technicianColor?: string;
  onClick?: () => void;
  className?: string;
}

export function CalendarEventCard({
  event,
  technician,
  technicianColor,
  onClick,
  className,
}: CalendarEventCardProps) {
  const borderColor = technicianColor || (event.type === 'External' ? '#8b5cf6' : undefined);
  const bgColor = borderColor ? `${borderColor}15` : undefined;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md flex flex-col bg-muted/80!",
        event.hasConflict && "border-red-500 border-dashed",
        className
      )}
      style={{
        borderColor: borderColor,
        backgroundColor: bgColor,
      }}
    >
      <div className="space-y-1.5">
        <div className="font-medium text-sm">{event.title}</div>
        {event.orderNumber && (
          <div className="text-xs text-muted-foreground font-mono">
            Order #{event.orderNumber}
          </div>
        )}
        {event.start && event.end && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimeRange(event.start, event.end, true)}</span>
          </div>
        )}
        {event.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {event.description}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
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
          {event.territory && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {event.territory}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

