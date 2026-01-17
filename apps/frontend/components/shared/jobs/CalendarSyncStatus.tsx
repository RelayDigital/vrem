'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarSyncStatusProps {
  projectId: string;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

interface SyncStatus {
  synced: boolean;
  nylasEventId: string | null;
  lastSyncedAt: string | null;
  syncStatus: string;
  lastError: string | null;
}

export function CalendarSyncStatus({
  projectId,
  className,
  showLabel = true,
  compact = false,
}: CalendarSyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.nylas.getProjectSyncStatus(projectId);
        setStatus(data);
      } catch (err) {
        console.error('Failed to fetch sync status:', err);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [projectId]);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const result = await api.nylas.reconcileProject(projectId);
      toast.success(result.message || 'Calendar event synced');
      // Refetch status
      const data = await api.nylas.getProjectSyncStatus(projectId);
      setStatus(data);
    } catch (err) {
      console.error('Failed to reconcile:', err);
      toast.error('Failed to sync calendar event');
    } finally {
      setReconciling(false);
    }
  };

  if (loading) {
    if (compact) {
      return (
        <div className={cn('flex items-center gap-1', className)}>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {showLabel && <span className="text-sm">Checking sync...</span>}
      </div>
    );
  }

  // No status means Nylas isn't configured or no technician assigned
  if (!status) {
    return null;
  }

  const getSyncIcon = () => {
    switch (status.syncStatus) {
      case 'SYNCED':
        return <CheckCircle2 className={cn('text-green-500', compact ? 'h-3 w-3' : 'h-4 w-4')} />;
      case 'PENDING':
        return <Clock className={cn('text-yellow-500', compact ? 'h-3 w-3' : 'h-4 w-4')} />;
      case 'FAILED':
        return <AlertCircle className={cn('text-destructive', compact ? 'h-3 w-3' : 'h-4 w-4')} />;
      default:
        return <Calendar className={cn('text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />;
    }
  };

  const getSyncLabel = () => {
    switch (status.syncStatus) {
      case 'SYNCED':
        return 'Calendar synced';
      case 'PENDING':
        return 'Sync pending';
      case 'FAILED':
        return 'Sync failed';
      case 'DELETED':
        return 'Event removed';
      default:
        return 'Not synced';
    }
  };

  const getSyncVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status.syncStatus) {
      case 'SYNCED':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1', className)}>
              {getSyncIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getSyncLabel()}</p>
            {status.lastError && (
              <p className="text-xs text-destructive mt-1">{status.lastError}</p>
            )}
            {status.lastSyncedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getSyncVariant()} className="gap-1.5 cursor-default">
              {getSyncIcon()}
              {showLabel && <span>{getSyncLabel()}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getSyncLabel()}</p>
              {status.lastError && (
                <p className="text-xs text-destructive">{status.lastError}</p>
              )}
              {status.lastSyncedAt && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                </p>
              )}
              {status.nylasEventId && (
                <p className="text-xs text-muted-foreground">
                  Event ID: {status.nylasEventId.slice(0, 12)}...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {(status.syncStatus === 'FAILED' || status.syncStatus === 'PENDING') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReconcile}
          disabled={reconciling}
          className="h-6 px-2"
        >
          {reconciling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}
