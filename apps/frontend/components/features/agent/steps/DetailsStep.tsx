import { useState } from "react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";
import { Checkbox } from "../../../ui/checkbox";
import { Calendar as CalendarComponent } from "../../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Badge } from "../../../ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { H2, Small, Muted, Large } from "../../../ui/typography";
import {
  Calendar as CalendarIcon,
  Clock,
  Camera,
  Video,
  Plane,
  Sunset,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Home,
  Package,
  Sparkles,
} from "lucide-react";
import { JobDetails, ServicePackage } from "../../../../types";
import { mediaTypeOptions, toggleMediaType } from '../../../shared/jobs/utils';
import { ToggleGroup, ToggleGroupItem } from "../../../ui/toggle-group";
import type { AddOnWithQuantity } from './PackageSelectionStep';
import { AvailabilityTimeSlots } from './AvailabilityTimeSlots';
import { BorderBeam } from '@/components/ui/border-beam';

interface DetailsStepProps {
  selectedAddress: string;
  jobDetails: JobDetails;
  onJobDetailsChange: (details: JobDetails) => void;
  onBack: () => void;
  onNext: () => void;
  // Optional: provider name when in agent flow
  selectedProviderName?: string;
  // Package selection (agent flow)
  selectedPackage?: ServicePackage | null;
  selectedAddOns?: AddOnWithQuantity[];
  totalPrice?: number;
  // Optional: technician ID for availability checking
  technicianId?: string;
  // Optional: duration in minutes for slot generation
  estimatedDuration?: number;
  // Scheduling mode: 'scheduled' (specific time) or 'requested' (let provider choose)
  schedulingMode?: 'scheduled' | 'requested';
  onSchedulingModeChange?: (mode: 'scheduled' | 'requested') => void;
}

