import { CompanyApplication } from '../../../types';
import { Badge } from '../../ui/badge';

interface ApplicationCardProps {
  application: CompanyApplication;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  return (
    <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
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
              ? 'border-orange-500 text-orange-700'
              : application.status === 'approved'
              ? 'border-emerald-500 text-emerald-700'
              : 'border-destructive text-destructive'
          }
        >
          {application.status === 'pending' ? 'Pending Review' : application.status}
        </Badge>
      </div>
    </div>
  );
}

