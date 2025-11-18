export interface ChatMessage {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  threadId?: string; // For threaded replies
  mentions?: string[]; // User IDs mentioned in the message
  chatType: 'client' | 'team'; // Which chat this message belongs to
}

export interface ChatThread {
  id: string;
  jobId: string;
  messages: ChatMessage[];
  chatType: 'client' | 'team';
}

