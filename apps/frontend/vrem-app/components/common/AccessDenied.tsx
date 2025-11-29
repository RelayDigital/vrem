'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  redirectTo?: string;
  redirectLabel?: string;
}

export function AccessDenied({
  title = 'Access Denied',
  description = 'You do not have permission to access this page. Please contact your administrator.',
  redirectTo = '/dashboard',
  redirectLabel = 'Go to Dashboard',
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="size-full overflow-x-hidden flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => router.push(redirectTo)}
            className="w-full"
          >
            {redirectLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

