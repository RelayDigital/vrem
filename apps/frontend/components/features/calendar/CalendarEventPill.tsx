"use client";

import { CalendarEvent } from "@/types/calendar";
import { cn } from "@/components/ui/utils";

interface CalendarEventPillProps {
  event: CalendarEvent;
  technicianColor?: string;
  onClick?: () => void;
  className?: string;
}

export function CalendarEventPill({
  event,
  technicianColor,
  onClick,
  className,
}: CalendarEventPillProps) {
  const color = technicianColor || (event.type === 'External' ? '#8b5cf6' : '#6b7280');

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity truncate",
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{event.title}</span>
    </div>
  );
}