function formatPrice(cents: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function DetailsStep({
  selectedAddress,
  jobDetails,
  onJobDetailsChange,
  onBack,
  onNext,
  selectedProviderName,
  selectedPackage,
  selectedAddOns = [],
  totalPrice = 0,
  technicianId,
  estimatedDuration = 60,
  schedulingMode = 'scheduled',
  onSchedulingModeChange,
}: DetailsStepProps) {
  // Determine if we're in agent flow (provider already selected with package)
  const isAgentFlow = !!selectedProviderName;
  const hasPackageSelected = !!selectedPackage;

  // Track whether to show manual time picker or availability slots
  const showAvailabilitySlots = !!technicianId;

  // Track internal scheduling mode if parent doesn't control it
  const [internalMode, setInternalMode] = useState<'scheduled' | 'requested'>(schedulingMode);
  const effectiveMode = onSchedulingModeChange ? schedulingMode : internalMode;
  const handleModeChange = (mode: 'scheduled' | 'requested') => {
    if (onSchedulingModeChange) {
      onSchedulingModeChange(mode);
    } else {
      setInternalMode(mode);
    }
    // Clear date/time if switching to requested
    if (mode === 'requested') {
      onJobDetailsChange({
        ...jobDetails,
        scheduledDate: '',
        scheduledTime: '',
      });
    }
  };

  // Parse the selected date from jobDetails for the availability component
  const selectedDate = jobDetails.scheduledDate
    ? (() => {
        try {
          const date = new Date(jobDetails.scheduledDate + "T00:00:00");
          return !isNaN(date.getTime()) ? date : null;
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <motion.div
      key="details"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="container mx-auto p-6 h-full"
    >
      <div
        className="container mx-auto space-y-6"
        style={{ maxWidth: "896px", marginLeft: "auto", marginRight: "auto" }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {isAgentFlow && (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Provider</span>
              <ArrowRight className="h-4 w-4 mx-1" />
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Package</span>
              <ArrowRight className="h-4 w-4 mx-1" />
            </>
          )}
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Address</span>
          <ArrowRight className="h-4 w-4 mx-1" />
          <span className="text-primary font-medium">Schedule</span>
          <ArrowRight className="h-4 w-4 mx-1" />
          <span className="text-muted-foreground/60">
            {isAgentFlow ? 'Confirm' : 'Find technician'}
          </span>
        </div>

        {/* Selected Address */}
        <div className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Home className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground/80 mb-1">
                  Property Location
                </div>
                <div className="text-lg text-foreground">{selectedAddress}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              Change
            </Button>
          </div>
        </div>

        {/* Job Details Form */}
        <div className="bg-card rounded-2xl border-2 border-border p-8 shadow-sm space-y-6">
          <H2 className="text-2xl border-0">
            {hasPackageSelected ? "Schedule your shoot" : "Tell us about the shoot"}
          </H2>

          {/* Scheduling Mode Toggle - Only show in agent flow */}
          {isAgentFlow && (
            <div className="space-y-3">
              <Label className="text-sm">How would you like to schedule?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModeChange('scheduled')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    effectiveMode === 'scheduled'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${effectiveMode === 'scheduled' ? 'bg-primary' : 'bg-muted'}`}>
                    <CalendarIcon className={`h-5 w-5 ${effectiveMode === 'scheduled' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Pick a specific time</div>
                    <div className="text-sm text-muted-foreground">Choose your preferred date and time</div>
                  </div>
                  {effectiveMode === 'scheduled' && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('requested')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    effectiveMode === 'requested'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${effectiveMode === 'requested' ? 'bg-primary' : 'bg-muted'}`}>
                    <Clock className={`h-5 w-5 ${effectiveMode === 'requested' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Request scheduling</div>
                    <div className="text-sm text-muted-foreground">Let the provider contact you to schedule</div>
                  </div>
                  {effectiveMode === 'requested' && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Shoot Date and Time - Only show when picking specific time */}
          {effectiveMode === 'scheduled' && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Shoot Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative w-full justify-start text-left font-normal h-12 pl-11"
                  >
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                    {jobDetails.scheduledDate ? (
                      (() => {
                        try {
                          const date = new Date(
                            jobDetails.scheduledDate + "T00:00:00"
                          );
                          if (!isNaN(date.getTime())) {
                            return format(date, "PPP");
                          }
                        } catch (e) {
                          // Fallback to original value if parsing fails
                        }
                        return jobDetails.scheduledDate;
                      })()
                    ) : (
                      <span className="text-muted-foreground">Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={
                      jobDetails.scheduledDate
                        ? (() => {
                            try {
                              const date = new Date(
                                jobDetails.scheduledDate + "T00:00:00"
                              );
                              return !isNaN(date.getTime()) ? date : undefined;
                            } catch {
                              return undefined;
                            }
                          })()
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        onJobDetailsChange({
                          ...jobDetails,
                          scheduledDate: format(date, "yyyy-MM-dd"),
                        });
                      }
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative w-full justify-start text-left font-normal h-12 pl-11"
                  >
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                    {jobDetails.scheduledTime ? (
                      (() => {
                        try {
                          const [hours, minutes] =
                            jobDetails.scheduledTime.split(":");
                          const hour24 = parseInt(hours, 10);
                          const hour12 =
                            hour24 === 0
                              ? 12
                              : hour24 > 12
                              ? hour24 - 12
                              : hour24;
                          const ampm = hour24 >= 12 ? "PM" : "AM";
                          return `${hour12}:${minutes} ${ampm}`;
                        } catch {
                          return jobDetails.scheduledTime;
                        }
                      })()
                    ) : (
                      <span className="text-muted-foreground">Pick a time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={
                          jobDetails.scheduledTime
                            ? (() => {
                                const [hours] =
                                  jobDetails.scheduledTime.split(":");
                                const hour24 = parseInt(hours, 10);
                                const hour12 =
                                  hour24 === 0
                                    ? 12
                                    : hour24 > 12
                                    ? hour24 - 12
                                    : hour24;
                                return hour12.toString();
                              })()
                            : "9"
                        }
                        onValueChange={(hour12) => {
                          const currentMinute = jobDetails.scheduledTime
                            ? jobDetails.scheduledTime.split(":")[1] || "00"
                            : "00";
                          const currentHour24 = jobDetails.scheduledTime
                            ? parseInt(
                                jobDetails.scheduledTime.split(":")[0],
                                10
                              )
                            : 9;
                          const isPM = currentHour24 >= 12;
                          const hour24 =
                            hour12 === "12"
                              ? isPM
                                ? 12
                                : 0
                              : isPM
                              ? parseInt(hour12, 10) + 12
                              : parseInt(hour12, 10);
                          onJobDetailsChange({
                            ...jobDetails,
                            scheduledTime: `${hour24
                              .toString()
                              .padStart(2, "0")}:${currentMinute}`,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Hour" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={
                          jobDetails.scheduledTime
                            ? jobDetails.scheduledTime.split(":")[1] || "00"
                            : "00"
                        }
                        onValueChange={(minute) => {
                          const currentHour24 = jobDetails.scheduledTime
                            ? parseInt(
                                jobDetails.scheduledTime.split(":")[0],
                                10
                              )
                            : 9;
                          onJobDetailsChange({
                            ...jobDetails,
                            scheduledTime: `${currentHour24
                              .toString()
                              .padStart(2, "0")}:${minute.padStart(2, "0")}`,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Minute" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((min) => (
                            <SelectItem
                              key={min}
                              value={min.toString().padStart(2, "0")}
                            >
                              {min.toString().padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={
                          jobDetails.scheduledTime
                            ? (() => {
                                const [hours] =
                                  jobDetails.scheduledTime.split(":");
                                const hour24 = parseInt(hours, 10);
                                return hour24 >= 12 ? "PM" : "AM";
                              })()
                            : "AM"
                        }
                        onValueChange={(ampm) => {
                          const currentMinute = jobDetails.scheduledTime
                            ? jobDetails.scheduledTime.split(":")[1] || "00"
                            : "00";
                          const currentHour24 = jobDetails.scheduledTime
                            ? parseInt(
                                jobDetails.scheduledTime.split(":")[0],
                                10
                              )
                            : 9;
                          const currentHour12 =
                            currentHour24 === 0
                              ? 12
                              : currentHour24 > 12
                              ? currentHour24 - 12
                              : currentHour24;
                          const newHour24 =
                            ampm === "PM"
                              ? currentHour12 === 12
                                ? 12
                                : currentHour12 + 12
                              : currentHour12 === 12
                              ? 0
                              : currentHour12;
                          onJobDetailsChange({
                            ...jobDetails,
                            scheduledTime: `${newHour24
                              .toString()
                              .padStart(2, "0")}:${currentMinute}`,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="AM/PM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Availability Time Slots - shown when technicianId is provided */}
          {showAvailabilitySlots && (
            <div className="space-y-2">
              <Label>Available Times</Label>
              <AvailabilityTimeSlots
                selectedDate={selectedDate}
                selectedTime={jobDetails.scheduledTime}
                onTimeSelect={(time) =>
                  onJobDetailsChange({
                    ...jobDetails,
                    scheduledTime: time,
                  })
                }
                technicianId={technicianId}
                durationMins={estimatedDuration}
              />
            </div>
          )}
          </>
          )}

          {/* Requested Scheduling Info */}
          {effectiveMode === 'requested' && isAgentFlow && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="font-medium">Scheduling to be arranged</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {selectedProviderName} will contact you to schedule the shoot at a mutually convenient time.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Package Summary (Agent Flow) or Media Types (Provider Flow) */}
          {hasPackageSelected ? (
            <div className="space-y-3">
              <Label className="text-sm">Selected Package</Label>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{selectedPackage.name}</div>
                      {selectedPackage.description && (
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {selectedPackage.description}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedPackage.mediaTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatPrice(selectedPackage.price, selectedPackage.currency)}
                    </div>
                  </div>
                </div>

                {selectedAddOns.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span>Add-ons included:</span>
                    </div>
                    {selectedAddOns.map(({ addOn, quantity }) => (
                      <div key={addOn.id} className="flex justify-between text-sm pl-6">
                        <span>
                          {addOn.name}
                          {quantity > 1 && (
                            <span className="text-muted-foreground ml-1">× {quantity}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          +{formatPrice(addOn.price * quantity, addOn.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(totalPrice, selectedPackage.currency)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm">What media do you need? *</Label>
              <ToggleGroup
                type="multiple"
                value={jobDetails.mediaTypes}
                onValueChange={(value) => {
                  onJobDetailsChange({
                    ...jobDetails,
                    mediaTypes: value,
                  });
                }}
                className="grid grid-cols-2 gap-3 w-full"
              >
                {mediaTypeOptions.map((type) => {
                  const Icon = type.icon;
                  return (
                    <ToggleGroupItem
                      key={type.id}
                      value={type.id}
                      className="flex items-center gap-3 p-4 h-auto data-[state=on]:bg-accent data-[state=on]:border-primary"
                    >
                      <div className="p-2.5 rounded-lg bg-primary">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{type.label}</div>
                      </div>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="requirements">
              Special Instructions (Optional)
            </Label>
            <Textarea
              id="requirements"
              value={jobDetails.requirements}
              onChange={(e) =>
                onJobDetailsChange({
                  ...jobDetails,
                  requirements: e.target.value,
                })
              }
              placeholder="Any special requests, access codes, or details..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Next Button */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="relative flex-1">
              <Button onClick={onNext} className="w-full bg-primary">
                {isAgentFlow ? 'Review Order' : 'Find Technician'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <BorderBeam size={40} duration={3} borderWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
