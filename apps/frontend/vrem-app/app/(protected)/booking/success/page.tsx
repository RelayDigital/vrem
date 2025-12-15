'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';

type OrderStatus = 'PENDING_PAYMENT' | 'PAYMENT_COMPLETED' | 'PROJECT_CREATED' | 'EXPIRED' | 'CANCELLED';

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const pollingRef = useRef(true);
  const projectIdRef = useRef<string | null>(null);

  const pollStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const result = await api.orders.getOrderStatus(sessionId);
      setStatus(result.status);
      setProjectId(result.projectId);
      projectIdRef.current = result.projectId;

      // Stop polling once project is created
      if (result.status === 'PROJECT_CREATED') {
        pollingRef.current = false;
        setPolling(false);
        setProgress(100);
      } else if (result.status === 'EXPIRED' || result.status === 'CANCELLED') {
        pollingRef.current = false;
        setPolling(false);
        setError('Payment was not completed');
      }
    } catch (err: any) {
      console.error('Failed to get order status:', err);
      // Don't immediately fail - could be temporary network issue
      setPollCount(prev => prev + 1);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID');
      setPolling(false);
      return;
    }

    pollingRef.current = true;

    // Initial check immediately
    pollStatus();

    // Poll more frequently at first (every 1s for first 10s), then slower
    let pollInterval = 1000;
    let elapsed = 0;
    const maxWait = 30000; // 30 seconds max

    const interval = setInterval(() => {
      if (!pollingRef.current) {
        clearInterval(interval);
        return;
      }

      elapsed += pollInterval;

      // Update progress bar (smooth progress up to 90%)
      setProgress(Math.min(90, (elapsed / maxWait) * 100));

      // Slow down polling after 10 seconds
      if (elapsed > 10000) {
        pollInterval = 2000;
      }

      pollStatus();
      setPollCount(prev => prev + 1);

      // Stop after max wait
      if (elapsed >= maxWait) {
        pollingRef.current = false;
        setPolling(false);
        if (!projectIdRef.current) {
          setError('Order processing is taking longer than expected.');
        }
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
      pollingRef.current = false;
    };
  }, [sessionId, pollStatus]);

  if (error) {
    const isTimeout = error.includes('taking longer');
    return (
      <div className="container max-w-lg mx-auto py-16">
        <Card>
          <CardHeader className="text-center pb-6">
            {isTimeout ? (
              <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            )}
            <CardTitle>
              {isTimeout ? 'Still Processing' : 'Something went wrong'}
            </CardTitle>
            <CardDescription className="text-base">
              {isTimeout ? (
                <>
                  Your payment was successful, but the order is still being processed.
                  <br />
                  <span className="text-muted-foreground">
                    Check your jobs page in a moment - your order should appear shortly.
                  </span>
                </>
              ) : (
                error
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-6">
            <Button className="w-full" onClick={() => router.push('/jobs')}>
              View My Jobs
            </Button>
            {!isTimeout && (
              <Button variant="outline" className="w-full" onClick={() => router.push('/booking')}>
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'PROJECT_CREATED' && projectId) {
    return (
      <div className="container max-w-lg mx-auto py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="relative mx-auto mb-4">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <CheckCircle className="relative h-12 w-12 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
            <CardDescription className="text-base">
              Your photography session has been booked successfully.
              <br />
              <span className="text-muted-foreground">
                You&apos;ll receive a confirmation email shortly.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => router.push(`/jobs/${projectId}`)}>
              View Order Details
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/booking')}>
              Book Another Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still processing
  return (
    <div className="container max-w-lg mx-auto py-16">
      <Card>
        <CardHeader className="text-center pb-4">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <CardTitle>Confirming Your Order...</CardTitle>
          <CardDescription className="text-base">
            Please wait while we process your payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground">
            {progress < 30 && 'Verifying payment...'}
            {progress >= 30 && progress < 60 && 'Creating your order...'}
            {progress >= 60 && progress < 90 && 'Almost done...'}
            {progress >= 90 && 'Finalizing...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
