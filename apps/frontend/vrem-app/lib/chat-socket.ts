import { io, Socket } from 'socket.io-client';
import {
  ChatMessage,
  ProjectChatChannel,
  TypingEvent,
  PresenceUpdate,
  PresenceList,
  MessagesReadEvent,
} from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type MessageHandler = (message: ChatMessage) => void;
type TypingHandler = (event: TypingEvent) => void;
type PresenceUpdateHandler = (event: PresenceUpdate) => void;
type PresenceListHandler = (event: PresenceList) => void;
type MessagesReadHandler = (event: MessagesReadEvent) => void;

class ChatSocket {
  private socket: Socket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private typingHandlers = new Set<TypingHandler>();
  private presenceUpdateHandlers = new Set<PresenceUpdateHandler>();
  private presenceListHandlers = new Set<PresenceListHandler>();
  private messagesReadHandlers = new Set<MessagesReadHandler>();
  private typingDebounceTimers = new Map<string, NodeJS.Timeout>();
  private typingState = new Map<string, boolean>(); // Track current typing state per room

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

    // Typing indicator events
    this.socket.on('userTyping', (event: TypingEvent) => {
      this.typingHandlers.forEach((handler) => handler(event));
    });

    // Presence events
    this.socket.on('presenceUpdate', (event: PresenceUpdate) => {
      this.presenceUpdateHandlers.forEach((handler) => handler(event));
    });

    this.socket.on('presenceList', (event: PresenceList) => {
      this.presenceListHandlers.forEach((handler) => handler(event));
    });

    // Read receipt events
    this.socket.on('messagesRead', (event: MessagesReadEvent) => {
      this.messagesReadHandlers.forEach((handler) => handler(event));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    // Clear all typing timers
    this.typingDebounceTimers.forEach((timer) => clearTimeout(timer));
    this.typingDebounceTimers.clear();
    this.typingState.clear();
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

  async sendMessage(
    projectId: string,
    content: string,
    channel: 'TEAM' | 'CUSTOMER' = 'TEAM',
    thread?: string | null,
  ): Promise<ChatMessage> {
    if (!this.socket) this.connect();
    return new Promise((resolve, reject) => {
      this.socket?.emit('sendMessage', { projectId, content, channel, thread }, (resp: any) => {
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

  // Typing indicator methods
  emitTyping(projectId: string, channel: ProjectChatChannel, isTyping: boolean) {
    const roomKey = `${projectId}:${channel}`;
    const currentState = this.typingState.get(roomKey);

    // Clear existing timer for this room
    const existingTimer = this.typingDebounceTimers.get(roomKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.typingDebounceTimers.delete(roomKey);
    }

    // If starting to type
    if (isTyping) {
      // Only emit if not already typing
      if (!currentState) {
        this.typingState.set(roomKey, true);
        this.socket?.emit('typing', { projectId, channel, isTyping: true });
      }

      // Set auto-stop timer (2 seconds after last keystroke)
      const timer = setTimeout(() => {
        this.typingState.set(roomKey, false);
        this.socket?.emit('typing', { projectId, channel, isTyping: false });
        this.typingDebounceTimers.delete(roomKey);
      }, 2000);
      this.typingDebounceTimers.set(roomKey, timer);
    } else {
      // Explicitly stop typing
      if (currentState) {
        this.typingState.set(roomKey, false);
        this.socket?.emit('typing', { projectId, channel, isTyping: false });
      }
    }
  }

  stopTyping(projectId: string, channel: ProjectChatChannel) {
    this.emitTyping(projectId, channel, false);
  }

  onTyping(handler: TypingHandler) {
    this.typingHandlers.add(handler);
  }

  offTyping(handler: TypingHandler) {
    this.typingHandlers.delete(handler);
  }

  // Presence methods
  onPresenceUpdate(handler: PresenceUpdateHandler) {
    this.presenceUpdateHandlers.add(handler);
  }

  offPresenceUpdate(handler: PresenceUpdateHandler) {
    this.presenceUpdateHandlers.delete(handler);
  }

  onPresenceList(handler: PresenceListHandler) {
    this.presenceListHandlers.add(handler);
  }

  offPresenceList(handler: PresenceListHandler) {
    this.presenceListHandlers.delete(handler);
  }

  // Read receipt methods
  async markMessagesRead(
    projectId: string,
    messageIds: string[],
    channel: ProjectChatChannel,
  ): Promise<{ success: boolean; markedCount: number }> {
    if (!this.socket) this.connect();
    return new Promise((resolve, reject) => {
      this.socket?.emit(
        'markRead',
        { messageIds, projectId, channel },
        (resp: any) => {
          if (resp?.error) {
            reject(new Error(resp.error));
          } else {
            resolve({ success: resp.success, markedCount: resp.markedCount });
          }
        },
      );
    });
  }

  onMessagesRead(handler: MessagesReadHandler) {
    this.messagesReadHandlers.add(handler);
  }

  offMessagesRead(handler: MessagesReadHandler) {
    this.messagesReadHandlers.delete(handler);
  }

  private mapIncomingMessage(msg: any): ChatMessage | null {
    if (!msg) return null;
    const channel =
      (msg.channel as 'TEAM' | 'CUSTOMER') ||
      (msg.user?.accountType === 'AGENT' ||
      msg.user?.account_type === 'AGENT'
        ? 'CUSTOMER'
        : 'TEAM');
    return {
      id: msg.id,
      jobId: msg.projectId,
      userId: msg.userId,
      userName: msg.user?.name || 'Unknown User',
      userAvatar: msg.user?.avatar,
      content: msg.content,
      createdAt: new Date(msg.timestamp || msg.createdAt || new Date()),
      channel,
      thread: msg.thread ?? null,
      threadId: msg.thread ?? null,
      chatType: channel === 'CUSTOMER' ? 'client' : 'team',
    };
  }
}

export const chatSocket = new ChatSocket();
