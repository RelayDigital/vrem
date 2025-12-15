'use client';

import { useState, useCallback } from 'react';
import { DeliveryResponse, DeliveryComment } from '@/types';
import { DeliveryHeader } from './DeliveryHeader';
import { DeliveryGallery } from './DeliveryGallery';
import { DeliveryApproval } from './DeliveryApproval';
import { DeliveryComments } from './DeliveryComments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DeliveryViewProps {
  delivery: DeliveryResponse;
  token: string;
}

export function DeliveryView({ delivery: initialDelivery, token }: DeliveryViewProps) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = async () => {
    try {
      setDownloading(true);
      await api.delivery.downloadAll(token);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download files');
    } finally {
      setDownloading(false);
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
              disabled={downloading}
              variant="outline"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All ({delivery.media.length} files)
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
