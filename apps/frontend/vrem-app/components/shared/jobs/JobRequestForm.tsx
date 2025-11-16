'use client';

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Calendar as CalendarComponent } from '../../ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover';
import { JobRequest } from '../../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Clock, Camera, Video, Plane, Sunset, Zap, AlertCircle } from 'lucide-react';

interface JobRequestFormProps {
  onSubmit: (job: Partial<JobRequest>) => void;
}

export function JobRequestForm({ onSubmit }: JobRequestFormProps) {
  const [formData, setFormData] = useState({
    clientName: '',
    propertyAddress: '',
    scheduledDate: '',
    scheduledTime: '',
    mediaTypes: [] as string[],
    priority: 'standard' as 'standard' | 'rush' | 'urgent',
    estimatedDuration: 120,
    requirements: '',
  });

  const handleMediaTypeToggle = (mediaType: string) => {
    setFormData((prev) => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(mediaType)
        ? prev.mediaTypes.filter((t) => t !== mediaType)
        : [...prev.mediaTypes, mediaType],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.propertyAddress || !formData.scheduledDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.mediaTypes.length === 0) {
      toast.error('Please select at least one media type');
      return;
    }

    onSubmit({
      clientName: formData.clientName,
      propertyAddress: formData.propertyAddress,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      mediaType: formData.mediaTypes as any,
      priority: formData.priority,
      estimatedDuration: formData.estimatedDuration,
      requirements: formData.requirements,
      status: 'pending',
    });

    // Reset form
    setFormData({
      clientName: '',
      propertyAddress: '',
      scheduledDate: '',
      scheduledTime: '',
      mediaTypes: [],
      priority: 'standard',
      estimatedDuration: 120,
      requirements: '',
    });
  };

  const mediaTypeOptions = [
    { id: 'photo', label: 'Photography', icon: Camera, color: '' },
    { id: 'video', label: 'Video', icon: Video, color: '' },
    { id: 'aerial', label: 'Aerial/Drone', icon: Plane, color: '' },
    { id: 'twilight', label: 'Twilight', icon: Sunset, color: '' },
  ];

  const priorityOptions = [
    { value: 'standard', label: 'Standard', icon: Clock, color: 'text-blue-600' },
    { value: 'rush', label: 'Rush (24h)', icon: Zap, color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent (12h)', icon: AlertCircle, color: 'text-destructive' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="clientName" className="text-sm">Client Name *</Label>
          <Input
            id="clientName"
            value={formData.clientName}
            onChange={(e) =>
              setFormData({ ...formData, clientName: e.target.value })
            }
            placeholder="Enter client or agency name"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="text-sm">Priority Level</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: any) =>
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

      <div className="space-y-2">
        <Label htmlFor="propertyAddress" className="text-sm">Property Address *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
          <Input
            id="propertyAddress"
            value={formData.propertyAddress}
            onChange={(e) =>
              setFormData({ ...formData, propertyAddress: e.target.value })
            }
            placeholder="Full street address including city and state"
            className="pl-11 h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Shoot Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="relative w-full justify-start text-left font-normal h-11 pl-11"
              >
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                {formData.scheduledDate ? (
                  (() => {
                    try {
                      const date = new Date(formData.scheduledDate + 'T00:00:00');
                      if (!isNaN(date.getTime())) {
                        return format(date, 'PPP');
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
                          const date = new Date(formData.scheduledDate + 'T00:00:00');
                          return !isNaN(date.getTime()) ? date : undefined;
                        } catch {
                          return undefined;
                        }
                      })()
                    : undefined
                }
                onSelect={(date) => {
                  if (date) {
                    setFormData({ ...formData, scheduledDate: format(date, 'yyyy-MM-dd') });
                  }
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Start Time *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="relative w-full justify-start text-left font-normal h-11 pl-11"
              >
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                {formData.scheduledTime ? (
                  (() => {
                    try {
                      const [hours, minutes] = formData.scheduledTime.split(':');
                      const hour24 = parseInt(hours, 10);
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                      const ampm = hour24 >= 12 ? 'PM' : 'AM';
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
                            const [hours] = formData.scheduledTime.split(':');
                            const hour24 = parseInt(hours, 10);
                            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                            return hour12.toString();
                          })()
                        : '9'
                    }
                    onValueChange={(hour12) => {
                      const currentMinute = formData.scheduledTime
                        ? formData.scheduledTime.split(':')[1] || '00'
                        : '00';
                      const currentHour24 = formData.scheduledTime
                        ? parseInt(formData.scheduledTime.split(':')[0], 10)
                        : 9;
                      const isPM = currentHour24 >= 12;
                      const hour24 = hour12 === '12' ? (isPM ? 12 : 0) : (isPM ? parseInt(hour12, 10) + 12 : parseInt(hour12, 10));
                      setFormData({
                        ...formData,
                        scheduledTime: `${hour24.toString().padStart(2, '0')}:${currentMinute}`,
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
                        ? formData.scheduledTime.split(':')[1] || '00'
                        : '00'
                    }
                    onValueChange={(minute) => {
                      const currentHour24 = formData.scheduledTime
                        ? parseInt(formData.scheduledTime.split(':')[0], 10)
                        : 9;
                      setFormData({
                        ...formData,
                        scheduledTime: `${currentHour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 15, 30, 45].map((min) => (
                        <SelectItem key={min} value={min.toString().padStart(2, '0')}>
                          {min.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={
                      formData.scheduledTime
                        ? (() => {
                            const [hours] = formData.scheduledTime.split(':');
                            const hour24 = parseInt(hours, 10);
                            return hour24 >= 12 ? 'PM' : 'AM';
                          })()
                        : 'AM'
                    }
                    onValueChange={(ampm) => {
                      const currentMinute = formData.scheduledTime
                        ? formData.scheduledTime.split(':')[1] || '00'
                        : '00';
                      const currentHour24 = formData.scheduledTime
                        ? parseInt(formData.scheduledTime.split(':')[0], 10)
                        : 9;
                      const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
                      const newHour24 = ampm === 'PM'
                        ? (currentHour12 === 12 ? 12 : currentHour12 + 12)
                        : (currentHour12 === 12 ? 0 : currentHour12);
                      setFormData({
                        ...formData,
                        scheduledTime: `${newHour24.toString().padStart(2, '0')}:${currentMinute}`,
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

        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.estimatedDuration}
            onChange={(e) =>
              setFormData({
                ...formData,
                estimatedDuration: parseInt(e.target.value),
              })
            }
            min="30"
            step="30"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm">Media Types Required *</Label>
        <div className="grid grid-cols-2 gap-3">
          {mediaTypeOptions.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.mediaTypes.includes(type.id);
            return (
              <div
                key={type.id}
                className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-gradient-to-br from-indigo-50 to-purple-50'
                    : 'border-border bg-card hover:border-border'
                }`}
                onClick={() => handleMediaTypeToggle(type.id)}
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg bg-gradient-to-br ${type.color} ${
                      isSelected ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {type.label}
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleMediaTypeToggle(type.id)}
                    className={isSelected ? 'border-primary' : ''}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements" className="text-sm">Special Requirements</Label>
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
        className="w-full h-12 bg-primary  shadow-lg shadow-indigo-200"
      >
        Create Job Request
      </Button>
    </form>
  );
}
