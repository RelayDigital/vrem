export type ProjectChatChannel = 'TEAM' | 'CUSTOMER';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ReadReceipt {
  userId: string;
  userName: string;
  readAt: Date;
}

export interface ChatMessage {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  threadId?: string; // For threaded replies
  thread?: string | null;
  mentions?: string[]; // User IDs mentioned in the message
  channel: ProjectChatChannel;
  chatType?: 'client' | 'team'; // Deprecated; use channel instead
  status?: MessageStatus;
  readReceipts?: ReadReceipt[];
}

export interface ChatThread {
  id: string;
  jobId: string;
  messages: ChatMessage[];
  channel: ProjectChatChannel;
}

// Typing indicator types
export interface TypingUser {
  userId: string;
  userName: string;
}

export interface TypingEvent {
  projectId: string;
  channel: ProjectChatChannel;
  userId: string;
  userName: string;
  isTyping: boolean;
}

// Presence types
export interface PresenceUser {
  userId: string;
  userName: string;
  isOnline: boolean;
}

export interface PresenceUpdate {
  userId: string;
  userName: string;
  isOnline: boolean;
  projectId?: string;
}

export interface PresenceList {
  projectId: string;
  users: PresenceUser[];
}

// Read receipt event types
export interface MessagesReadEvent {
  messageIds: string[];
  readBy: {
    userId: string;
    userName: string;
  };
  readAt: string;
}
