"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { CalendarView } from "@/types/calendar";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";

interface CalendarHeaderToolbarProps {
  currentDate: Date;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  onCreateJob?: () => void;
}

export function CalendarHeaderToolbar({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onCreateJob,
}: CalendarHeaderToolbarProps) {
  const getTitle = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'MMM d, yyyy');
      case 'week': {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'list':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMM d, yyyy');
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button variant="outline" size="sm" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </ButtonGroup>
        <h2 className="text-lg font-semibold ml-4">{getTitle()}</h2>
        <span className="text-xs text-muted-foreground ml-2">
          ({new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || 'Local'})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('day')}
          >
            Day
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Month
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('list')}
          >
            List
          </Button>
        </ButtonGroup>
        {onCreateJob && (
          <Button size="sm" onClick={onCreateJob} className="ml-2">
            <Plus className="h-4 w-4 mr-1" />
            Add Job
          </Button>
        )}
      </div>
    </div>
  );
}

