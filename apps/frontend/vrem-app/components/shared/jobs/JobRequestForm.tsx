"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Calendar as CalendarComponent } from "../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { JobRequest } from "../../../types";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
  Plane,
  Sunset,
  Video,
  Camera,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import { mediaTypeOptions } from "./utils";

interface JobRequestFormProps {
  onSubmit: (job: Partial<JobRequest>) => void | Promise<void>;
  initialValues?: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  };
}

interface FormData {
  clientName: string;
  propertyAddress: string;
  location?: { lat: number; lng: number };
  scheduledDate: string;
  scheduledTime: string;
  mediaType: string[];
  priority: "standard" | "rush" | "urgent";
  estimatedDuration: number;
  requirements: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, location?: { lat: number; lng: number }) => void;
  onBlur?: () => void;
  isGeocoding?: boolean;
}

function AddressAutocomplete({ value, onChange, onBlur, isGeocoding }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fetch predictions when query changes
  useEffect(() => {
    if (!query || query.length < 3) {
      setPredictions([]);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return;
    }

    setIsLoading(true);

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${token}&types=address&country=us,ca&limit=5`;

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Geocoding request failed");
          }
          return response.json();
        })
        .then((data: MapboxGeocodingResponse) => {
          setIsLoading(false);
          setPredictions(data.features || []);
        })
        .catch((err) => {
          console.error("Geocoding error:", err);
          setIsLoading(false);
          setPredictions([]);
        });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlaceSelect = useCallback(
    (feature: MapboxFeature) => {
      setQuery(feature.place_name);
      // Mapbox returns coordinates as [lng, lat], we need [lat, lng]
      const [lng, lat] = feature.center;
      onChange(feature.place_name, { lat, lng });
      setPredictions([]);
      setIsFocused(false);
    },
    [onChange]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isFocused]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60 z-10" />
        <Input
          id="propertyAddress"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Clear location when address is manually edited (not from autocomplete)
            onChange(e.target.value, undefined);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={onBlur}
          placeholder="Full street address including city and state"
          className="pl-11 h-11"
        />
        {(isLoading || isGeocoding) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Predictions Dropdown */}
      {isFocused && predictions.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-card rounded-lg border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
          {predictions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => handlePlaceSelect(feature)}
              className="w-full text-left p-3 hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">
                    {feature.place_name}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function JobRequestForm({
  onSubmit,
  initialValues,
}: JobRequestFormProps) {
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    propertyAddress: "",
    location: undefined,
    scheduledDate: initialValues?.scheduledDate || "",
    scheduledTime: initialValues?.scheduledTime || "",
    mediaType: [],
    priority: "standard",
    estimatedDuration: initialValues?.estimatedDuration || 120,
    requirements: "",
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number; placeName: string } | null> => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn('Mapbox token not configured');
      return null;
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        address
      )}.json?access_token=${token}&types=address&country=us,ca&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data: MapboxGeocodingResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        // Mapbox returns coordinates as [lng, lat], we need [lat, lng]
        const [lng, lat] = feature.center;
        return { lat, lng, placeName: feature.place_name };
      }
      
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  const handleAddressBlur = async () => {
    // Only geocode if address is manually entered (no location set) and address is not empty
    if (!formData.location && formData.propertyAddress.trim()) {
      setIsGeocoding(true);
      const trimmedAddress = formData.propertyAddress.trim();
      const geocodedResult = await geocodeAddress(trimmedAddress);
      
      if (geocodedResult) {
        setFormData((prev) => ({ 
          ...prev, 
          location: { lat: geocodedResult.lat, lng: geocodedResult.lng },
          propertyAddress: geocodedResult.placeName // Update to use corrected address
        }));
      }
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.clientName.trim()) {
      toast.error("Please enter a client name");
      return;
    }

    if (!formData.propertyAddress.trim()) {
      toast.error("Please enter a property address");
      return;
    }

    if (!formData.scheduledDate) {
      toast.error("Please select a scheduled date");
      return;
    }

    if (!formData.scheduledTime) {
      toast.error("Please select a scheduled time");
      return;
    }

    if (formData.mediaType.length === 0) {
      toast.error("Please select at least one media type");
      return;
    }

    // Always geocode on submit to ensure address and location are in sync
    let location = formData.location;
    let addressToUse = formData.propertyAddress.trim();
    
    if (formData.propertyAddress.trim()) {
      const trimmedAddress = formData.propertyAddress.trim();
      toast.loading("Geocoding address...", { id: "geocoding" });
      
      const geocodedResult = await geocodeAddress(trimmedAddress);
      
      if (geocodedResult) {
        // Always use the geocoded location and standardized address to ensure they match
        location = { lat: geocodedResult.lat, lng: geocodedResult.lng };
        addressToUse = geocodedResult.placeName; // Use standardized address from Mapbox
        toast.success("Address geocoded successfully", { id: "geocoding" });
      } else {
        // If geocoding fails, use existing location if available, otherwise default
        if (!location) {
        toast.error("Could not find location for this address. Using default location.", { id: "geocoding" });
        location = { lat: 51.0447, lng: -114.0719 };
        } else {
          toast.dismiss("geocoding");
          // Keep existing location and address as-is if geocoding fails
        }
      }
    }

    // Submit the form
    try {
      await onSubmit({
        clientName: formData.clientName.trim(),
        propertyAddress: addressToUse, // Use corrected address if geocoded, otherwise use original
        location: location,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        mediaType: formData.mediaType as (
          | "photo"
          | "video"
          | "aerial"
          | "twilight"
        )[],
        priority: formData.priority,
        estimatedDuration: formData.estimatedDuration,
        requirements: formData.requirements.trim(),
        status: "pending",
      });

      // Only reset form after successful submission
      setFormData({
        clientName: "",
        propertyAddress: "",
        location: undefined,
        scheduledDate: initialValues?.scheduledDate || "",
        scheduledTime: initialValues?.scheduledTime || "",
        mediaType: [],
        priority: "standard",
        estimatedDuration: initialValues?.estimatedDuration || 120,
        requirements: "",
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      // Don't reset form on error
    }
  };

  const priorityOptions = [
    {
      value: "standard",
      label: "Standard",
      icon: Clock,
      color: "text-blue-600",
    },
    {
      value: "rush",
      label: "Rush (24h)",
      icon: Zap,
      color: "text-orange-600",
    },
    {
      value: "urgent",
      label: "Urgent (12h)",
      icon: AlertCircle,
      color: "text-destructive",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Name */}
        <div className="space-y-2">
          <Label htmlFor="clientName" className="text-sm">
            Client Name *
          </Label>
          <Input
            id="clientName"
            value={formData.clientName}
            onChange={(e) =>
              setFormData({ ...formData, clientName: e.target.value })
            }
            placeholder="Enter client or agency name"
            className="h-11"
            required
          />
        </div>

        {/* Priority Level */}
        <div className="space-y-2">
          <Label htmlFor="priority" className="text-sm">
            Priority Level
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value: "standard" | "rush" | "urgent") =>
              setFormData({ ...formData, priority: value })
            }
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Property Address */}
      <div className="space-y-2">
        <Label htmlFor="propertyAddress" className="text-sm">
          Property Address *
        </Label>
        <AddressAutocomplete
          value={formData.propertyAddress}
          onChange={(address, location) =>
            setFormData({ ...formData, propertyAddress: address, location })
          }
          onBlur={handleAddressBlur}
          isGeocoding={isGeocoding}
        />
      </div>

      {/* Shoot Date and Time */}
      <div className="flex flex-col space-y-4">
        {/* Shoot Date */}
        <div className="space-y-2">
          <Label className="text-sm">Shoot Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="relative w-full justify-start text-left font-normal h-11 pl-11"
              >
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                {formData.scheduledDate ? (
                  (() => {
                    try {
                      const date = new Date(
                        formData.scheduledDate + "T00:00:00"
                      );
                      if (!isNaN(date.getTime())) {
                        return format(date, "PPP");
                      }
                    } catch (e) {
                      // Fallback to original value if parsing fails
                    }
                    return formData.scheduledDate;
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
                  formData.scheduledDate
                    ? (() => {
                        try {
                          const date = new Date(
                            formData.scheduledDate + "T00:00:00"
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
                    setFormData({
                      ...formData,
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

        {/* Start Time */}
        <div className="space-y-2">
          <Label className="text-sm">Start Time *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="relative w-full justify-start text-left font-normal h-11 pl-11"
              >
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                {formData.scheduledTime ? (
                  (() => {
                    try {
                      const [hours, minutes] =
                        formData.scheduledTime.split(":");
                      const hour24 = parseInt(hours, 10);
                      const hour12 =
                        hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                      const ampm = hour24 >= 12 ? "PM" : "AM";
                      return `${hour12}:${minutes} ${ampm}`;
                    } catch {
                      return formData.scheduledTime;
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
                      formData.scheduledTime
                        ? (() => {
                            const [hours] = formData.scheduledTime.split(":");
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
                      setFormData((prev) => {
                        const currentMinute = prev.scheduledTime
                          ? prev.scheduledTime.split(":")[1] || "00"
                          : "00";
                        const currentHour24 = prev.scheduledTime
                          ? parseInt(prev.scheduledTime.split(":")[0], 10)
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
                        return {
                          ...prev,
                          scheduledTime: `${hour24
                            .toString()
                            .padStart(2, "0")}:${currentMinute}`,
                        };
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
                      formData.scheduledTime
                        ? formData.scheduledTime.split(":")[1] || "00"
                        : "00"
                    }
                    onValueChange={(minute) => {
                      setFormData((prev) => {
                        const currentHour24 = prev.scheduledTime
                          ? parseInt(prev.scheduledTime.split(":")[0], 10)
                          : 9;
                        return {
                          ...prev,
                          scheduledTime: `${currentHour24
                            .toString()
                            .padStart(2, "0")}:${minute.padStart(2, "0")}`,
                        };
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
                      formData.scheduledTime
                        ? (() => {
                            const [hours] = formData.scheduledTime.split(":");
                            const hour24 = parseInt(hours, 10);
                            return hour24 >= 12 ? "PM" : "AM";
                          })()
                        : "AM"
                    }
                    onValueChange={(ampm) => {
                      setFormData((prev) => {
                        const currentMinute = prev.scheduledTime
                          ? prev.scheduledTime.split(":")[1] || "00"
                          : "00";
                        const currentHour24 = prev.scheduledTime
                          ? parseInt(prev.scheduledTime.split(":")[0], 10)
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
                        return {
                          ...prev,
                          scheduledTime: `${newHour24
                            .toString()
                            .padStart(2, "0")}:${currentMinute}`,
                        };
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

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm">
            Duration (minutes)
          </Label>
          <Input
            id="duration"
            type="number"
            value={formData.estimatedDuration}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : parseInt(e.target.value);
              // Allow free typing, minimum validation handled by HTML min attribute
              setFormData({
                ...formData,
                estimatedDuration: value === '' ? 120 : (isNaN(value as number) ? 120 : value as number),
              });
            }}
            onBlur={(e) => {
              // Enforce minimum of 15 minutes on blur
              const value = parseInt(e.target.value);
              if (isNaN(value) || value < 15) {
                setFormData({
                  ...formData,
                  estimatedDuration: 15,
                });
            }
            }}
            min="15"
            step="1"
            className="h-11"
          />
        </div>
      </div>

      {/* Media Types */}
      <div className="space-y-2">
        <Label className="text-sm">What media do you need? *</Label>
        <ToggleGroup
          type="multiple"
          value={formData.mediaType}
          onValueChange={(value) => {
            setFormData((prev) => ({ ...prev, mediaType: value }));
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

      <div className="space-y-2">
        <Label htmlFor="requirements" className="text-sm">
          Special Requirements
        </Label>
        <Textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e) =>
            setFormData({ ...formData, requirements: e.target.value })
          }
          placeholder="Any special instructions, access codes, or details the photographer should know..."
          rows={4}
          className="resize-none"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-primary shadow-lg shadow-indigo-200"
      >
        Create Job Request
      </Button>
    </form>
  );
}
