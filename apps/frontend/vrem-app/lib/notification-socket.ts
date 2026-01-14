import { io, Socket } from 'socket.io-client';
import { NotificationItem } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface NotificationPayload {
  id: string;
  type: string;
  userId: string;
  orgId?: string;
  projectId?: string;
  title?: string;
  body?: string;
  payload?: Record<string, any>;
  createdAt: string;
}

export interface CountUpdatePayload {
  count: number;
}

type NotificationHandler = (notification: NotificationPayload) => void;
type CountUpdateHandler = (payload: CountUpdatePayload) => void;
type ConnectionHandler = (connected: boolean) => void;

class NotificationSocket {
  private socket: Socket | null = null;
  private notificationHandlers = new Set<NotificationHandler>();
  private countUpdateHandlers = new Set<CountUpdateHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  connect(token?: string) {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return;
    }

    this.isConnecting = true;
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined);

    if (!authToken) {
      this.isConnecting = false;
      return;
    }

    this.socket = io(`${API_URL}/notifications`, {
      autoConnect: true,
      transports: ['websocket'],
      auth: { token: authToken },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.connectionHandlers.forEach((handler) => handler(true));
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
      console.error('[NotificationSocket] Connection error:', error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('[NotificationSocket] Max reconnect attempts reached, falling back to polling');
        this.connectionHandlers.forEach((handler) => handler(false));
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionHandlers.forEach((handler) => handler(false));

      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Intentional disconnect, don't reconnect
        return;
      }
    });

    this.socket.on('connected', (data: { userId: string }) => {
      console.debug('[NotificationSocket] Connected for user:', data.userId);
    });

    this.socket.on('notification', (notification: NotificationPayload) => {
      this.notificationHandlers.forEach((handler) => handler(notification));
    });

    this.socket.on('countUpdate', (payload: CountUpdatePayload) => {
      this.countUpdateHandlers.forEach((handler) => handler(payload));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  onNotification(handler: NotificationHandler) {
    this.notificationHandlers.add(handler);
  }

  offNotification(handler: NotificationHandler) {
    this.notificationHandlers.delete(handler);
  }

  onCountUpdate(handler: CountUpdateHandler) {
    this.countUpdateHandlers.add(handler);
  }

  offCountUpdate(handler: CountUpdateHandler) {
    this.countUpdateHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
  }

  offConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.delete(handler);
  }
}

export const notificationSocket = new NotificationSocket();
