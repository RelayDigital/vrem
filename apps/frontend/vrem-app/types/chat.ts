export type ProjectChatChannel = 'TEAM' | 'CUSTOMER';

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
}

export interface ChatThread {
  id: string;
  jobId: string;
  messages: ChatMessage[];
  channel: ProjectChatChannel;
}
