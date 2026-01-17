import { CompanyApplication } from '../../../types';
import { Badge } from '../../ui/badge';

interface ApplicationCardProps {
  application: CompanyApplication;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  return (
    <div className="p-4 bg-status-pending/10 border-2 border-status-pending/30 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{application.companyName}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Applied {application.appliedAt.toLocaleDateString()}
          </div>
          {application.message && (
            <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
              "{application.message}"
            </div>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={
            application.status === 'pending' 
              ? 'border-status-pending text-status-pending'
              : application.status === 'approved'
              ? 'border-status-delivered text-status-delivered'
              : 'border-destructive text-destructive'
          }
        >
          {application.status === 'pending' ? 'Pending Review' : application.status}
        </Badge>
      </div>
    </div>
  );
}

