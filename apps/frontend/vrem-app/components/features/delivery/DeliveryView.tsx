'use client';

import { useState, useCallback } from 'react';
import { DeliveryResponse, DeliveryComment } from '@/types';
import { DeliveryHeader } from './DeliveryHeader';
import { DeliveryGallery } from './DeliveryGallery';
import { DeliveryApproval } from './DeliveryApproval';
import { DeliveryComments } from './DeliveryComments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DeliveryViewProps {
  delivery: DeliveryResponse;
  token: string;
}

type DownloadState = 'idle' | 'downloading' | 'error';

export function DeliveryView({ delivery: initialDelivery, token }: DeliveryViewProps) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');

  // Build filename from delivery address
  const getDownloadFilename = useCallback(() => {
    const { project } = delivery;
    const addressParts = [
      project.addressLine1,
      project.city,
      project.region,
    ].filter(Boolean);

    if (addressParts.length > 0) {
      const address = addressParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_');
      return `${address}.zip`;
    }
    return 'delivery.zip';
  }, [delivery]);

  // Streaming download
  const startStreamingDownload = useCallback(async () => {
    setDownloadState('downloading');
    toast.info('Starting download...');

    try {
      const streamingUrl = api.delivery.getDownloadUrl(token);
      const response = await fetch(streamingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Build filename from delivery address
      const filename = getDownloadFilename();

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Download complete');
      setDownloadState('idle');
    } catch (error) {
      console.error('Streaming download failed:', error);
      toast.error('Failed to download files');
      setDownloadState('error');
    }
  }, [token, getDownloadFilename]);

  const handleDownloadAll = () => {
    startStreamingDownload();
  };

  const getDownloadButtonContent = () => {
    switch (downloadState) {
      case 'downloading':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Downloading...
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
        {/* Actions bar */}
        {delivery.media.length > 0 && (
          <div className="flex justify-end mb-6">
            <Button
              onClick={handleDownloadAll}
              disabled={downloadState === 'downloading'}
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
                  canComment={delivery.canApprove}
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
