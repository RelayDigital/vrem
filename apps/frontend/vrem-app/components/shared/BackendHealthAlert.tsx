'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBackendHealth } from '@/context/BackendHealthContext';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackendHealthAlert() {
  const { issues, clearIssue, clearAllIssues, hasPersistentIssues } = useBackendHealth();

  if (!hasPersistentIssues) {
    return null;
  }

  // Group issues by type
  const apiIssues = issues.filter((issue) => issue.type === 'api');
  const websocketIssues = issues.filter((issue) => issue.type === 'websocket');

  const issueDetails: string[] = [];
  
  if (apiIssues.length > 0) {
    const uniqueApiMessages = Array.from(new Set(apiIssues.map((issue) => issue.message)));
    issueDetails.push(...uniqueApiMessages.map((msg) => `API: ${msg}`));
  }
  
  if (websocketIssues.length > 0) {
    const uniqueWsMessages = Array.from(new Set(websocketIssues.map((issue) => issue.message)));
    issueDetails.push(...uniqueWsMessages.map((msg) => `WebSocket: ${msg}`));
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-5">
      <Alert variant="destructive" className="h-full">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Backend Connection Issues</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={clearAllIssues}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2 max-w-[80ch]">
            {issueDetails.map((detail, index) => (
              <li key={index} className="text-sm">
                {detail}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

