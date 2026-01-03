"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { NotificationItem } from "@/types";
import { useAuth } from "./auth-context";

// Poll interval: 60 seconds when visible, stop when hidden
const POLL_INTERVAL_MS = 60000;
// Minimum time between fetches to prevent spam
const MIN_FETCH_INTERVAL_MS = 5000;

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  acceptInvitation: (notificationId: string, invitationId: string) => Promise<void>;
  declineInvitation: (notificationId: string, invitationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track last fetch time to prevent spam
  const lastFetchTimeRef = useRef<number>(0);
  // Track if a fetch is in progress
  const fetchingRef = useRef(false);
  // Interval ID for polling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track tab visibility
  const isVisibleRef = useRef(true);

  const fetchNotifications = useCallback(async (force = false) => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    // Don't fetch if already fetching
    if (fetchingRef.current) {
      return;
    }

    // Don't fetch if we fetched recently (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL_MS) {
      return;
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.notifications.list();
      setNotifications(data);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch notifications"));
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  // Start/stop polling based on visibility
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      return; // Already polling
    }

    pollIntervalRef.current = setInterval(() => {
      if (isVisibleRef.current && isAuthenticated) {
        fetchNotifications();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchNotifications, isAuthenticated]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      isVisibleRef.current = isVisible;

      if (isVisible && isAuthenticated) {
        // Refetch when tab becomes visible (if enough time has passed)
        fetchNotifications();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, startPolling, stopPolling, isAuthenticated]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      fetchNotifications(true); // Force initial fetch
      startPolling();
    } else {
      setNotifications([]);
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isAuthenticated, authLoading, fetchNotifications, startPolling, stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.notifications.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date() } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date() }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, []);

  const acceptInvitation = useCallback(async (notificationId: string, invitationId: string) => {
    try {
      await api.invitations.accept(invitationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      throw err;
    }
  }, []);

  const declineInvitation = useCallback(async (notificationId: string, invitationId: string) => {
    try {
      await api.invitations.decline(invitationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to decline invitation:", err);
      throw err;
    }
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.readAt).length;
  }, [notifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      refetch: () => fetchNotifications(true),
      markAsRead,
      markAllAsRead,
      acceptInvitation,
      declineInvitation,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      error,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      acceptInvitation,
      declineInvitation,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
