import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type MessageHandler = (message: ChatMessage) => void;

class ChatSocket {
  private socket: Socket | null = null;
  private messageHandlers = new Set<MessageHandler>();

  connect(token?: string) {
    if (this.socket && this.socket.connected) return;
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined);

    this.socket = io(`${API_URL}/chat`, {
      autoConnect: true,
      transports: ['websocket'],
      auth: { token: authToken },
    });

    this.socket.on('connect_error', (error) => {
      // Track websocket connection errors
      if (typeof window !== 'undefined') {
        const errorMessage = error.message || 'WebSocket connection failed';
        window.dispatchEvent(new CustomEvent('backend-websocket-error', {
          detail: { message: `WebSocket: ${errorMessage}` }
        }));
      }
    });

    this.socket.on('connect', () => {
      // Track successful websocket connections
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backend-websocket-success'));
      }
    });

    this.socket.on('disconnect', (reason) => {
      // Track websocket disconnections (especially unexpected ones)
      if (typeof window !== 'undefined' && reason !== 'io client disconnect') {
        window.dispatchEvent(new CustomEvent('backend-websocket-error', {
          detail: { message: `WebSocket disconnected: ${reason}` }
        }));
      }
    });

    this.socket.on('messageCreated', (msg: any) => {
      const mapped = this.mapIncomingMessage(msg);
      if (!mapped) return;
      this.messageHandlers.forEach((handler) => handler(mapped));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  async joinProject(projectId: string) {
    if (!this.socket) this.connect();
    return new Promise<void>((resolve, reject) => {
      this.socket?.emit('joinProject', { projectId }, (resp: any) => {
        if (resp?.error) {
          reject(new Error(resp.error));
        } else {
          resolve();
        }
      });
    });
  }

  async sendMessage(projectId: string, content: string): Promise<ChatMessage> {
    if (!this.socket) this.connect();
    return new Promise((resolve, reject) => {
      this.socket?.emit('sendMessage', { projectId, content }, (resp: any) => {
        if (resp?.error) {
          reject(new Error(resp.error));
        } else {
          const mapped = this.mapIncomingMessage(resp);
          if (!mapped) {
            reject(new Error('Malformed message payload'));
          } else {
            resolve(mapped);
          }
        }
      });
    });
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: MessageHandler) {
    this.messageHandlers.delete(handler);
  }

  private mapIncomingMessage(msg: any): ChatMessage | null {
    if (!msg) return null;
    return {
      id: msg.id,
      jobId: msg.projectId,
      userId: msg.userId,
      userName: msg.user?.name || 'Unknown User',
      userAvatar: msg.user?.avatar,
      content: msg.content,
      createdAt: new Date(msg.timestamp || msg.createdAt || new Date()),
      chatType: 'team',
    };
  }
}

export const chatSocket = new ChatSocket();
