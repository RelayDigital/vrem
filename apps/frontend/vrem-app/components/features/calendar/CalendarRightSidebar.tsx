"use client";

import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CalendarFilters,
  TechnicianColor,
  CalendarView as ViewType,
} from "@/types/calendar";
import { Photographer } from "@/types";
import { format, startOfDay, isSameDay } from "date-fns";
import { cn } from "@/components/ui/utils";
import { getWeekRange, getMonthRange } from "@/lib/calendar-utils";
import { H3 } from "@/components/ui/typography";

interface CalendarRightSidebarProps {
  currentDate: Date;
  view: ViewType;
  onDateSelect: (date: Date) => void;
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  technicians: Photographer[];
  technicianColors: TechnicianColor[];
  territories: string[];
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
}

export function CalendarRightSidebar({
  currentDate,
  view,
  onDateSelect,
  filters,
  onFiltersChange,
  technicians,
  technicianColors,
  territories,
  timezone,
  onTimezoneChange,
}: CalendarRightSidebarProps) {
  const [showAllTechnicians, setShowAllTechnicians] = useState(true);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === "week") {
      return getWeekRange(currentDate);
    } else if (view === "month") {
      return getMonthRange(currentDate);
    } else if (view === "list") {
      // List view also uses week range
      return getWeekRange(currentDate);
    }
    // Day view - no range, just single date
    return null;
  }, [currentDate, view]);

  const handleEventTypeChange = (
    type: keyof CalendarFilters["eventTypes"],
    checked: boolean
  ) => {
    onFiltersChange({
      ...filters,
      eventTypes: {
        ...filters.eventTypes,
        [type]: checked,
      },
    });
  };

  const handleTechnicianChange = (technicianId: string, checked: boolean) => {
    if (checked) {
      onFiltersChange({
        ...filters,
        technicians: [...filters.technicians, technicianId],
      });
    } else {
      onFiltersChange({
        ...filters,
        technicians: filters.technicians.filter((id) => id !== technicianId),
      });
    }
  };

  const handleTerritoryChange = (territory: string, checked: boolean) => {
    if (checked) {
      onFiltersChange({
        ...filters,
        territories: [...filters.territories, territory],
      });
    } else {
      onFiltersChange({
        ...filters,
        territories: filters.territories.filter((t) => t !== territory),
      });
    }
  };

  const handleShowAllTechnicians = () => {
    if (showAllTechnicians) {
      onFiltersChange({
        ...filters,
        technicians: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        technicians: technicians.map((t) => t.id),
      });
    }
    setShowAllTechnicians(!showAllTechnicians);
  };

  const getTechnicianColor = (technicianId: string) => {
    return (
      technicianColors.find((tc) => tc.technicianId === technicianId)?.color ||
      "#6b7280"
    );
  };

  return (
    <div className="p-4 space-y-6 size-full">
      {/* Mini Month Calendar */}
      <div>
        <H3 className="mb-3 hidden md:block">Mini Calendar</H3>
        {dateRange ? (
          <Calendar
            mode="range"
            selected={{
              from: dateRange.start,
              to: dateRange.end,
            }}
            onSelect={(range) => {
              // Handle date selection in range mode
              // react-day-picker behavior:
              // - Clicking a date sets it as 'from' (new range start)
              // - Clicking another date after 'from' sets it as 'to' (range end)
              // - Clicking a date before current 'from' sets it as new 'from'
              // - Clicking a date after current 'to' extends the range

              if (!range) {
                // Range was cleared - don't do anything
                return;
              }

              // Determine which date was actually clicked
              // Priority: if 'from' changed, use it; otherwise if 'to' changed, use it
              // Use isSameDay for comparison to handle time differences
              let clickedDate: Date | undefined;

              if (range.from) {
                const fromChanged = !isSameDay(range.from, dateRange.start);
                if (fromChanged) {
                  clickedDate = range.from;
                }
              }

              // If 'from' didn't change, check if 'to' changed
              if (!clickedDate && range.to) {
                const toChanged = !isSameDay(range.to, dateRange.end);
                if (toChanged) {
                  clickedDate = range.to;
                }
              }

              // Fallback: if neither changed but we have a range, use 'from' as default
              // This handles the case where clicking the same date might still trigger onSelect
              if (!clickedDate && range.from) {
                clickedDate = range.from;
              }

              if (clickedDate) {
                // Navigate to the clicked date - this will trigger recalculation of the range
                onDateSelect(clickedDate);
              }
            }}
            className="rounded-md border w-full"
          />
        ) : (
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(date) => date && onDateSelect(date)}
            className="rounded-md border w-full"
          />
        )}
      </div>

      <Separator />

      {/* Timezone Selector */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Timezone</Label>
        <Select value={timezone} onValueChange={onTimezoneChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="America/Edmonton">Mountain Time (MT)</SelectItem>
            <SelectItem value="America/Los_Angeles">
              Pacific Time (PT)
            </SelectItem>
            <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
            <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
            <SelectItem value="UTC">UTC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Event Type Filters */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Event Types</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-scheduled"
              checked={filters.eventTypes.Scheduled}
              onCheckedChange={(checked) =>
                handleEventTypeChange("Scheduled", checked as boolean)
              }
            />
            <Label
              htmlFor="filter-scheduled"
              className="text-sm font-normal cursor-pointer"
            >
              Scheduled
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-unscheduled"
              checked={filters.eventTypes.Unscheduled}
              onCheckedChange={(checked) =>
                handleEventTypeChange("Unscheduled", checked as boolean)
              }
            />
            <Label
              htmlFor="filter-unscheduled"
              className="text-sm font-normal cursor-pointer"
            >
              Unscheduled
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-external"
              checked={filters.eventTypes.External}
              onCheckedChange={(checked) =>
                handleEventTypeChange("External", checked as boolean)
              }
            />
            <Label
              htmlFor="filter-external"
              className="text-sm font-normal cursor-pointer"
            >
              External
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Territory Filters */}
      {territories.length > 0 && (
        <>
          <div>
            <Label className="text-sm font-semibold mb-3 block">
              Territories
            </Label>
            <div className="space-y-2">
              {territories.map((territory) => (
                <div key={territory} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-territory-${territory}`}
                    checked={filters.territories.includes(territory)}
                    onCheckedChange={(checked) =>
                      handleTerritoryChange(territory, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`filter-territory-${territory}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {territory}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Technician Filters - hidden when there are no technicians (e.g. photographer view) */}
      {technicians.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Technicians</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowAllTechnicians}
              className="h-6 text-xs"
            >
              {showAllTechnicians ? "Hide All" : "Show All"}
            </Button>
          </div>
          <div className="space-y-2">
            {technicians.map((technician) => {
              const color = getTechnicianColor(technician.id);
              const isChecked = filters.technicians.includes(technician.id);

              return (
                <div key={technician.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-technician-${technician.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleTechnicianChange(technician.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`filter-technician-${technician.id}`}
                    className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-1"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{technician.name}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
