import { AuditLogEntry } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { ScrollArea } from '../../ui/scroll-area';
import {
  FileText,
  UserPlus,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Clock,
} from 'lucide-react';
import { P } from '@/components/ui/typography';

interface AuditLogProps {
  entries: AuditLogEntry[];
}

export function AuditLog({ entries }: AuditLogProps) {
  const getActionIcon = (action: string) => {
    if (action.includes('created')) return FileText;
    if (action.includes('assigned')) return UserCheck;
    if (action.includes('delivered')) return CheckCircle2;
    if (action.includes('cancelled')) return XCircle;
    if (action.includes('updated')) return Edit;
    return AlertCircle;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'text-primary';
    if (action.includes('assigned')) return 'text-purple-600';
    if (action.includes('delivered')) return 'text-emerald-600';
    if (action.includes('cancelled')) return 'text-destructive';
    if (action.includes('updated')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedEntries = [...entries].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <Card>
      {/* <CardHeader>
        <CardTitle>System Activity Audit Log</CardTitle>
        <P className="text-sm text-muted-foreground">
          All system actions are timestamped and traceable to a user identity
        </P>
      </CardHeader> */}
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => {
                const ActionIcon = getActionIcon(entry.action);
                const actionColor = getActionColor(entry.action);

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatTimestamp(entry.timestamp)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {entry.timestamp.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{entry.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.userId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${actionColor}`}>
                        <ActionIcon className="h-4 w-4" />
                        <span className="text-sm">{entry.action}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{entry.resourceType}</Badge>
                        <div className="text-xs text-muted-foreground">
                          {entry.resourceId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-[300px]">
                        {Object.entries(entry.details).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-muted-foreground">{key}:</span>{' '}
                            <span>
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
