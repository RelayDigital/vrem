'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import {
  ChatMessage,
  ProjectChatChannel,
  TypingUser,
  TypingEvent,
  PresenceUser,
  PresenceUpdate,
  PresenceList,
  ReadReceipt,
  MessagesReadEvent,
} from '@/types/chat';
import { api } from '@/lib/api';
import { chatSocket } from '@/lib/chat-socket';
import { toast } from 'sonner';

interface MessagingContextType {
  // Message state
  messages: ChatMessage[];
  getMessagesForJob: (jobId: string) => ChatMessage[];
  fetchMessages: (jobId: string, channel?: 'TEAM' | 'CUSTOMER', orgId?: string) => Promise<void>;
  isLoadingMessages: (jobId: string) => boolean;

  // Message handlers
  sendMessage: (
    jobId: string,
    content: string,
    channel: 'TEAM' | 'CUSTOMER',
    threadId?: string
  ) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;

  // Typing indicators
  getTypingUsers: (projectId: string, channel: ProjectChatChannel) => TypingUser[];
  emitTyping: (projectId: string, channel: ProjectChatChannel) => void;
  stopTyping: (projectId: string, channel: ProjectChatChannel) => void;

  // Presence
  getOnlineUsers: (projectId: string) => PresenceUser[];
  isUserOnline: (projectId: string, userId: string) => boolean;

  // Read receipts
  getMessageReadReceipts: (messageId: string) => ReadReceipt[];
  markMessagesAsRead: (projectId: string, messageIds: string[], channel: ProjectChatChannel) => void;

  // User info (for message creation)
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  setUserInfo: (userId: string, userName: string, userAvatar?: string) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({
  children,
  defaultUserId,
  defaultUserName,
  defaultUserAvatar,
}: {
  children: ReactNode;
  defaultUserId?: string;
  defaultUserName?: string;
  defaultUserAvatar?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(defaultUserId);
  const [currentUserName, setCurrentUserName] = useState<string | undefined>(defaultUserName);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(defaultUserAvatar);
  const [connected, setConnected] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState<Set<string>>(new Set());
  const lastFetchRef = useRef<Map<string, number>>(new Map());
  const inFlightFetchRef = useRef<Set<string>>(new Set());

  // Typing state: Map<`${projectId}:${channel}`, Map<userId, TypingUser>>
  const [typingState, setTypingState] = useState<Map<string, Map<string, TypingUser>>>(new Map());

  // Presence state: Map<projectId, Map<userId, PresenceUser>>
  const [presenceState, setPresenceState] = useState<Map<string, Map<string, PresenceUser>>>(new Map());

  // Read receipts: Map<messageId, ReadReceipt[]>
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(new Map());

  // Establish socket connection on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    chatSocket.connect();
    setConnected(true);
    return () => {
      chatSocket.disconnect();
      setConnected(false);
    };
  }, []);

