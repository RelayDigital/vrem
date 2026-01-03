'use client';

import { DeliveryResponse, ClientApprovalStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Building2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface DeliveryHeaderProps {
  organization: DeliveryResponse['organization'];
  project: DeliveryResponse['project'];
}

function getApprovalBadge(status: ClientApprovalStatus) {
  switch (status) {
    case ClientApprovalStatus.APPROVED:
      return (
        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case ClientApprovalStatus.CHANGES_REQUESTED:
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Changes Requested
        </Badge>
      );
    case ClientApprovalStatus.PENDING_REVIEW:
    default:
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      );
  }
}

export function DeliveryHeader({ organization, project }: DeliveryHeaderProps) {
  const address = [project.addressLine1, project.city, project.region]
    .filter(Boolean)
    .join(', ');

  return (
    <header className="border-b bg-card">
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Company branding */}
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              <Image
                src={organization.logoUrl}
                alt={organization.name}
                width={48}
                height={48}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold">{organization.name}</h1>
              <p className="text-sm text-muted-foreground">Media Delivery</p>
            </div>
          </div>

          {/* Approval status */}
          <div className="flex flex-col items-end gap-1">
            {getApprovalBadge(project.clientApprovalStatus)}
            {project.clientApprovalStatus === ClientApprovalStatus.APPROVED && project.clientApprovedAt && (
              <span className="text-xs text-muted-foreground">
                Approved on {format(project.clientApprovedAt, 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Project details */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{format(project.scheduledTime, 'MMMM d, yyyy')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
