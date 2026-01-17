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
import { notificationSocket, NotificationPayload } from "@/lib/notification-socket";

// Poll interval: 60 seconds when visible (fallback when WebSocket disconnected)
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
  const { user, isLoading: authLoading, token } = useAuth();
  const isAuthenticated = !!user;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

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

  // Convert WebSocket notification payload to NotificationItem
  const mapNotificationPayload = useCallback((payload: NotificationPayload): NotificationItem => {
    const payloadData = payload.payload || {};
    return {
      id: payload.id,
      type: payload.type as NotificationItem["type"],
      orgId: payload.orgId || "",
      orgName: payloadData.organizationName || "",
      orgType: payloadData.orgType || "COMPANY", // Default to COMPANY if not provided
      createdAt: new Date(payload.createdAt),
      readAt: undefined,
      projectId: payload.projectId,
      projectAddress: payloadData.address,
      assignedRole: payloadData.role,
      messagePreview: payloadData.preview,
      messageChannel: payloadData.channel,
      approverName: payloadData.approverName,
      deliveryToken: payloadData.deliveryToken,
    };
  }, []);

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) return;

    // Handle incoming real-time notifications
    const handleNotification = (payload: NotificationPayload) => {
      const notification = mapNotificationPayload(payload);
      setNotifications((prev) => {
        // Check if notification already exists (deduplication)
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        // Add to the beginning of the list
        return [notification, ...prev];
      });
    };

    // Handle connection state changes
    const handleConnectionChange = (connected: boolean) => {
      setIsWebSocketConnected(connected);
      if (!connected) {
        // WebSocket disconnected - ensure polling is running as fallback
        startPolling();
      } else {
        // WebSocket connected - reduce polling frequency (keep as backup)
        // We still poll occasionally to catch any missed notifications
        stopPolling();
      }
    };

    // Set up WebSocket handlers
    notificationSocket.onNotification(handleNotification);
    notificationSocket.onConnectionChange(handleConnectionChange);

    // Connect to WebSocket
    notificationSocket.connect(token);

    return () => {
      notificationSocket.offNotification(handleNotification);
      notificationSocket.offConnectionChange(handleConnectionChange);
      notificationSocket.disconnect();
    };
  }, [isAuthenticated, authLoading, token, mapNotificationPayload, startPolling, stopPolling]);

  // Initial fetch and polling setup (polling as fallback)
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      fetchNotifications(true); // Force initial fetch
      // Only start polling if WebSocket is not connected
      if (!isWebSocketConnected) {
        startPolling();
      }
    } else {
      setNotifications([]);
      stopPolling();
      notificationSocket.disconnect();
    }

    return () => {
      stopPolling();
    };
  }, [isAuthenticated, authLoading, fetchNotifications, startPolling, stopPolling, isWebSocketConnected]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      notificationSocket.disconnect();
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