  // Subscribe to incoming messages
  useEffect(() => {
    const handler = (incoming: ChatMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === incoming.id);
        return exists ? prev : [...prev, incoming];
      });
    };
    chatSocket.onMessage(handler);
    return () => chatSocket.offMessage(handler);
  }, []);

  // Subscribe to typing events
  useEffect(() => {
    const handler = (event: TypingEvent) => {
      // Don't show our own typing indicator
      if (event.userId === currentUserId) return;

      const roomKey = `${event.projectId}:${event.channel}`;
      setTypingState((prev) => {
        const newState = new Map(prev);
        const roomTyping = new Map(newState.get(roomKey) || new Map());

        if (event.isTyping) {
          roomTyping.set(event.userId, {
            userId: event.userId,
            userName: event.userName,
          });
        } else {
          roomTyping.delete(event.userId);
        }

        if (roomTyping.size > 0) {
          newState.set(roomKey, roomTyping);
        } else {
          newState.delete(roomKey);
        }
        return newState;
      });
    };
    chatSocket.onTyping(handler);
    return () => chatSocket.offTyping(handler);
  }, [currentUserId]);

  // Subscribe to presence updates
  useEffect(() => {
    const updateHandler = (event: PresenceUpdate) => {
      if (!event.projectId) return;

      setPresenceState((prev) => {
        const newState = new Map(prev);
        const projectPresence = new Map(newState.get(event.projectId!) || new Map());

        if (event.isOnline) {
          projectPresence.set(event.userId, {
            userId: event.userId,
            userName: event.userName,
            isOnline: true,
          });
        } else {
          projectPresence.delete(event.userId);
        }

        newState.set(event.projectId!, projectPresence);
        return newState;
      });
    };

    const listHandler = (event: PresenceList) => {
      setPresenceState((prev) => {
        const newState = new Map(prev);
        const projectPresence = new Map<string, PresenceUser>();

        for (const user of event.users) {
          projectPresence.set(user.userId, user);
        }

        newState.set(event.projectId, projectPresence);
        return newState;
      });
    };

    chatSocket.onPresenceUpdate(updateHandler);
    chatSocket.onPresenceList(listHandler);
    return () => {
      chatSocket.offPresenceUpdate(updateHandler);
      chatSocket.offPresenceList(listHandler);
    };
  }, []);

  // Subscribe to read receipt events
  useEffect(() => {
    const handler = (event: MessagesReadEvent) => {
      setReadReceipts((prev) => {
        const newState = new Map(prev);

        for (const messageId of event.messageIds) {
          const existing = newState.get(messageId) || [];
          // Check if this user already has a receipt for this message
          const hasReceipt = existing.some((r) => r.userId === event.readBy.userId);
          if (!hasReceipt) {
            newState.set(messageId, [
              ...existing,
              {
                userId: event.readBy.userId,
                userName: event.readBy.userName,
                readAt: new Date(event.readAt),
              },
            ]);
          }
        }

        return newState;
      });
    };
    chatSocket.onMessagesRead(handler);
    return () => chatSocket.offMessagesRead(handler);
  }, []);

  const getMessagesForJob = useCallback((jobId: string): ChatMessage[] => {
    return messages.filter((msg) => msg.jobId === jobId);
  }, [messages]);

  const isLoadingMessages = useCallback((jobId: string): boolean => {
    return loadingJobs.has(jobId);
  }, [loadingJobs]);

  const fetchMessages = useCallback(async (jobId: string, channel: 'TEAM' | 'CUSTOMER' = 'TEAM', orgId?: string) => {
    const cacheKey = `${jobId}:${channel}`;
    const now = Date.now();
    const lastFetchedAt = lastFetchRef.current.get(cacheKey);
    if (lastFetchedAt && now - lastFetchedAt < 5000) {
      return;
    }
    if (inFlightFetchRef.current.has(cacheKey)) {
      return;
    }
    inFlightFetchRef.current.add(cacheKey);

    // Set loading state
    setLoadingJobs((prev) => new Set(prev).add(jobId));

    try {
      if (orgId) {
        api.organizations.setActiveOrganization(orgId);
      }
      const fetchedMessages = await api.chat.getMessages(jobId, channel);
      lastFetchRef.current.set(cacheKey, Date.now());
      // Convert date strings to Date objects if needed
      const processedMessages = fetchedMessages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        channel: msg.channel || channel,
        chatType: (msg.channel || channel) === 'CUSTOMER' ? 'client' : 'team',
      }));

      setMessages((prev) => {
        // Remove existing messages for this job+channel to avoid duplicates
        const otherMessages = prev.filter((msg) => !(msg.jobId === jobId && (msg as any).channel === channel));
        return [...otherMessages, ...processedMessages];
      });

      // Join project room for realtime updates
      if (connected) {
        chatSocket.joinProject(jobId, channel).catch(() => {
          // silently ignore join errors for now
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't show toast here to avoid spamming if called frequently
    } finally {
      inFlightFetchRef.current.delete(cacheKey);
      // Clear loading state
      setLoadingJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }, [connected]);

  const sendMessage = useCallback(async (
    jobId: string,
    content: string,
    channel: 'TEAM' | 'CUSTOMER',
    threadId?: string | null
  ) => {
    if (!currentUserId || !currentUserName) {
      console.warn('Cannot send message: user info not set');
      return;
    }

    try {
      let newMessage: ChatMessage | null = null;

      if (connected) {
        newMessage = await chatSocket.sendMessage(jobId, content, channel, threadId);
      } else {
        const response = await api.chat.sendMessage(jobId, content, channel, threadId);
        newMessage = {
          ...response,
          jobId,
          userId: currentUserId,
          userName: currentUserName,
          userAvatar: currentUserAvatar,
          content,
          channel,
          chatType: channel === 'CUSTOMER' ? 'client' : 'team',
          thread: threadId || null,
          threadId: threadId || undefined,
          createdAt: new Date(response.createdAt || new Date()),
        };
      }

      if (newMessage) {
        setMessages((prev) => [...prev, newMessage!]);
        window.dispatchEvent(new CustomEvent('messageCreated', { detail: newMessage }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  }, [connected, currentUserId, currentUserName, currentUserAvatar]);

  const editMessage = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content } : msg))
    );

    // Update in localStorage
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      const allMessages: ChatMessage[] = JSON.parse(storedMessages);
      const updatedMessages = allMessages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      );
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('messageUpdated', {
      detail: { messageId, content }
    }));
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    // Update in localStorage
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      const allMessages: ChatMessage[] = JSON.parse(storedMessages);
      const updatedMessages = allMessages.filter((msg) => msg.id !== messageId);
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
    }

    try {
      await api.messages.delete(messageId);
    } catch (error) {
      console.error('Failed to delete message on backend', error);
      // Keep UI state consistent; optionally refetch later
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('messageDeleted', {
      detail: { messageId }
    }));
  }, []);

  const setUserInfo = useCallback((
    userId: string,
    userName: string,
    userAvatar?: string
  ) => {
    setCurrentUserId(userId);
    setCurrentUserName(userName);
    setCurrentUserAvatar(userAvatar);
  }, []);

  // Typing indicator methods
  const getTypingUsers = useCallback(
    (projectId: string, channel: ProjectChatChannel): TypingUser[] => {
      const roomKey = `${projectId}:${channel}`;
      const roomTyping = typingState.get(roomKey);
      return roomTyping ? Array.from(roomTyping.values()) : [];
    },
    [typingState]
  );

  const emitTyping = useCallback(
    (projectId: string, channel: ProjectChatChannel) => {
      chatSocket.emitTyping(projectId, channel, true);
    },
    []
  );

  const stopTyping = useCallback(
    (projectId: string, channel: ProjectChatChannel) => {
      chatSocket.stopTyping(projectId, channel);
    },
    []
  );

  // Presence methods
  const getOnlineUsers = useCallback(
    (projectId: string): PresenceUser[] => {
      const projectPresence = presenceState.get(projectId);
      return projectPresence ? Array.from(projectPresence.values()) : [];
    },
    [presenceState]
  );

  const isUserOnline = useCallback(
    (projectId: string, userId: string): boolean => {
      const projectPresence = presenceState.get(projectId);
      return projectPresence?.has(userId) ?? false;
    },
    [presenceState]
  );

  // Read receipt methods
  const getMessageReadReceipts = useCallback(
    (messageId: string): ReadReceipt[] => {
      return readReceipts.get(messageId) || [];
    },
    [readReceipts]
  );

  const markMessagesAsRead = useCallback(
    (projectId: string, messageIds: string[], channel: ProjectChatChannel) => {
      if (!connected || messageIds.length === 0) return;
      chatSocket.markMessagesRead(projectId, messageIds, channel).catch((error) => {
        console.error('Failed to mark messages as read:', error);
      });
    },
    [connected]
  );

  return (
    <MessagingContext.Provider
      value={{
        messages,
        getMessagesForJob,
        fetchMessages,
        isLoadingMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        getTypingUsers,
        emitTyping,
        stopTyping,
        getOnlineUsers,
        isUserOnline,
        getMessageReadReceipts,
        markMessagesAsRead,
        currentUserId,
        currentUserName,
        currentUserAvatar,
        setUserInfo,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
