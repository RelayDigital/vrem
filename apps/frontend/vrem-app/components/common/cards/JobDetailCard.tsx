import { JobRequest } from '../../../types';
import { Badge } from '../../ui/badge';
import { ImageWithFallback } from '../';
import {
  Calendar,
  MapPin,
  Clock,
  Camera,
  Video,
  Plane,
  Sunset,
} from 'lucide-react';

interface JobDetailCardProps {
  job: JobRequest;
  onClick?: () => void;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'photo': return Camera;
    case 'video': return Video;
    case 'aerial': return Plane;
    case 'twilight': return Sunset;
    default: return Camera;
  }
};

const getStatusGradient = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-gradient-to-br from-status-pending/20 via-status-pending/15 to-status-pending/10";
    case "assigned":
      return "bg-gradient-to-br from-status-assigned/20 via-status-assigned/15 to-status-assigned/10";
    case "in_progress":
      return "bg-gradient-to-br from-status-in-progress/20 via-status-in-progress/15 to-status-in-progress/10";
    case "editing":
      return "bg-gradient-to-br from-status-editing/20 via-status-editing/15 to-status-editing/10";
    case "delivered":
      return "bg-gradient-to-br from-status-delivered/20 via-status-delivered/15 to-status-delivered/10";
    case "cancelled":
      return "bg-gradient-to-br from-status-cancelled/20 via-status-cancelled/15 to-status-cancelled/10";
    default:
      return "bg-gradient-to-br from-status-cancelled/20 via-status-cancelled/15 to-status-cancelled/10";
  }
};

export function JobDetailCard({ job, onClick }: JobDetailCardProps) {
  return (
    <div
      className="p-4 border-2 border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-4">
          <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
          {job.propertyImage && job.status === "delivered" ? (
            <ImageWithFallback
              src={job.propertyImage}
              alt={job.propertyAddress}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={getStatusGradient(job.status) + " w-full h-full"} />
          )}
          </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{job.clientName}</div>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-sm">{job.propertyAddress}</span>
              </div>
            </div>
            <Badge
              variant={
                job.priority === 'urgent'
                  ? 'destructive'
                  : job.priority === 'rush'
                  ? 'default'
                  : 'secondary'
              }
            >
              {job.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{job.scheduledDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{job.scheduledTime}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {job.mediaType.map((type) => {
              const Icon = getMediaIcon(type);
              return (
                <div
                  key={type}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-lg text-xs"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground/90 capitalize">{type}</span>
                </div>
              );
            })}
          </div>
          {job.requirements && (
            <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {job.requirements}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

