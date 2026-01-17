'use client';

import { useState } from 'react';
import { ClientApprovalStatus, DeliveryResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, MessageSquare, Loader2, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

interface DeliveryApprovalProps {
  project: DeliveryResponse['project'];
  canApprove: boolean;
  token: string;
  onStatusChange: () => void;
}

export function DeliveryApproval({
  project,
  canApprove,
  token,
  onStatusChange,
}: DeliveryApprovalProps) {
  const { user } = useAuth();
  const [approving, setApproving] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleApprove = async () => {
    try {
      setApproving(true);
      await api.delivery.approve(token);
      toast.success('Delivery approved!');
      onStatusChange();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Failed to approve delivery');
    } finally {
      setApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    try {
      setRequestingChanges(true);
      await api.delivery.requestChanges(token, feedback);
      toast.success('Change request submitted');
      setShowChangesDialog(false);
      setFeedback('');
      onStatusChange();
    } catch (error) {
      console.error('Failed to request changes:', error);
      toast.error('Failed to submit change request');
    } finally {
      setRequestingChanges(false);
    }
  };

  // Already approved
  if (project.clientApprovalStatus === ClientApprovalStatus.APPROVED) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Delivery Approved</span>
        </div>
        {project.clientApprovedAt && (
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
            Approved on {new Date(project.clientApprovedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="bg-muted rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Sign in to approve this delivery or request changes.
        </p>
        <Link href={`/login?redirect=/delivery/${token}`}>
          <Button variant="outline" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // Logged in but not the customer
  if (!canApprove) {
    return (
      <div className="bg-muted rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          {project.clientApprovalStatus === ClientApprovalStatus.CHANGES_REQUESTED
            ? 'Changes have been requested. The customer will be notified.'
            : 'This delivery is pending review by the customer.'}
        </p>
      </div>
    );
  }

  // Can approve - show actions
  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="font-medium mb-2">Review Delivery</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {project.clientApprovalStatus === ClientApprovalStatus.CHANGES_REQUESTED
          ? 'You previously requested changes. Review the updates and approve when ready.'
          : 'Review the media above and approve the delivery or request changes.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={handleApprove} disabled={approving}>
          {approving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Approve Delivery
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowChangesDialog(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Request Changes
        </Button>
      </div>

      {/* Request Changes Dialog */}
      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Describe what changes you would like to the delivery.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Please describe the changes you need..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangesDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestChanges}
              disabled={requestingChanges || !feedback.trim()}
            >
              {requestingChanges ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
