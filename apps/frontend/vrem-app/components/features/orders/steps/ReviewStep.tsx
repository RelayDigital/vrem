'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { H2, P, Muted } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle2,
  User,
  MapPin,
  Calendar,
  Clock,
  Camera,
  Edit2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { OrderFormData, OrderStep } from '../CreateOrderFlow';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  formData: OrderFormData;
  isPersonalOrg: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  onEdit: (step: OrderStep) => void;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  photo: 'Photography',
  video: 'Video Tour',
  aerial: 'Aerial/Drone',
  twilight: 'Twilight',
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-blue-100 text-blue-700' },
  rush: { label: 'Rush', color: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function ReviewStep({
  formData,
  isPersonalOrg,
  isSubmitting,
  onSubmit,
  onBack,
  onEdit,
}: ReviewStepProps) {
  const priorityInfo = PRIORITY_LABELS[formData.priority] || PRIORITY_LABELS.standard;

  const scheduledDateTime = formData.scheduledDate && formData.scheduledTime
    ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
    : null;

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="container mx-auto p-6 h-full"
    >
      <div
        className="container mx-auto space-y-6"
        style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Customer</span>
          <span className="mx-2">→</span>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Address</span>
          <span className="mx-2">→</span>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Schedule</span>
          <span className="mx-2">→</span>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Services</span>
          {!isPersonalOrg && (
            <>
              <span className="mx-2">→</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Assign</span>
            </>
          )}
          <span className="mx-2">→</span>
          <span className="text-primary font-medium">Review</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <H2 className="text-2xl border-0">Review your order</H2>
          <P className="text-muted-foreground">
            Confirm the details before creating the order
          </P>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl border-2 border-border overflow-hidden">
          {/* Customer Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                CUSTOMER
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit('customer')}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
            <div className="text-lg font-medium">
              {formData.customerName || 'New Customer'}
            </div>
            {formData.newCustomer && (
              <div className="text-sm text-muted-foreground mt-1">
                {formData.newCustomer.email && <span>{formData.newCustomer.email}</span>}
                {formData.newCustomer.email && formData.newCustomer.phone && <span> • </span>}
                {formData.newCustomer.phone && <span>{formData.newCustomer.phone}</span>}
              </div>
            )}
          </div>

          <Separator />

          {/* Address Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                PROPERTY ADDRESS
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit('address')}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
            <div className="text-lg">{formData.addressLine1}</div>
            {(formData.city || formData.region) && (
              <div className="text-sm text-muted-foreground mt-1">
                {[formData.city, formData.region, formData.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            )}
          </div>

          <Separator />

          {/* Schedule Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                SCHEDULE
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit('scheduling')}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-lg font-medium">
                  {scheduledDateTime
                    ? format(scheduledDateTime, 'EEEE, MMMM d, yyyy')
                    : 'Not scheduled'}
                </div>
                {formData.scheduledTime && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatTime12Hour(formData.scheduledTime)} •{' '}
                    {formData.estimatedDuration} min
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Services Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Camera className="h-4 w-4" />
                SERVICES
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit('service')}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.mediaTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {MEDIA_TYPE_LABELS[type] || type}
                </Badge>
              ))}
            </div>
            <Badge className={cn('font-medium', priorityInfo.color)}>
              {priorityInfo.label} Delivery
            </Badge>
            {formData.notes && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <Muted className="text-xs mb-1">Special Instructions</Muted>
                <div className="text-sm">{formData.notes}</div>
              </div>
            )}
          </div>

          {/* Technician Section (if not personal org) */}
          {!isPersonalOrg && (
            <>
              <Separator />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    ASSIGNED TO
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit('technician')}
                    className="h-8"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="text-lg">
                  {formData.technicianName || (
                    <span className="text-muted-foreground italic">
                      Not assigned - will be assigned later
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-[2] bg-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Create Order
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

