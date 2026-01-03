'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DeliveryResponse, DeliveryComment } from '@/types';
import { DeliveryHeader } from './DeliveryHeader';
import { DeliveryGallery } from './DeliveryGallery';
import { DeliveryApproval } from './DeliveryApproval';
import { DeliveryComments } from './DeliveryComments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DeliveryViewProps {
  delivery: DeliveryResponse;
  token: string;
}

type DownloadState = 'idle' | 'preparing' | 'generating' | 'ready' | 'error';

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 150; // Max 5 minutes of polling (150 * 2s)

export function DeliveryView({ delivery: initialDelivery, token }: DeliveryViewProps) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  // Trigger browser download from CDN URL
  const triggerDownload = useCallback((cdnUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = cdnUrl;
    link.download = filename;
    link.target = '_blank'; // Open in new tab as fallback
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Download started');
    setDownloadState('idle');
  }, []);

  // Request a new download artifact
  const requestArtifact = useCallback(async (): Promise<string | null> => {
    try {
      const result = await api.delivery.requestDownload(token);

      switch (result.status) {
        case 'READY':
          if (result.cdnUrl) {
            setDownloadState('ready');
            triggerDownload(result.cdnUrl, result.filename || 'media.zip');
          } else {
            throw new Error('Download URL not available');
          }
          return null; // No need to poll

        case 'GENERATING':
        case 'PENDING':
          setDownloadState('generating');
          return result.artifactId; // Need to poll

        case 'FAILED':
          setDownloadState('error');
          setErrorMessage(result.error || 'Download preparation failed');
          toast.error(result.error || 'Download preparation failed');
          return null;

        default:
          return null;
      }
    } catch (error: any) {
      console.error('Failed to request download:', error);
      setDownloadState('error');
      setErrorMessage(error.message || 'Failed to start download');
      toast.error('Failed to start download');
      return null;
    }
  }, [token, triggerDownload]);

  // Poll for artifact status
  const pollArtifactStatus = useCallback(async (artifactId: string) => {
    pollCountRef.current++;

    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      setDownloadState('error');
      setErrorMessage('Download preparation timed out. Please try again.');
      toast.error('Download preparation timed out');
      return;
    }

    try {
      const status = await api.delivery.getDownloadStatus(token, artifactId);

      switch (status.status) {
        case 'READY':
          if (status.cdnUrl) {
            setDownloadState('ready');
            triggerDownload(status.cdnUrl, status.filename || 'media.zip');
          } else {
            throw new Error('Download URL not available');
          }
          break;

        case 'GENERATING':
        case 'PENDING':
          setDownloadState('generating');
          // Continue polling
          pollTimeoutRef.current = setTimeout(() => {
            pollArtifactStatus(artifactId);
          }, POLL_INTERVAL_MS);
          break;

        case 'FAILED':
          setDownloadState('error');
          setErrorMessage(status.error || 'Download preparation failed');
          toast.error(status.error || 'Download preparation failed');
          break;

        case 'EXPIRED':
          // Artifact expired, request a new one
          setDownloadState('preparing');
          const newArtifactId = await requestArtifact();
          if (newArtifactId) {
            pollTimeoutRef.current = setTimeout(() => {
              pollArtifactStatus(newArtifactId);
            }, POLL_INTERVAL_MS);
          }
          break;
      }
    } catch (error: any) {
      console.error('Failed to check download status:', error);
      setDownloadState('error');
      setErrorMessage('Failed to check download status');
      toast.error('Failed to check download status');
    }
  }, [token, triggerDownload, requestArtifact]);

  // Start download - request artifact and poll
  const startDownload = useCallback(async () => {
    setDownloadState('preparing');
    setErrorMessage(null);
    pollCountRef.current = 0;
    toast.info('Preparing your download...');

    const artifactId = await requestArtifact();
    if (artifactId) {
      // Start polling
      pollTimeoutRef.current = setTimeout(() => {
        pollArtifactStatus(artifactId);
      }, POLL_INTERVAL_MS);
    }
  }, [requestArtifact, pollArtifactStatus]);

  const handleDownloadAll = () => {
    // Clear any existing polling
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
    startDownload();
  };

  const getDownloadButtonContent = () => {
    switch (downloadState) {
      case 'preparing':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Requesting...
          </>
        );
      case 'generating':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Preparing download...
          </>
        );
      case 'ready':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Download starting...
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            Retry Download
          </>
        );
      default:
        return (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download All ({delivery.media.length} files)
          </>
        );
    }
  };

  const handleStatusChange = useCallback(async () => {
    try {
      const updated = await api.delivery.getByToken(token);
      setDelivery(updated);
    } catch (error) {
      console.error('Failed to refresh delivery:', error);
    }
  }, [token]);

  const handleCommentAdded = useCallback((comment: DeliveryComment) => {
    setDelivery((prev) => ({
      ...prev,
      comments: [...prev.comments, comment],
    }));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with company branding and project info */}
      <DeliveryHeader
        organization={delivery.organization}
        project={delivery.project}
      />

      {/* Main content */}
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Actions bar - only show download button if enabled and media exists */}
        {delivery.downloadEnabled && delivery.media.length > 0 && (
          <div className="flex justify-end mb-6">
            <Button
              onClick={handleDownloadAll}
              disabled={['preparing', 'generating', 'ready'].includes(downloadState)}
              variant={downloadState === 'error' ? 'destructive' : 'outline'}
            >
              {getDownloadButtonContent()}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gallery - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <DeliveryGallery
              media={delivery.media}
              token={token}
            />
          </div>

          {/* Sidebar with approval and comments */}
          <div className="space-y-6">
            {/* Approval Section */}
            <DeliveryApproval
              project={delivery.project}
              canApprove={delivery.canApprove}
              token={token}
              onStatusChange={handleStatusChange}
            />

            {/* Comments Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryComments
                  comments={delivery.comments}
                  canComment={delivery.canComment}
                  token={token}
                  onCommentAdded={handleCommentAdded}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
