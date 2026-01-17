'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BookingCancelPage() {
  const router = useRouter();

  return (
    <div className="container max-w-lg mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. No charges have been made.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-4">
          <Button onClick={() => router.push('/booking')}>
            Try Again
          </Button>
          <Button variant="outline" onClick={() => router.push('/jobs')}>
            View Jobs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
