'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { DeliveryResponse } from '@/types';
import { DeliveryView } from '@/components/features/delivery/DeliveryView';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DeliveryPage() {
  const params = useParams();
  const token = params.token as string;
  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.delivery.getByToken(token);
        setDelivery(data);
      } catch (err: any) {
        console.error('Failed to load delivery:', err);
        setError(err.message || 'Failed to load delivery');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDelivery();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-6 w-72" />
        </div>

        {/* Gallery Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error === 'Delivery not found or invalid token'
              ? 'This delivery link is invalid or has expired.'
              : error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  return <DeliveryView delivery={delivery} token={token} />;
}
