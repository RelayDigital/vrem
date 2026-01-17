'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface BackendIssue {
  id: string;
  type: 'api' | 'websocket';
  message: string;
  timestamp: Date;
}

interface BackendHealthContextType {
  issues: BackendIssue[];
  addIssue: (type: 'api' | 'websocket', message: string) => void;
  clearIssue: (id: string) => void;
  clearAllIssues: () => void;
  hasPersistentIssues: boolean;
}

const BackendHealthContext = createContext<BackendHealthContextType | undefined>(undefined);

export function BackendHealthProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<BackendIssue[]>([]);
  const [issueCounts, setIssueCounts] = useState<Map<string, number>>(new Map());
  const [lastSuccessTime, setLastSuccessTime] = useState<Map<string, Date>>(new Map());

  // Consider an issue "persistent" if it occurs 3+ times within 30 seconds
  const PERSISTENCE_THRESHOLD = 3;
  const PERSISTENCE_WINDOW = 30000; // 30 seconds

  const addIssue = useCallback((type: 'api' | 'websocket', message: string) => {
    const now = new Date();
    const issueKey = `${type}:${message}`;
    
    setIssueCounts((prev) => {
      const count = (prev.get(issueKey) || 0) + 1;
      const newCounts = new Map(prev);
      newCounts.set(issueKey, count);
      
      // Only add to issues list if it's persistent
      if (count >= PERSISTENCE_THRESHOLD) {
        setIssues((prev) => {
          // Check if this issue already exists
          const existing = prev.find((issue) => issue.type === type && issue.message === message);
          if (existing) {
            // Update timestamp
            return prev.map((issue) =>
              issue.id === existing.id ? { ...issue, timestamp: now } : issue
            );
          }
          
          // Add new issue
          return [
            ...prev,
            {
              id: `${type}-${Date.now()}-${Math.random()}`,
              type,
              message,
              timestamp: now,
            },
          ];
        });
      }
      
      return newCounts;
    });

    // Reset count after window expires
    setTimeout(() => {
      setIssueCounts((prev) => {
        const newCounts = new Map(prev);
        newCounts.delete(issueKey);
        return newCounts;
      });
    }, PERSISTENCE_WINDOW);
  }, []);

  const clearIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== id));
  }, []);

  const clearAllIssues = useCallback(() => {
    setIssues([]);
    setIssueCounts(new Map());
  }, []);

  // Listen to backend health events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleApiError = (event: CustomEvent<{ message: string }>) => {
      addIssue('api', event.detail.message);
    };

    const handleApiSuccess = () => {
      const now = new Date();
      setLastSuccessTime((prev) => {
        const newMap = new Map(prev);
        newMap.set('api', now);
        return newMap;
      });
      
      // Clear API issues after successful calls
      setIssues((prev) => prev.filter((issue) => issue.type !== 'api'));
    };

    const handleWebSocketError = (event: CustomEvent<{ message: string }>) => {
      addIssue('websocket', event.detail.message);
    };

    const handleWebSocketSuccess = () => {
      const now = new Date();
      setLastSuccessTime((prev) => {
        const newMap = new Map(prev);
        newMap.set('websocket', now);
        return newMap;
      });
      
      // Clear websocket issues after successful connection
      setIssues((prev) => prev.filter((issue) => issue.type !== 'websocket'));
    };

    window.addEventListener('backend-api-error', handleApiError as EventListener);
    window.addEventListener('backend-api-success', handleApiSuccess);
    window.addEventListener('backend-websocket-error', handleWebSocketError as EventListener);
    window.addEventListener('backend-websocket-success', handleWebSocketSuccess);

    return () => {
      window.removeEventListener('backend-api-error', handleApiError as EventListener);
      window.removeEventListener('backend-api-success', handleApiSuccess);
      window.removeEventListener('backend-websocket-error', handleWebSocketError as EventListener);
      window.removeEventListener('backend-websocket-success', handleWebSocketSuccess);
    };
  }, [addIssue]);

  const hasPersistentIssues = issues.length > 0;

  return (
    <BackendHealthContext.Provider
      value={{
        issues,
        addIssue,
        clearIssue,
        clearAllIssues,
        hasPersistentIssues,
      }}
    >
      {children}
    </BackendHealthContext.Provider>
  );
}

export function useBackendHealth() {
  const context = useContext(BackendHealthContext);
  if (context === undefined) {
    throw new Error('useBackendHealth must be used within a BackendHealthProvider');
  }
  return context;
}

